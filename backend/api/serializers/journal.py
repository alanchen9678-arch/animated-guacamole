from rest_framework import serializers

from app.models import ThoughtJournalEntry


class JournalEntryWriteSerializer(serializers.Serializer):
    date = serializers.DateField(required=False)
    title = serializers.CharField(required=False, allow_blank=True, default='')
    content = serializers.CharField(required=False, allow_blank=True)
    mood = serializers.CharField(required=False, allow_blank=True, default='')
    doodleData = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class JournalEntryReadSerializer(serializers.ModelSerializer):
    date = serializers.DateField(source='entry_date')
    text = serializers.CharField(source='content')
    doodleData = serializers.SerializerMethodField()

    def get_doodleData(self, entry):
        doodle = entry.doodles.order_by('-updated_at', '-id').first()
        return doodle.doodle_data if doodle else None

    class Meta:
        model = ThoughtJournalEntry
        fields = ['id', 'date', 'title', 'text', 'mood', 'doodleData', 'created_at', 'updated_at']
