from datetime import timedelta
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.db.models.functions import Greatest, Least
from django.utils import timezone


PEER_SUPPORT_CATEGORY_CHOICES = (
    ('anxiety', 'Anxiety'),
    ('loneliness', 'Loneliness'),
    ('grief', 'Grief'),
    ('burnout', 'Burnout'),
    ('stress', 'Stress'),
    ('confidence', 'Low confidence'),
)
PEER_SUPPORT_CATEGORIES = tuple(value for value, _ in PEER_SUPPORT_CATEGORY_CHOICES)


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    plan = models.CharField(max_length=50, default='Free')
    streak = models.IntegerField(default=0)
    mood = models.CharField(max_length=50, blank=True, default='')
    display_name = models.CharField(max_length=50, blank=True, default='')
    bio = models.TextField(blank=True, default='')
    avatar_color = models.CharField(max_length=7, default='#4d6b58')
    avatar_symbol = models.CharField(max_length=32, default='user-horizon')
    anonymous_name = models.CharField(max_length=50, blank=True, unique=True, null=True, default=None)
    is_peer_onboarded = models.BooleanField(default=False)
    peer_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    peer_avatar_color = models.CharField(max_length=7, blank=True, default='')
    peer_avatar_symbol = models.CharField(max_length=32, blank=True, default='')
    peer_support_category = models.CharField(
        max_length=20,
        choices=PEER_SUPPORT_CATEGORY_CHOICES,
        blank=True,
        default='',
    )
    personality = models.JSONField(default=dict, blank=True)
    needs_profile = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username}'s profile"


CURRENT_PERSONALITY_SCHEMA_VERSION = 2
CURRENT_PERSONALITY_INSTRUMENT = 'dawn-harbor-personality-v2'
LEGACY_PERSONALITY_INSTRUMENT = f"{''.join(('au', 'rora'))}-personality-v2"
CURRENT_PERSONALITY_DIMENSIONS = {
    'socialEnergy',
    'cooperationTrust',
    'selfManagement',
    'emotionalRecovery',
    'opennessCuriosity',
}


def is_current_personality_profile(personality):
    if not isinstance(personality, dict):
        return False
    dimensions = personality.get('dimensions')
    if not (
        personality.get('schemaVersion') == CURRENT_PERSONALITY_SCHEMA_VERSION
        and personality.get('instrument') in {CURRENT_PERSONALITY_INSTRUMENT, LEGACY_PERSONALITY_INSTRUMENT}
        and isinstance(dimensions, dict)
        and set(dimensions) == CURRENT_PERSONALITY_DIMENSIONS
    ):
        return False
    for dimension in dimensions.values():
        if not isinstance(dimension, dict):
            return False
        try:
            score = float(dimension.get('score'))
            consistency = float(dimension.get('consistency'))
        except (TypeError, ValueError):
            return False
        if not 1 <= score <= 5 or not 0 <= consistency <= 1:
            return False
        if dimension.get('signalStrength') not in {'weak', 'moderate', 'strong', 'inconsistent'}:
            return False
    return True


class LibraryProgress(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='library_progress',
    )
    streak = models.PositiveIntegerField(default=0)
    last_completed_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def record_completion(self, completed_on=None):
        completed_on = completed_on or timezone.localdate()
        if self.last_completed_date == completed_on:
            return False
        if self.last_completed_date == completed_on - timezone.timedelta(days=1):
            self.streak += 1
        else:
            self.streak = 1
        self.last_completed_date = completed_on
        self.save(update_fields=['streak', 'last_completed_date', 'updated_at'])
        return True

    def __str__(self):
        return f'Library progress for {self.user.username}'


class Conversation(models.Model):
    class ConversationType(models.TextChoices):
        AI = 'ai', 'AI'
        THERAPIST = 'therapist', 'Therapist'
        PEER = 'peer', 'Peer'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations',
    )
    type = models.CharField(max_length=20, choices=ConversationType.choices)
    therapist_match = models.ForeignKey(
        'TherapistMatch',
        on_delete=models.CASCADE,
        related_name='conversations',
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'type']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        if self.therapist_match_id:
            return f"{self.user.username} - therapist match {self.therapist_match_id}"
        return f"{self.user.username} - {self.type} conversation"


