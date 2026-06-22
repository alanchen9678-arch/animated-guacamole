from django.conf import settings
from django.contrib.auth.models import User
from django.db import models


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
