from rest_framework import serializers

from app.models import ThoughtJournalEntry


class JournalEntryWriteSerializer(serializers.Serializer):
    date = serializers.DateField(required=False)
    title = serializers.CharField(required=False, allow_blank=True, default='')
    content = serializers.CharField(required=False, allow_blank=True)
    mood = serializers.CharField(required=False, allow_blank=True, default='')


class JournalEntryReadSerializer(serializers.ModelSerializer):
    date = serializers.DateField(source='entry_date')
    text = serializers.CharField(source='content')

    class Meta:
        model = ThoughtJournalEntry
        fields = ['id', 'date', 'title', 'text', 'mood', 'created_at', 'updated_at']