class Message(models.Model):
    class MessageRole(models.TextChoices):
        USER = 'user', 'User'
        ASSISTANT = 'assistant', 'Assistant'
        THERAPIST = 'therapist', 'Therapist'
        PEER = 'peer', 'Peer'

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='message_logs',
    )
    role = models.CharField(max_length=20, choices=MessageRole.choices)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp', 'id']
        indexes = [
            models.Index(fields=['conversation', 'timestamp']),
            models.Index(fields=['user', 'timestamp']),
        ]

    def save(self, *args, **kwargs):
        if self.conversation_id:
            conversation_user_id = self.conversation.user_id
            if self.user_id is None:
                self.user_id = conversation_user_id
            elif self.user_id != conversation_user_id:
                raise ValidationError({'user': 'Message user must match the conversation owner.'})
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user_id} - {self.conversation_id} - {self.role}"


class ChatUsage(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_usage',
    )
    window_started_at = models.DateTimeField(default=timezone.now)
    message_count = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Chat usage for {self.user.username}: {self.message_count}'


class JournalPrivacySettings(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='journal_privacy_settings',
    )
    allow_ai_access = models.BooleanField(default=False)
    allow_therapist_access = models.BooleanField(default=False)
    allow_chat_access = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'journal privacy settings'

    def __str__(self):
        return f'Journal privacy settings for {self.user.username}'


class ThoughtJournalEntry(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='thought_journal_entries',
    )
    title = models.CharField(max_length=255, blank=True, default='')
    content = models.TextField()
    mood = models.CharField(max_length=50, blank=True, default='')
    entry_date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'entry_date']),
            models.Index(fields=['user', 'created_at']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['user', 'entry_date'], name='unique_journal_entry_per_user_date'),
        ]

    def __str__(self):
        label = self.title or 'Untitled entry'
        return f'{self.user.username} - {self.entry_date} - {label}'


class JournalDoodle(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='journal_doodles',
    )
    entry = models.ForeignKey(
        ThoughtJournalEntry,
        on_delete=models.SET_NULL,
        related_name='doodles',
        null=True,
        blank=True,
    )
    doodle_data = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['entry', 'created_at']),
        ]

    def __str__(self):
        return f'Doodle {self.pk} for {self.user.username}'


def start_of_week(date_value):
    return date_value - timezone.timedelta(days=date_value.weekday())


class CheckIn(models.Model):
    class CheckInType(models.TextChoices):
        INITIAL = 'initial', 'Initial'
        WEEKLY = 'weekly', 'Weekly'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='checkins',
    )
    type = models.CharField(max_length=20, choices=CheckInType.choices)
    question_ids = models.JSONField(default=list, blank=True)
    scores = models.JSONField(default=dict, blank=True)
    check_in_date = models.DateField(default=timezone.localdate)
    week_start_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['check_in_date', 'created_at', 'id']
        indexes = [
            models.Index(fields=['user', 'type', 'check_in_date']),
            models.Index(fields=['user', 'week_start_date']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user'],
                condition=Q(type='initial'),
                name='unique_initial_checkin_per_user',
            ),
        ]

    def save(self, *args, **kwargs):
        if self.type == self.CheckInType.WEEKLY:
            self.week_start_date = start_of_week(self.check_in_date)
        else:
            self.week_start_date = None
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.user.username} - {self.type} - {self.check_in_date}'


CHECKIN_NEEDS_PROFILE_CATEGORIES = (
    ('anxiety', 'anxiety'),
    ('stress', 'stress'),
    ('burnout', 'burnout'),
    ('loneliness', 'loneliness'),
    ('confidence', 'lowConfidence'),
    ('grief', 'grief'),
)


def _serialize_checkin_scores(scores, divisor=1):
    concerns = {}
    for source_key, profile_key in CHECKIN_NEEDS_PROFILE_CATEGORIES:
        concerns[profile_key] = round((scores.get(source_key, 0) or 0) / divisor)
    return concerns


def build_user_needs_profile(user):
    weekly_entries = list(
        user.checkins
        .filter(type=CheckIn.CheckInType.WEEKLY)
        .order_by('-check_in_date', '-created_at', '-id')[:5]
    )

    if len(weekly_entries) >= 5:
        totals = {}
        for entry in weekly_entries:
            for source_key, _ in CHECKIN_NEEDS_PROFILE_CATEGORIES:
                totals[source_key] = totals.get(source_key, 0) + (entry.scores.get(source_key, 0) or 0)
        concerns = _serialize_checkin_scores(totals, divisor=5)
        updated_at = weekly_entries[0].updated_at.isoformat()
        source_count = 5
        basis = 'weekly_average'
    else:
        initial_entry = (
            user.checkins
            .filter(type=CheckIn.CheckInType.INITIAL)
            .order_by('-check_in_date', '-created_at', '-id')
            .first()
        )
        if not initial_entry:
            return {}
        concerns = _serialize_checkin_scores(initial_entry.scores)
        updated_at = initial_entry.updated_at.isoformat()
        source_count = 1
        basis = 'initial_assessment'

    overall = round(sum(concerns.values()) / len(concerns)) if concerns else 0
    return {
        'basis': basis,
        'updated': updated_at,
        'sources': {
            'checkins': source_count,
        },
        'overall': overall,
        'concerns': concerns,
    }


