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

class SensitiveModelAdmin(admin.ModelAdmin):
    """Keep mental-health records out of delegated staff accounts."""

    def has_module_permission(self, request):
        return request.user.is_superuser

    def has_view_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


for model in (
    UserProfile,
    CheckIn,
    Conversation,
    Message,
    JournalPrivacySettings,
    ThoughtJournalEntry,
    JournalDoodle,
    ChatUsage,
    LibraryProgress,
    TherapistMatch,
    TherapistBooking,
    TherapistAppointment,
    PeerRoom,
    PeerRoomMessage,
    PeerDM,
    PeerConnection,
):
    admin.site.register(model, SensitiveModelAdmin)
