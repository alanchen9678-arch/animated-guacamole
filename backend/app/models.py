from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone


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
    anonymous_name = models.CharField(max_length=50, blank=True, unique=True, null=True, default=None)
    is_peer_onboarded = models.BooleanField(default=False)
    personality = models.JSONField(default=dict, blank=True)
    needs_profile = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username}'s profile"


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
    role = models.CharField(max_length=20, choices=MessageRole.choices)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp', 'id']
        indexes = [
            models.Index(fields=['conversation', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.conversation_id} - {self.role}"


class JournalPrivacySettings(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='journal_privacy_settings',
    )
    allow_ai_access = models.BooleanField(default=False)
    allow_therapist_access = models.BooleanField(default=False)
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


def get_user_checkin_summary(user, today=None):
    today = today or timezone.localdate()
    has_initial_assessment = user.checkins.filter(type=CheckIn.CheckInType.INITIAL).exists()
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

    return {
        'streak': streak,
        'last_check_in_date': latest_entry.check_in_date if latest_entry else None,
        'due_this_week': due_this_week,
        'has_initial_assessment': has_initial_assessment,
    }


class PeerRoom(models.Model):
    name = models.CharField(max_length=100)
    topic = models.CharField(max_length=50)
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


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

    def __str__(self):
        return f"{self.requester_id} -> {self.recipient_id} ({self.status})"
