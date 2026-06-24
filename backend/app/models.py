from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    plan = models.CharField(max_length=50, default='Free')
    streak = models.IntegerField(default=0)
    mood = models.CharField(max_length=50, blank=True, default='')
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
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'type']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        label = self.title or 'Untitled entry'
        return f'{self.user.username} - {label}'


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

    def save(self, *args, **kwargs):
        if self.type == self.CheckInType.WEEKLY:
            self.week_start_date = start_of_week(self.check_in_date)
        else:
            self.week_start_date = None
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.user.username} - {self.type} - {self.check_in_date}'


def get_user_checkin_summary(user, today=None):
    today = today or timezone.localdate()
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
    }
