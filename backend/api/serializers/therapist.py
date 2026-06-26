from rest_framework import serializers

from app.models import TherapistMatch


class TherapistMatchWriteSerializer(serializers.Serializer):
    therapistId = serializers.IntegerField(min_value=1)


class TherapistMatchReadSerializer(serializers.ModelSerializer):
    therapistId = serializers.IntegerField(source='therapist_id')

    class Meta:
        model = TherapistMatch
        fields = ['id', 'therapistId', 'created_at', 'updated_at']