def update_user_profile_insights(user, personality=None):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    updated_fields = []

    needs_profile = build_user_needs_profile(user)
    if profile.needs_profile != needs_profile:
        profile.needs_profile = needs_profile
        updated_fields.append('needs_profile')

    if personality is not None and profile.personality != personality:
        profile.personality = personality
        updated_fields.append('personality')

    if updated_fields:
        profile.save(update_fields=updated_fields)

    return profile


class TherapistMatch(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='therapist_matches',
    )
    therapist_id = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at', 'id']
        indexes = [
            models.Index(fields=['user', 'created_at']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['user', 'therapist_id'], name='unique_therapist_match_per_user'),
        ]

    def __str__(self):
        return f'{self.user.username} - therapist {self.therapist_id}'


class TherapistBooking(models.Model):
    class Status(models.TextChoices):
        REQUESTED = 'requested', 'Requested'
        CONFIRMED = 'confirmed', 'Confirmed'
        CANCELLED = 'cancelled', 'Cancelled'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='therapist_bookings',
    )
    match = models.ForeignKey(
        TherapistMatch,
        on_delete=models.CASCADE,
        related_name='bookings',
    )
    therapist_id = models.PositiveIntegerField()
    insurance_provider = models.CharField(max_length=100, blank=True, default='')
    member_id = models.CharField(max_length=100, blank=True, default='')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at', '-id']
        indexes = [models.Index(fields=['user', 'created_at'])]

    def __str__(self):
        return f'{self.user.username} - booking for therapist {self.therapist_id}'


class TherapistAppointment(models.Model):
    class Status(models.TextChoices):
        CONFIRMED = 'confirmed', 'Confirmed'
        CANCELLED = 'cancelled', 'Cancelled'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='therapist_appointments',
    )
    match = models.ForeignKey(
        TherapistMatch,
        on_delete=models.CASCADE,
        related_name='appointments',
    )
    title = models.CharField(max_length=150)
    scheduled_for = models.DateTimeField()
    duration_minutes = models.PositiveSmallIntegerField(default=50)
    timezone = models.CharField(max_length=64, default='UTC')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CONFIRMED)
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['scheduled_for', 'id']
        indexes = [models.Index(fields=['user', 'scheduled_for'])]

    def __str__(self):
        return f'{self.user.username} - {self.title} at {self.scheduled_for}'


def get_user_checkin_summary(user, today=None):
    today = today or timezone.localdate()
    has_initial_assessment = user.checkins.filter(type=CheckIn.CheckInType.INITIAL).exists()
    profile, _ = UserProfile.objects.get_or_create(user=user)
    has_current_personality_assessment = is_current_personality_profile(profile.personality)
    weekly_entries = list(
        user.checkins.filter(type=CheckIn.CheckInType.WEEKLY).order_by('-week_start_date', '-created_at', '-id')
    )
    latest_entry = user.checkins.order_by('-check_in_date', '-created_at', '-id').first()
    latest_weekly_entry = weekly_entries[0] if weekly_entries else None

    streak = 0
    if latest_weekly_entry:
        current_week_start = start_of_week(today)
        latest_week_start = latest_weekly_entry.week_start_date
        weeks_since_latest = (current_week_start - latest_week_start).days // 7

        if weeks_since_latest <= 1:
            streak = 1
            last_week_start = latest_week_start
            seen_weeks = {latest_week_start}
            for entry in weekly_entries[1:]:
                week_start = entry.week_start_date
                if week_start in seen_weeks:
                    continue
                if (last_week_start - week_start).days == 7:
                    streak += 1
                    seen_weeks.add(week_start)
                    last_week_start = week_start
                else:
                    break

    due_this_week = latest_weekly_entry is None or latest_weekly_entry.week_start_date != start_of_week(today)
    weekly_due_since = None
    if due_this_week:
        weekly_due_since = (
            latest_weekly_entry.week_start_date + timedelta(days=7)
            if latest_weekly_entry
            else today
        )

    return {
        'streak': streak,
        'last_check_in_date': latest_entry.check_in_date if latest_entry else None,
        'last_weekly_check_in_date': latest_weekly_entry.check_in_date if latest_weekly_entry else None,
        'due_this_week': due_this_week,
        'weekly_due_since': weekly_due_since,
        'has_initial_assessment': has_initial_assessment,
        'has_current_personality_assessment': has_current_personality_assessment,
    }


