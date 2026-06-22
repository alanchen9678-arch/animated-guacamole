from django.contrib import admin

from .models import (
    Conversation,
    JournalDoodle,
    JournalPrivacySettings,
    Message,
    ThoughtJournalEntry,
    UserProfile,
)

admin.site.register(UserProfile)
admin.site.register(Conversation)
admin.site.register(Message)
admin.site.register(JournalPrivacySettings)
admin.site.register(ThoughtJournalEntry)
admin.site.register(JournalDoodle)
