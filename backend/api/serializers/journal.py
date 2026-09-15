import base64
import binascii

from rest_framework import serializers

from app.models import ThoughtJournalEntry

MAX_DOODLE_BYTES = 1024 * 1024
MAX_DOODLE_DATA_URL_LENGTH = 1400000
JOURNAL_MOODS = ['', 'happy', 'calm', 'neutral', 'sad', 'anxious', 'tired', 'angry']


class JournalEntryWriteSerializer(serializers.Serializer):
    date = serializers.DateField(required=False)
    title = serializers.CharField(required=False, allow_blank=True, default='', max_length=255)
    content = serializers.CharField(required=False, allow_blank=True, max_length=20000)
    mood = serializers.ChoiceField(required=False, allow_blank=True, default='', choices=JOURNAL_MOODS)
    doodleData = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=MAX_DOODLE_DATA_URL_LENGTH,
        trim_whitespace=False,
    )

    def validate_doodleData(self, value):
        if not value:
            return value
        prefix = 'data:image/png;base64,'
        if not value.startswith(prefix):
            raise serializers.ValidationError('Doodles must be PNG images.')
        try:
            decoded = base64.b64decode(value[len(prefix):], validate=True)
        except (ValueError, binascii.Error):
            raise serializers.ValidationError('Doodle image data is invalid.')
        if not decoded.startswith(b'\x89PNG\r\n\x1a\n'):
            raise serializers.ValidationError('Doodle image data is not a valid PNG.')
        if len(decoded) > MAX_DOODLE_BYTES:
            raise serializers.ValidationError('Doodle image is too large.')
        return value


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
