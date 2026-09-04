from datetime import timedelta
from random import choice
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializers.chat import ChatRequestSerializer
from api.serializers.therapist import TherapistMatchReadSerializer, TherapistMatchWriteSerializer
from app.models import (
    CheckIn,
    Conversation,
    JournalPrivacySettings,
    Message,
    TherapistAppointment,
    TherapistBooking,
    TherapistMatch,
)

THERAPIST_AUTO_REPLIES = [
    "Hello. I've reviewed your Aurora profile and I'm glad you reached out. How have things been feeling for you lately?",
    "That makes sense. I'd like to understand what has been weighing on you most before we focus on solutions. What feels hardest right now?",
    "We can take this one step at a time. You do not need to explain everything at once.",
    "I hear a pattern there. Let's slow it down together and look at what tends to happen just before that feeling spikes.",
    "Thank you for being direct about that. Based on what you've shared, it sounds worth exploring both stress triggers and the supports already working for you.",
]


def get_or_create_therapist_conversation(match):
    conversation = (
        match.conversations
        .filter(user=match.user, type=Conversation.ConversationType.THERAPIST)
        .order_by('-created_at', '-id')
        .first()
    )
    if conversation:
        return conversation

    conversation = Conversation.objects.create(
        user=match.user,
        type=Conversation.ConversationType.THERAPIST,
        therapist_match=match,
    )
    Message.objects.create(
        conversation=conversation,
        role=Message.MessageRole.THERAPIST,
        content=THERAPIST_AUTO_REPLIES[0],
    )
    return conversation


def serialize_therapist_message(message):
    return {
        'id': message.id,
        'role': message.role,
        'content': message.content,
        'timestamp': message.timestamp.isoformat(),
    }


def get_user_match(request, match_id):
    return TherapistMatch.objects.filter(id=match_id, user=request.user).first()


def serialize_booking(booking):
    return {
        'id': booking.id,
        'matchId': booking.match_id,
        'therapistId': booking.therapist_id,
        'insuranceProvider': booking.insurance_provider,
        'memberId': booking.member_id,
        'status': booking.status,
        'createdAt': booking.created_at.isoformat(),
        'updatedAt': booking.updated_at.isoformat(),
    }


def serialize_appointment(appointment):
    return {
        'id': appointment.id,
        'matchId': appointment.match_id,
        'title': appointment.title,
        'scheduledFor': appointment.scheduled_for.isoformat(),
        'durationMinutes': appointment.duration_minutes,
        'timezone': appointment.timezone,
        'status': appointment.status,
        'description': appointment.description,
        'createdAt': appointment.created_at.isoformat(),
        'updatedAt': appointment.updated_at.isoformat(),
    }


class TherapistBookingWriteSerializer(serializers.Serializer):
    insuranceProvider = serializers.CharField(required=False, allow_blank=True, max_length=100)
    memberId = serializers.CharField(required=False, allow_blank=True, max_length=100)


class TherapistAppointmentWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=150)
    scheduledFor = serializers.DateTimeField()
    durationMinutes = serializers.IntegerField(min_value=15, max_value=240, default=50)
    timezone = serializers.CharField(max_length=64, default='UTC')
    description = serializers.CharField(required=False, allow_blank=True, max_length=2000)

    def validate_scheduledFor(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError('Appointment time must be in the future.')
        return value

    def validate_timezone(self, value):
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise serializers.ValidationError('Select a valid IANA timezone.')
        return value


class TherapistAppointmentUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(required=False, max_length=150)
    scheduledFor = serializers.DateTimeField(required=False)
    durationMinutes = serializers.IntegerField(required=False, min_value=15, max_value=240)
    timezone = serializers.CharField(required=False, max_length=64)
    description = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    status = serializers.ChoiceField(
        required=False,
        choices=[TherapistAppointment.Status.CANCELLED],
    )

    def validate_timezone(self, value):
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise serializers.ValidationError('Select a valid IANA timezone.')
        return value


class TherapistBookingUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[TherapistBooking.Status.CANCELLED])


def find_appointment_conflict(user, scheduled_for, duration_minutes, exclude_id=None):
    proposed_end = scheduled_for + timedelta(minutes=duration_minutes)
    appointments = (
        user.therapist_appointments
        .exclude(status=TherapistAppointment.Status.CANCELLED)
        .exclude(id=exclude_id)
    )
    for appointment in appointments:
        existing_end = appointment.scheduled_for + timedelta(minutes=appointment.duration_minutes)
        if scheduled_for < existing_end and proposed_end > appointment.scheduled_for:
            return appointment
    return None


def appointment_conflict_response(conflict):
    return Response(
        {
            'error': 'This appointment overlaps another appointment.',
            'conflict': serialize_appointment(conflict),
        },
        status=status.HTTP_409_CONFLICT,
    )


class TherapistMatchCollectionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        matches = request.user.therapist_matches.order_by('created_at', 'id')
        serialized = TherapistMatchReadSerializer(matches, many=True).data
        return Response(
            {
                'matches': serialized,
                'therapistIds': [item['therapistId'] for item in serialized],
            }
        )

    def post(self, request):
        serializer = TherapistMatchWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        match, _ = TherapistMatch.objects.get_or_create(
            user=request.user,
            therapist_id=serializer.validated_data['therapistId'],
        )

        matches = request.user.therapist_matches.order_by('created_at', 'id')
        serialized = TherapistMatchReadSerializer(matches, many=True).data
        return Response(
            {
                'match': TherapistMatchReadSerializer(match).data,
                'matches': serialized,
                'therapistIds': [item['therapistId'] for item in serialized],
            }
        )


class TherapistBookingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, match_id):
        match = get_user_match(request, match_id)
        if not match:
            return Response({'error': 'Therapist match not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'bookings': [serialize_booking(item) for item in match.bookings.all()]})

    def post(self, request, match_id):
        match = get_user_match(request, match_id)
        if not match:
            return Response({'error': 'Therapist match not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = TherapistBookingWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = TherapistBooking.objects.create(
            user=request.user,
            match=match,
            therapist_id=match.therapist_id,
            insurance_provider=serializer.validated_data.get('insuranceProvider', ''),
            member_id=serializer.validated_data.get('memberId', ''),
        )
        return Response(serialize_booking(booking), status=status.HTTP_201_CREATED)


class TherapistBookingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, match_id, booking_id):
        match = get_user_match(request, match_id)
        if not match:
            return Response({'error': 'Therapist match not found.'}, status=status.HTTP_404_NOT_FOUND)
        booking = match.bookings.filter(id=booking_id, user=request.user).first()
        if not booking:
            return Response({'error': 'Booking request not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = TherapistBookingUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if booking.status != TherapistBooking.Status.REQUESTED:
            return Response(
                {'error': 'Only outstanding booking requests can be cancelled.'},
                status=status.HTTP_409_CONFLICT,
            )
        booking.status = TherapistBooking.Status.CANCELLED
        booking.save(update_fields=['status', 'updated_at'])
        return Response(serialize_booking(booking))


class TherapistAppointmentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, match_id):
        match = get_user_match(request, match_id)
        if not match:
            return Response({'error': 'Therapist match not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(
            {'appointments': [serialize_appointment(item) for item in match.appointments.all()]}
        )

    def post(self, request, match_id):
        match = get_user_match(request, match_id)
        if not match:
            return Response({'error': 'Therapist match not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = TherapistAppointmentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        scheduled_for = serializer.validated_data['scheduledFor']
        duration_minutes = serializer.validated_data['durationMinutes']
        with transaction.atomic():
            request.user.__class__.objects.select_for_update().get(pk=request.user.pk)
            conflict = find_appointment_conflict(request.user, scheduled_for, duration_minutes)
            if conflict:
                return appointment_conflict_response(conflict)
            appointment = TherapistAppointment.objects.create(
                user=request.user,
                match=match,
                title=serializer.validated_data['title'],
                scheduled_for=scheduled_for,
                duration_minutes=duration_minutes,
                timezone=serializer.validated_data['timezone'],
                description=serializer.validated_data.get('description', ''),
            )
        return Response(serialize_appointment(appointment), status=status.HTTP_201_CREATED)


class TherapistAppointmentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, match_id, appointment_id):
        match = get_user_match(request, match_id)
        if not match:
            return Response({'error': 'Therapist match not found.'}, status=status.HTTP_404_NOT_FOUND)
        appointment = match.appointments.filter(id=appointment_id, user=request.user).first()
        if not appointment:
            return Response({'error': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = TherapistAppointmentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data

        if values.get('status') == TherapistAppointment.Status.CANCELLED:
            if appointment.status == TherapistAppointment.Status.CANCELLED:
                return Response(serialize_appointment(appointment))
            if appointment.scheduled_for <= timezone.now():
                return Response(
                    {'error': 'Past appointments cannot be cancelled.'},
                    status=status.HTTP_409_CONFLICT,
                )
            appointment.status = TherapistAppointment.Status.CANCELLED
            appointment.save(update_fields=['status', 'updated_at'])
            return Response(serialize_appointment(appointment))

        if appointment.status == TherapistAppointment.Status.CANCELLED:
            return Response(
                {'error': 'Cancelled appointments cannot be edited.'},
                status=status.HTTP_409_CONFLICT,
            )

        scheduled_for = values.get('scheduledFor', appointment.scheduled_for)
        duration_minutes = values.get('durationMinutes', appointment.duration_minutes)
        if scheduled_for <= timezone.now():
            return Response(
                {'scheduledFor': ['Appointment time must be in the future.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            request.user.__class__.objects.select_for_update().get(pk=request.user.pk)
            conflict = find_appointment_conflict(
                request.user,
                scheduled_for,
                duration_minutes,
                exclude_id=appointment.id,
            )
            if conflict:
                return appointment_conflict_response(conflict)
            appointment.title = values.get('title', appointment.title)
            appointment.scheduled_for = scheduled_for
            appointment.duration_minutes = duration_minutes
            appointment.timezone = values.get('timezone', appointment.timezone)
            appointment.description = values.get('description', appointment.description)
            appointment.save()
        return Response(serialize_appointment(appointment))


class TherapistSharingPreviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        privacy, _ = JournalPrivacySettings.objects.get_or_create(user=request.user)
        profile = getattr(request.user, 'profile', None)
        needs_profile = profile.needs_profile if profile else {}

        weekly = list(
            request.user.checkins
            .filter(type=CheckIn.CheckInType.WEEKLY)
            .order_by('-check_in_date', '-created_at', '-id')[:5]
        )
        if len(weekly) >= 5:
            shared_checkins = weekly
        else:
            initial = (
                request.user.checkins
                .filter(type=CheckIn.CheckInType.INITIAL)
                .order_by('-check_in_date', '-created_at', '-id')
                .first()
            )
            shared_checkins = [initial] if initial else []

        journal_entries = []
        if privacy.allow_therapist_access:
            cutoff = timezone.localdate() - timedelta(days=30)
            entries = request.user.thought_journal_entries.filter(entry_date__gte=cutoff)
            journal_entries = [
                {
                    'id': entry.id,
                    'date': entry.entry_date.isoformat(),
                    'title': entry.title,
                    'mood': entry.mood,
                    'content': entry.content,
                    'hasDoodle': entry.doodles.exists(),
                }
                for entry in entries
            ]

        chat_messages = []
        if privacy.allow_chat_access:
            cutoff = timezone.now() - timedelta(days=7)
            messages = (
                Message.objects
                .filter(
                    conversation__user=request.user,
                    conversation__type=Conversation.ConversationType.AI,
                    timestamp__gte=cutoff,
                )
                .order_by('timestamp', 'id')
            )
            chat_messages = [serialize_therapist_message(message) for message in messages]

        return Response({
            'needsProfile': needs_profile,
            'checkIns': [
                {
                    'id': entry.id,
                    'type': entry.type,
                    'date': entry.check_in_date.isoformat(),
                    'scores': entry.scores,
                }
                for entry in shared_checkins
            ],
            'journal': {
                'allowed': privacy.allow_therapist_access,
                'rangeDays': 30,
                'entries': journal_entries,
            },
            'chat': {
                'allowed': privacy.allow_chat_access,
                'rangeDays': 7,
                'messages': chat_messages,
            },
        })


class TherapistMatchMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def get_match(self, request, match_id):
        return get_user_match(request, match_id)

    def get(self, request, match_id):
        match = self.get_match(request, match_id)
        if not match:
            return Response({'error': 'Therapist match not found.'}, status=status.HTTP_404_NOT_FOUND)

        conversation = get_or_create_therapist_conversation(match)
        messages = conversation.messages.order_by('timestamp', 'id')
        return Response(
            {
                'matchId': match.id,
                'therapistId': match.therapist_id,
                'messages': [serialize_therapist_message(message) for message in messages],
            }
        )

    def post(self, request, match_id):
        match = self.get_match(request, match_id)
        if not match:
            return Response({'error': 'Therapist match not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation = get_or_create_therapist_conversation(match)

        user_message = Message.objects.create(
            conversation=conversation,
            role=Message.MessageRole.USER,
            content=serializer.validated_data['message'],
        )

        last_therapist_message = (
            conversation.messages
            .filter(role=Message.MessageRole.THERAPIST)
            .order_by('-timestamp', '-id')
            .first()
        )
        candidate_replies = [
            reply for reply in THERAPIST_AUTO_REPLIES
            if reply != (last_therapist_message.content if last_therapist_message else None)
        ]
        reply_text = choice(candidate_replies or THERAPIST_AUTO_REPLIES)
        reply_message = Message.objects.create(
            conversation=conversation,
            role=Message.MessageRole.THERAPIST,
            content=reply_text,
        )

        return Response(
            {
                'userMessage': serialize_therapist_message(user_message),
                'replyMessage': serialize_therapist_message(reply_message),
            },
            status=status.HTTP_201_CREATED,
        )
