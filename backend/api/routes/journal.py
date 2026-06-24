from django.db import transaction
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializers.journal import JournalEntryReadSerializer, JournalEntryWriteSerializer
from app.models import ThoughtJournalEntry


class JournalEntryCollectionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entries = request.user.thought_journal_entries.order_by('entry_date', 'created_at', 'id')
        return Response({'entries': JournalEntryReadSerializer(entries, many=True).data})

    @transaction.atomic
    def post(self, request):
        serializer = JournalEntryWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        entry_date = serializer.validated_data.get('date', timezone.localdate())
        title_provided = 'title' in serializer.validated_data
        content_provided = 'content' in serializer.validated_data
        mood_provided = 'mood' in serializer.validated_data

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

        entries = request.user.thought_journal_entries.order_by('entry_date', 'created_at', 'id')
        return Response(
            {
                'entry': JournalEntryReadSerializer(entry).data,
                'entries': JournalEntryReadSerializer(entries, many=True).data,
            }
        )