class PeerRoom(models.Model):
    name = models.CharField(max_length=100)
    topic = models.CharField(max_length=50, choices=PEER_SUPPORT_CATEGORY_CHOICES)
    slot = models.PositiveSmallIntegerField(default=1)
    capacity = models.PositiveSmallIntegerField(default=20)
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['topic', 'slot', 'id']
        constraints = [
            models.CheckConstraint(condition=Q(slot__gte=1), name='peer_room_slot_at_least_one'),
            models.CheckConstraint(condition=Q(capacity__gte=1), name='peer_room_capacity_at_least_one'),
            models.UniqueConstraint(
                fields=['topic', 'slot'],
                condition=Q(is_active=True),
                name='unique_active_peer_room_topic_slot',
            ),
        ]

    def __str__(self):
        return self.name


class PeerRoomMembership(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        ENDED = 'ended', 'Ended'

    class EndReason(models.TextChoices):
        SWITCHED = 'switched', 'Switched rooms'
        OPTED_OUT = 'opted_out', 'Opted out'
        ROOM_CLOSED = 'room_closed', 'Room closed'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='peer_room_memberships',
    )
    room = models.ForeignKey(PeerRoom, on_delete=models.CASCADE, related_name='memberships')
    category = models.CharField(max_length=20, choices=PEER_SUPPORT_CATEGORY_CHOICES)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ACTIVE)
    assigned_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    end_reason = models.CharField(max_length=20, choices=EndReason.choices, blank=True, default='')

    class Meta:
        ordering = ['-assigned_at', '-id']
        indexes = [
            models.Index(fields=['room', 'status']),
            models.Index(fields=['category', 'status']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user'],
                condition=Q(status='active'),
                name='unique_active_peer_room_membership',
            ),
        ]

    def __str__(self):
        return f'{self.user_id} in {self.room_id} ({self.status})'


class PeerRoomWaitlist(models.Model):
    class Status(models.TextChoices):
        WAITING = 'waiting', 'Waiting'
        ASSIGNED = 'assigned', 'Assigned'
        CANCELLED = 'cancelled', 'Cancelled'

    class Reason(models.TextChoices):
        CAPACITY = 'capacity', 'Rooms full'
        OPTED_OUT = 'opted_out', 'Waiting for a future room'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='peer_room_waitlist_entries',
    )
    category = models.CharField(max_length=20, choices=PEER_SUPPORT_CATEGORY_CHOICES)
    reason = models.CharField(max_length=16, choices=Reason.choices, default=Reason.CAPACITY)
    minimum_room_slot = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.WAITING)
    joined_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    assigned_room = models.ForeignKey(
        PeerRoom,
        on_delete=models.SET_NULL,
        related_name='fulfilled_waitlist_entries',
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ['joined_at', 'id']
        indexes = [models.Index(fields=['category', 'status', 'joined_at'])]
        constraints = [
            models.CheckConstraint(
                condition=Q(minimum_room_slot__gte=1),
                name='peer_waitlist_min_slot_at_least_one',
            ),
            models.UniqueConstraint(
                fields=['user'],
                condition=Q(status='waiting'),
                name='unique_waiting_peer_room_entry',
            ),
        ]

    def __str__(self):
        return f'{self.user_id} waiting for {self.category}'


class PeerRoomMessage(models.Model):
    room = models.ForeignKey(PeerRoom, on_delete=models.CASCADE, related_name='room_messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    anonymous_name = models.CharField(max_length=50)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [models.Index(fields=['room', 'created_at'])]

    def __str__(self):
        return f"{self.anonymous_name} in {self.room_id}"


class PeerDM(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_peer_dms')
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_peer_dms')
    sender_anon_name = models.CharField(max_length=50)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [models.Index(fields=['sender', 'recipient', 'created_at'])]

    def __str__(self):
        return f"DM {self.sender_id} -> {self.recipient_id}"


class PeerConnection(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        CONNECTED = 'connected', 'Connected'
        DECLINED = 'declined', 'Declined'

    requester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_peer_connections')
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_peer_connections')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [['requester', 'recipient']]
        constraints = [
            models.CheckConstraint(
                condition=~Q(requester=models.F('recipient')),
                name='peer_connection_not_self',
            ),
            models.UniqueConstraint(
                Least('requester_id', 'recipient_id'),
                Greatest('requester_id', 'recipient_id'),
                name='unique_unordered_peer_connection',
            ),
        ]

    def __str__(self):
        return f"{self.requester_id} -> {self.recipient_id} ({self.status})"
