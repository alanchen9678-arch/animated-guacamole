import hashlib
import random
import re

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ai_engine.pipeline import moderate_peer_message
from app.models import (
    PEER_SUPPORT_CATEGORIES,
    PeerConnection,
    PeerConnectionEvent,
    PeerDM,
    PeerRoom,
    PeerRoomMembership,
    PeerRoomMessage,
    UserProfile,
)
from app.peer_rooms import (
    assign_peer_room,
    opt_out_to_waitlist,
    rejoin_peer_room,
    switch_peer_room,
    user_has_room_access,
)
from app.throttles import PeerMessageThrottle

PEER_GUIDELINES_VERSION = '2026-09-23'
PEER_MESSAGE_PAGE_SIZE = 50
WORD_A = ['Calm', 'Quiet', 'Gentle', 'Steady', 'Brave', 'Kind', 'Warm', 'Still', 'Soft', 'Clear', 'Bold', 'Light']
WORD_N = ['Maple', 'River', 'Stone', 'Dawn', 'Forest', 'Lake', 'Ember', 'Cloud', 'Tide', 'Ridge', 'Pine', 'Brook']
PEER_AVATAR_COLORS = (
    '#4d6b58',
    '#5f7774',
    '#506b82',
    '#687580',
    '#756675',
    '#806d5b',
    '#627967',
    '#536b5d',
)
PEER_AVATAR_SYMBOLS = (
    'peer-cove',
    'peer-tide',
    'peer-reed',
    'peer-pebble',
    'peer-beacon',
    'peer-shell',
    'peer-pine',
    'peer-north-star',
)
MOD_RULES = [
    {
        'terms': ['fuck you', 'kill yourself', 'kys', 'kms', 'kill myself', 'murder'],
        'patterns': [],
        'message': "This message was flagged for unsafe or abusive language and wasn't sent. Please keep interactions respectful and safe for everyone here.",
    },
    {
        'terms': ['idiot', 'stupid', 'loser', 'worthless', 'shut up', 'you suck', 'hate you', 'go away', 'moron', 'dumb', 'retard'],
        'patterns': [],
        'message': "This message was flagged for potential harassment and wasn't sent. Please keep interactions respectful. Everyone here is going through something difficult.",
    },
    {
        'terms': ['instagram', 'snapchat', 'whatsapp', 'telegram', 'discord', 'facebook', 'twitter', 'tiktok'],
        'patterns': [r'@\S+', r'\b\d{3}[.\-\s]?\d{3}[.\-\s]?\d{4}\b', r'\.com\b|\.net\b|\.org\b'],
        'message': "Sharing contact details, social handles, or links isn't allowed in anonymous chats. This keeps everyone safe. Your message was not sent.",
    },
    {
        'terms': ['cut yourself', 'self harm', 'self-harm', 'stop taking medication', 'stop your meds', 'dont take your meds', 'harm yourself', 'hurt yourself'],
        'patterns': [],
        'message': "This message was flagged for potentially harmful advice and wasn't sent. If you or someone else is struggling, please reach out to a licensed professional.",
    },
]
LEETSPEAK_MAP = str.maketrans({
    '0': 'o',
    '1': 'i',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '7': 't',
    '@': 'a',
    '$': 's',
})
AI_MODERATION_BLOCK_MESSAGE = (
    "This message was blocked by Dawn Harbor's safety system and wasn't sent. "
    "Please rephrase it in a way that feels safe and respectful for peer support."
)
AI_MODERATION_CRISIS_MESSAGE = (
    "This message wasn't sent because it may describe an immediate safety crisis. "
    "Please contact 988 right now by call or text for immediate support."
)
AI_MODERATION_UNAVAILABLE_MESSAGE = (
    "Peer chat moderation is temporarily unavailable. Please try again in a moment."
)


def _peer_identity_values(seed):
    digest = hashlib.sha256(str(seed).encode('utf-8')).digest()
    return (
        PEER_AVATAR_COLORS[digest[0] % len(PEER_AVATAR_COLORS)],
        PEER_AVATAR_SYMBOLS[digest[1] % len(PEER_AVATAR_SYMBOLS)],
    )


