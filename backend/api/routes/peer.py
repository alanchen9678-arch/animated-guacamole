import random

from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from app.models import (
    PeerConnection,
    PeerDM,
    PeerRoom,
    PeerRoomMessage,
    UserProfile,
)

WORD_A = ['Calm', 'Quiet', 'Gentle', 'Steady', 'Brave', 'Kind', 'Warm', 'Still', 'Soft', 'Clear', 'Bold', 'Light']
WORD_N = ['Maple', 'River', 'Stone', 'Dawn', 'Forest', 'Lake', 'Ember', 'Cloud', 'Tide', 'Ridge', 'Pine', 'Brook']
AVATAR_COLORS = [
    '#3a6898', '#b45309', '#15803d', '#1d4ed8', '#be185d',
    '#0891b2', '#9333ea', '#c2410c', '#4d6b58', '#a21caf', '#047857', '#2563eb',
]


def _color(name):
    return AVATAR_COLORS[hash(name) % len(AVATAR_COLORS)]


def _get_profile(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


def _generate_anon_name():
    for _ in range(20):
        name = f"{random.choice(WORD_A)}{random.choice(WORD_N)}{10 + random.randint(0, 88)}"
        if not UserProfile.objects.filter(anonymous_name=name).exists():
            return name
    return f"User{random.randint(1000, 9999)}"


def _get_default_room():
    room, _ = PeerRoom.objects.get_or_create(
        topic='anxiety',
        defaults={
            'name': 'Anxiety Support Room',
            'description': 'A safe space for those dealing with anxiety to connect and support each other.',
        },
    )
    return room


def _connection_status(user, other_id):
    conn = PeerConnection.objects.filter(
        Q(requester=user, recipient_id=other_id) |
        Q(requester_id=other_id, recipient=user)
    ).first()
    if not conn:
        return 'none', None
    return conn.status, conn.requester_id == user.id


class PeerProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = _get_profile(request.user)
        return Response({
            'anonymousName': profile.anonymous_name or '',
            'isOnboarded': profile.is_peer_onboarded,
            'avatarColor': profile.avatar_color,
        })

    def post(self, request):
        profile = _get_profile(request.user)
        if not profile.anonymous_name:
            name = _generate_anon_name()
            profile.anonymous_name = name
            profile.avatar_color = _color(name)
        profile.is_peer_onboarded = True
        profile.save(update_fields=['anonymous_name', 'is_peer_onboarded', 'avatar_color'])
        return Response({
            'anonymousName': profile.anonymous_name,
            'isOnboarded': profile.is_peer_onboarded,
            'avatarColor': profile.avatar_color,
        })


class PeerRoomListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        room = _get_default_room()
        member_count = PeerRoomMessage.objects.filter(room=room).values('sender').distinct().count()
        return Response([{
            'id': room.id,
            'name': room.name,
            'topic': room.topic,
            'description': room.description,
            'memberCount': max(member_count, 1),
        }])


class PeerRoomMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        try:
            room = PeerRoom.objects.get(id=room_id, is_active=True)
        except PeerRoom.DoesNotExist:
            return Response({'error': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)

        since_id = request.query_params.get('since')
        qs = room.room_messages.all()
        if since_id:
            try:
                qs = qs.filter(id__gt=int(since_id))
            except ValueError:
                pass
        messages = list(qs.order_by('-created_at')[:100])
        messages.reverse()

        return Response([{
            'id': m.id,
            'user': m.anonymous_name,
            'color': _color(m.anonymous_name),
            'text': m.content,
            'self': m.sender_id == request.user.id,
            'timestamp': m.created_at.isoformat(),
        } for m in messages])

    def post(self, request, room_id):
        try:
            room = PeerRoom.objects.get(id=room_id, is_active=True)
        except PeerRoom.DoesNotExist:
            return Response({'error': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)

        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'Message cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(content) > 2000:
            return Response({'error': 'Message too long.'}, status=status.HTTP_400_BAD_REQUEST)

        profile = _get_profile(request.user)
        if not profile.anonymous_name:
            return Response({'error': 'Complete peer onboarding first.'}, status=status.HTTP_400_BAD_REQUEST)

        msg = PeerRoomMessage.objects.create(
            room=room,
            sender=request.user,
            anonymous_name=profile.anonymous_name,
            content=content,
        )
        return Response({
            'id': msg.id,
            'user': msg.anonymous_name,
            'color': _color(msg.anonymous_name),
            'text': msg.content,
            'self': True,
            'timestamp': msg.created_at.isoformat(),
        }, status=status.HTTP_201_CREATED)


class PeerListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profiles = (
            UserProfile.objects
            .filter(is_peer_onboarded=True)
            .exclude(anonymous_name='')
            .exclude(anonymous_name__isnull=True)
            .exclude(user=request.user)
            .select_related('user')[:30]
        )

        sent = {
            c.recipient_id: c.status
            for c in PeerConnection.objects.filter(requester=request.user)
        }
        received = {
            c.requester_id: c.status
            for c in PeerConnection.objects.filter(recipient=request.user)
        }

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
            result.append({
                'userId': uid,
                'name': p.anonymous_name,
                'color': _color(p.anonymous_name),
                'status': conn_status,
                'isRequester': is_requester,
            })

        return Response(result)


class PeerConnectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        if user_id == request.user.id:
            return Response({'error': 'Cannot connect with yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        existing = PeerConnection.objects.filter(
            Q(requester=request.user, recipient=target) |
            Q(requester=target, recipient=request.user)
        ).first()

        if existing:
            if existing.requester_id == request.user.id:
                return Response({'status': existing.status})
            existing.status = PeerConnection.Status.CONNECTED
            existing.save(update_fields=['status', 'updated_at'])
            return Response({'status': 'connected'})

        conn = PeerConnection.objects.create(
            requester=request.user,
            recipient=target,
            status=PeerConnection.Status.PENDING,
        )
        return Response({'status': conn.status}, status=status.HTTP_201_CREATED)


class PeerDMView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        since_id = request.query_params.get('since')
        qs = PeerDM.objects.filter(
            Q(sender=request.user, recipient_id=user_id) |
            Q(sender_id=user_id, recipient=request.user)
        )
        if since_id:
            try:
                qs = qs.filter(id__gt=int(since_id))
            except ValueError:
                pass
        messages = list(qs.order_by('created_at')[:200])

        return Response([{
            'id': m.id,
            'role': 'me' if m.sender_id == request.user.id else 'them',
            'senderName': m.sender_anon_name,
            'text': m.content,
            'timestamp': m.created_at.isoformat(),
        } for m in messages])

    def post(self, request, user_id):
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

        try:
            recipient = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        profile = _get_profile(request.user)
        msg = PeerDM.objects.create(
            sender=request.user,
            recipient=recipient,
            sender_anon_name=profile.anonymous_name or request.user.username,
            content=content,
        )
        return Response({
            'id': msg.id,
            'role': 'me',
            'senderName': msg.sender_anon_name,
            'text': msg.content,
            'timestamp': msg.created_at.isoformat(),
        }, status=status.HTTP_201_CREATED)
