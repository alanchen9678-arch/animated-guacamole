from django.contrib import admin

from .models import (
    ChatUsage,
    CheckIn,
    Conversation,
    JournalDoodle,
    JournalPrivacySettings,
    LibraryProgress,
    Message,
    PeerConnection,
    PeerDM,
    PeerRoom,
    PeerRoomMessage,
    TherapistAppointment,
    TherapistBooking,
    TherapistMatch,
    ThoughtJournalEntry,
    UserProfile,
)

admin.site.register(UserProfile)
admin.site.register(CheckIn)
admin.site.register(Conversation)
admin.site.register(Message)
admin.site.register(JournalPrivacySettings)
admin.site.register(ThoughtJournalEntry)
admin.site.register(JournalDoodle)
admin.site.register(ChatUsage)
admin.site.register(LibraryProgress)
admin.site.register(TherapistMatch)
admin.site.register(TherapistBooking)
admin.site.register(TherapistAppointment)
admin.site.register(PeerRoom)
admin.site.register(PeerRoomMessage)
admin.site.register(PeerDM)
admin.site.register(PeerConnection)
