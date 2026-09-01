from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializers.journal import JournalEntryReadSerializer, JournalEntryWriteSerializer
from app.models import JournalDoodle, JournalPrivacySettings, ThoughtJournalEntry


class JournalEntryCollectionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entries = request.user.thought_journal_entries.prefetch_related('doodles').order_by('entry_date', 'created_at', 'id')
        return Response({'entries': JournalEntryReadSerializer(entries, many=True).data})

    @transaction.atomic
    def post(self, request):
        serializer = JournalEntryWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        entry_date = serializer.validated_data.get('date', timezone.localdate())
        title_provided = 'title' in serializer.validated_data
        content_provided = 'content' in serializer.validated_data
        mood_provided = 'mood' in serializer.validated_data
        doodle_provided = 'doodleData' in serializer.validated_data

        entry, created = ThoughtJournalEntry.objects.get_or_create(
            user=request.user,
            entry_date=entry_date,
            defaults={
                'title': serializer.validated_data.get('title', ''),
                'content': serializer.validated_data.get('content', ''),
                'mood': serializer.validated_data.get('mood', ''),
            },
        )

        if not created:
            if title_provided:
                entry.title = serializer.validated_data.get('title', '')
            if content_provided:
                entry.content = serializer.validated_data.get('content', '')
            if mood_provided:
                entry.mood = serializer.validated_data.get('mood', '')
            if title_provided or content_provided or mood_provided:
                entry.save()

        if doodle_provided:
            doodle_data = serializer.validated_data.get('doodleData')
            if doodle_data:
                JournalDoodle.objects.update_or_create(
                    user=request.user,
                    entry=entry,
                    defaults={'doodle_data': doodle_data},
                )
            else:
                JournalDoodle.objects.filter(user=request.user, entry=entry).delete()

        entries = request.user.thought_journal_entries.prefetch_related('doodles').order_by('entry_date', 'created_at', 'id')
        return Response(
            {
                'entry': JournalEntryReadSerializer(entry).data,
                'entries': JournalEntryReadSerializer(entries, many=True).data,
            }
        )


class JournalPrivacyView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def serialize(settings):
        return {
            'allowAiAccess': settings.allow_ai_access,
            'allowJournalAccess': settings.allow_therapist_access,
            'allowChatAccess': settings.allow_chat_access,
        }

    def get(self, request):
        privacy, _ = JournalPrivacySettings.objects.get_or_create(user=request.user)
        return Response(self.serialize(privacy))

    def patch(self, request):
        privacy, _ = JournalPrivacySettings.objects.get_or_create(user=request.user)
        field_map = {
            'allowAiAccess': 'allow_ai_access',
            'allowJournalAccess': 'allow_therapist_access',
            'allowChatAccess': 'allow_chat_access',
        }
        updated_fields = []
        for payload_field, model_field in field_map.items():
            if payload_field not in request.data:
                continue
            value = request.data[payload_field]
            if not isinstance(value, bool):
                return Response(
                    {'error': f'{payload_field} must be a boolean.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            setattr(privacy, model_field, value)
            updated_fields.append(model_field)

        if updated_fields:
            privacy.save(update_fields=[*updated_fields, 'updated_at'])
        return Response(self.serialize(privacy))