def _ensure_peer_identity(profile):
    fallback_color, fallback_symbol = _peer_identity_values(profile.peer_id)
    update_fields = []
    if not profile.peer_avatar_color:
        profile.peer_avatar_color = fallback_color
        update_fields.append('peer_avatar_color')
    if not profile.peer_avatar_symbol:
        profile.peer_avatar_symbol = fallback_symbol
        update_fields.append('peer_avatar_symbol')
    if update_fields:
        profile.save(update_fields=update_fields)
    return profile.peer_avatar_color, profile.peer_avatar_symbol


def _identity_for_name(name, profiles_by_name):
    profile = profiles_by_name.get(name)
    if profile:
        return _ensure_peer_identity(profile)
    return _peer_identity_values(name)


def _get_profile(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


def _get_peer_target(peer_id):
    return (
        UserProfile.objects
        .select_related('user')
        .filter(peer_id=peer_id, is_peer_onboarded=True)
        .exclude(anonymous_name='')
        .exclude(anonymous_name__isnull=True)
        .first()
    )


def _generate_anon_name():
    for _ in range(20):
        name = f"{random.choice(WORD_A)}{random.choice(WORD_N)}{10 + random.randint(0, 88)}"
        if not UserProfile.objects.filter(anonymous_name=name).exists():
            return name
    return f"User{random.randint(1000, 9999)}"


def _connection_status(user, other_id):
    conn = PeerConnection.objects.filter(
        Q(requester=user, recipient_id=other_id) |
        Q(requester_id=other_id, recipient=user)
    ).first()
    if not conn:
        return 'none', None
    return conn.status, conn.requester_id == user.id


def _moderation_error(content):
    lowered = content.lower()
    normalized = re.sub(r'[^a-z0-9]+', '', lowered.translate(LEETSPEAK_MAP))
    for rule in MOD_RULES:
        term_hit = any(
            term in lowered or re.sub(r'[^a-z0-9]+', '', term.lower().translate(LEETSPEAK_MAP)) in normalized
            for term in rule['terms']
        )
        pattern_hit = any(re.search(pattern, content, flags=re.IGNORECASE) for pattern in rule['patterns'])
        if term_hit or pattern_hit:
            return rule['message']
    return None


def _moderate_with_ai(content):
    result = moderate_peer_message(content)
    decision = result.get('decision')

    if decision == 'allow':
        return None
    if decision == 'crisis':
        return AI_MODERATION_CRISIS_MESSAGE
    return AI_MODERATION_BLOCK_MESSAGE


class PeerProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = _get_profile(request.user)
        avatar_color, avatar_symbol = _ensure_peer_identity(profile)
        return Response({
            'anonymousName': profile.anonymous_name or '',
            'isOnboarded': profile.is_peer_onboarded,
            'avatarColor': avatar_color,
            'avatarSymbol': avatar_symbol,
            'peerSupportCategory': profile.peer_support_category,
        })

    def post(self, request):
        profile = _get_profile(request.user)
        if (
            request.data.get('guidelinesAccepted') is not True
            or request.data.get('guidelinesVersion') != PEER_GUIDELINES_VERSION
        ):
            return Response(
                {'error': 'Accept the current community guidelines before continuing.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not profile.anonymous_name:
            profile.anonymous_name = _generate_anon_name()
        profile.is_peer_onboarded = True
        profile.peer_guidelines_version = PEER_GUIDELINES_VERSION
        profile.peer_guidelines_accepted_at = timezone.now()
        profile.save(update_fields=[
            'anonymous_name',
            'is_peer_onboarded',
            'peer_guidelines_version',
            'peer_guidelines_accepted_at',
        ])
        avatar_color, avatar_symbol = _ensure_peer_identity(profile)
        room_state = assign_peer_room(request.user)
        return Response({
            'anonymousName': profile.anonymous_name,
            'isOnboarded': profile.is_peer_onboarded,
            'avatarColor': avatar_color,
            'avatarSymbol': avatar_symbol,
            'peerSupportCategory': room_state.get('category', ''),
            'roomState': room_state,
        })


class PeerRoomListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _get_profile(request.user).is_peer_onboarded:
            return Response({'error': 'Complete peer onboarding first.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(assign_peer_room(request.user))


class PeerRoomSwitchView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = _get_profile(request.user)
        if not profile.is_peer_onboarded:
            return Response({'error': 'Complete peer onboarding first.'}, status=status.HTTP_403_FORBIDDEN)
        if not PeerRoomMembership.objects.filter(
            user=request.user,
            status=PeerRoomMembership.Status.ACTIVE,
        ).exists():
            return Response({'error': 'You do not have an active room to switch.'}, status=status.HTTP_400_BAD_REQUEST)
        state, switched = switch_peer_room(request.user)
        if not switched:
            return Response(
                {
                    'error': 'The other support rooms are currently full. You are still in your current room.',
                    'state': state,
                },
                status=status.HTTP_409_CONFLICT,
            )
        return Response(state)


class PeerRoomOptOutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = _get_profile(request.user)
        if not profile.is_peer_onboarded:
            return Response({'error': 'Complete peer onboarding first.'}, status=status.HTTP_403_FORBIDDEN)
        if not PeerRoomMembership.objects.filter(
            user=request.user,
            status=PeerRoomMembership.Status.ACTIVE,
        ).exists():
            return Response({'error': 'You do not have an active room to leave.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(opt_out_to_waitlist(request.user))


class PeerRoomRejoinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = _get_profile(request.user)
        if not profile.is_peer_onboarded:
            return Response({'error': 'Complete peer onboarding first.'}, status=status.HTTP_403_FORBIDDEN)

        state, rejoined = rejoin_peer_room(request.user)
        if state['status'] == 'assigned':
            return Response(state)
        if state['status'] == 'not_waitlisted':
            return Response({'error': 'You are not currently on the room waitlist.'}, status=status.HTTP_400_BAD_REQUEST)
        if not rejoined:
            return Response(
                {
                    'error': f"All current {state['categoryLabel']} support rooms are full. You are still on the waitlist.",
                    'state': state,
                },
                status=status.HTTP_409_CONFLICT,
            )
        return Response(state)


class PeerRoomMessageView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [PeerMessageThrottle]
    throttle_scope = 'peer_messages'

    def get(self, request, room_id):
        if not _get_profile(request.user).is_peer_onboarded:
            return Response({'error': 'Complete peer onboarding first.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            room = PeerRoom.objects.get(id=room_id, is_active=True)
        except PeerRoom.DoesNotExist:
            return Response({'error': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not user_has_room_access(request.user, room.id):
            return Response({'error': 'You are not assigned to this room.'}, status=status.HTTP_403_FORBIDDEN)

        since_id = request.query_params.get('since')
        before_id = request.query_params.get('before')
        qs = room.room_messages.all()
        if since_id:
            try:
                qs = qs.filter(id__gt=int(since_id))
            except ValueError:
                pass
            messages = list(qs.order_by('created_at', 'id')[:PEER_MESSAGE_PAGE_SIZE])
        else:
            if before_id:
                try:
                    qs = qs.filter(id__lt=int(before_id))
                except ValueError:
                    pass
            messages = list(qs.order_by('-created_at', '-id')[:PEER_MESSAGE_PAGE_SIZE])
            messages.reverse()
        names = {message.anonymous_name for message in messages}
        profiles_by_name = {
            profile.anonymous_name: profile
            for profile in UserProfile.objects.filter(anonymous_name__in=names)
        }

        response_messages = []
        for message in messages:
            avatar_color, avatar_symbol = _identity_for_name(message.anonymous_name, profiles_by_name)
            response_messages.append({
                'id': message.id,
                'user': message.anonymous_name,
                'color': avatar_color,
                'avatarSymbol': avatar_symbol,
                'text': message.content,
                'self': message.sender_id == request.user.id,
                'timestamp': message.created_at.isoformat(),
            })
        return Response(response_messages)

    def post(self, request, room_id):
        profile = _get_profile(request.user)
        if not profile.is_peer_onboarded or not profile.anonymous_name:
            return Response({'error': 'Complete peer onboarding first.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            room = PeerRoom.objects.get(id=room_id, is_active=True)
        except PeerRoom.DoesNotExist:
            return Response({'error': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not user_has_room_access(request.user, room.id):
            return Response({'error': 'You are not assigned to this room.'}, status=status.HTTP_403_FORBIDDEN)

        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'Message cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(content) > 2000:
            return Response({'error': 'Message too long.'}, status=status.HTTP_400_BAD_REQUEST)
        moderation_error = _moderation_error(content)
        if moderation_error:
            return Response({'error': moderation_error}, status=status.HTTP_400_BAD_REQUEST)
        try:
            moderation_error = _moderate_with_ai(content)
        except Exception:
            return Response({'error': AI_MODERATION_UNAVAILABLE_MESSAGE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if moderation_error:
            return Response({'error': moderation_error}, status=status.HTTP_400_BAD_REQUEST)

        msg = PeerRoomMessage.objects.create(
            room=room,
            sender=request.user,
            anonymous_name=profile.anonymous_name,
            content=content,
        )
        avatar_color, avatar_symbol = _ensure_peer_identity(profile)
        return Response({
            'id': msg.id,
            'user': msg.anonymous_name,
            'color': avatar_color,
            'avatarSymbol': avatar_symbol,
            'text': msg.content,
            'self': True,
            'timestamp': msg.created_at.isoformat(),
        }, status=status.HTTP_201_CREATED)


class PeerListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = _get_profile(request.user)
        if not profile.is_peer_onboarded:
            return Response({'error': 'Complete peer onboarding first.'}, status=status.HTTP_403_FORBIDDEN)

        sent = {
            c.recipient_id: c.status
            for c in PeerConnection.objects.filter(requester=request.user)
        }
        received = {
            c.requester_id: c.status
            for c in PeerConnection.objects.filter(recipient=request.user)
        }
        connected_ids = {
            user_id for user_id, connection_status in {**sent, **received}.items()
            if connection_status == PeerConnection.Status.CONNECTED
        }
        category_filter = Q(user_id__in=connected_ids)
        if profile.peer_support_category in PEER_SUPPORT_CATEGORIES:
            category_filter |= Q(peer_support_category=profile.peer_support_category)
        profiles = (
            UserProfile.objects
            .filter(category_filter, is_peer_onboarded=True)
            .exclude(anonymous_name='')
            .exclude(anonymous_name__isnull=True)
            .exclude(user=request.user)
            .select_related('user')[:30]
        )

        result = []
        for p in profiles:
            uid = p.user_id
            if uid in sent:
                conn_status = sent[uid]
                is_requester = True
            elif uid in received:
                conn_status = received[uid]
                is_requester = False
            else:
                conn_status = 'none'
                is_requester = None
            avatar_color, avatar_symbol = _ensure_peer_identity(p)
            result.append({
                'userId': str(p.peer_id),
                'name': p.anonymous_name,
                'color': avatar_color,
                'avatarSymbol': avatar_symbol,
                'status': conn_status,
                'isRequester': is_requester,
            })

        return Response(result)


class PeerConnectView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, peer_id):
        requester_profile = _get_profile(request.user)
        if not requester_profile.is_peer_onboarded:
            return Response({'error': 'Complete peer onboarding first.'}, status=status.HTTP_403_FORBIDDEN)
        target_profile = _get_peer_target(peer_id)
        if not target_profile:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        target = target_profile.user
        if target.id == request.user.id:
            return Response({'error': 'Cannot connect with yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        list(User.objects.select_for_update().filter(id__in=[request.user.id, target.id]).order_by('id'))

        existing = PeerConnection.objects.filter(
            Q(requester=request.user, recipient=target) |
            Q(requester=target, recipient=request.user)
        ).first()

        if existing:
            if existing.requester_id == request.user.id:
                return Response({'status': existing.status})
            existing.status = PeerConnection.Status.CONNECTED
            existing.save(update_fields=['status', 'updated_at'])
            PeerConnectionEvent.objects.get_or_create(
                connection=existing,
                event_type=PeerConnectionEvent.EventType.ACCEPTED,
                defaults={'actor': request.user},
            )
            return Response({'status': 'connected'})

        if (
            not requester_profile.peer_support_category
            or requester_profile.peer_support_category != target_profile.peer_support_category
        ):
            return Response(
                {'error': 'Peer recommendations are limited to your support category.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        conn = PeerConnection.objects.create(
            requester=request.user,
            recipient=target,
            status=PeerConnection.Status.PENDING,
        )
        PeerConnectionEvent.objects.create(
            connection=conn,
            actor=request.user,
            event_type=PeerConnectionEvent.EventType.REQUESTED,
        )
        return Response({'status': conn.status}, status=status.HTTP_201_CREATED)


class PeerConnectionEventView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        events = (
            PeerConnectionEvent.objects
            .filter(Q(connection__requester=request.user) | Q(connection__recipient=request.user))
            .select_related(
                'actor__profile',
                'connection__requester__profile',
                'connection__recipient__profile',
            )
            .order_by('-created_at', '-id')[:20]
        )
        payload = []
        for event in events:
            connection = event.connection
            other_user = (
                connection.recipient
                if connection.requester_id == request.user.id
                else connection.requester
            )
            other_profile = other_user.profile
            actor_profile = event.actor.profile
            payload.append({
                'id': event.id,
                'type': event.event_type,
                'createdAt': event.created_at.isoformat(),
                'direction': 'outgoing' if event.actor_id == request.user.id else 'incoming',
                'actorName': actor_profile.anonymous_name,
                'peerId': str(other_profile.peer_id),
                'peerName': other_profile.anonymous_name,
                'status': connection.status,
            })
        return Response(payload)


class PeerDMView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [PeerMessageThrottle]
    throttle_scope = 'peer_messages'

    def get(self, request, peer_id):
        target_profile = _get_peer_target(peer_id)
        if not target_profile:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        user_id = target_profile.user_id
        conn = PeerConnection.objects.filter(
            Q(requester=request.user, recipient_id=user_id, status='connected') |
            Q(requester_id=user_id, recipient=request.user, status='connected')
        ).exists()
        if not conn:
            return Response({'error': 'Not connected with this peer.'}, status=status.HTTP_403_FORBIDDEN)
        since_id = request.query_params.get('since')
        before_id = request.query_params.get('before')
        qs = PeerDM.objects.filter(
            Q(sender=request.user, recipient_id=user_id) |
            Q(sender_id=user_id, recipient=request.user)
        )
        if since_id:
            try:
                qs = qs.filter(id__gt=int(since_id))
            except ValueError:
                pass
            messages = list(qs.order_by('created_at', 'id')[:PEER_MESSAGE_PAGE_SIZE])
        else:
            if before_id:
                try:
                    qs = qs.filter(id__lt=int(before_id))
                except ValueError:
                    pass
            messages = list(qs.order_by('-created_at', '-id')[:PEER_MESSAGE_PAGE_SIZE])
            messages.reverse()

        return Response([{
            'id': m.id,
            'role': 'me' if m.sender_id == request.user.id else 'them',
            'senderName': m.sender_anon_name,
            'text': m.content,
            'timestamp': m.created_at.isoformat(),
        } for m in messages])

    def post(self, request, peer_id):
        profile = _get_profile(request.user)
        if not profile.is_peer_onboarded or not profile.anonymous_name:
            return Response({'error': 'Complete peer onboarding first.'}, status=status.HTTP_403_FORBIDDEN)
        target_profile = _get_peer_target(peer_id)
        if not target_profile:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        user_id = target_profile.user_id
        if user_id == request.user.id:
            return Response({'error': 'Cannot message yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        conn = PeerConnection.objects.filter(
            Q(requester=request.user, recipient_id=user_id, status='connected') |
            Q(requester_id=user_id, recipient=request.user, status='connected')
        ).first()
        if not conn:
            return Response({'error': 'Not connected with this peer.'}, status=status.HTTP_403_FORBIDDEN)

        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'Message cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(content) > 2000:
            return Response({'error': 'Message too long.'}, status=status.HTTP_400_BAD_REQUEST)
        moderation_error = _moderation_error(content)
        if moderation_error:
            return Response({'error': moderation_error}, status=status.HTTP_400_BAD_REQUEST)
        try:
            moderation_error = _moderate_with_ai(content)
        except Exception:
            return Response({'error': AI_MODERATION_UNAVAILABLE_MESSAGE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if moderation_error:
            return Response({'error': moderation_error}, status=status.HTTP_400_BAD_REQUEST)

        msg = PeerDM.objects.create(
            sender=request.user,
            recipient=target_profile.user,
            sender_anon_name=profile.anonymous_name,
            content=content,
        )
        return Response({
            'id': msg.id,
            'role': 'me',
            'senderName': msg.sender_anon_name,
            'text': msg.content,
            'timestamp': msg.created_at.isoformat(),
        }, status=status.HTTP_201_CREATED)
