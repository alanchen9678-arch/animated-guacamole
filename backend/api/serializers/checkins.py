from rest_framework import serializers

from app.models import CheckIn


class CheckInWriteSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=CheckIn.CheckInType.choices)
    qIds = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        default=list,
    )
    scores = serializers.DictField(
        child=serializers.IntegerField(),
        required=False,
        default=dict,
    )
    personality = serializers.JSONField(required=False)


class CheckInReadSerializer(serializers.ModelSerializer):
    qIds = serializers.ListField(source='question_ids')
    date = serializers.DateField(source='check_in_date')

    class Meta:
        model = CheckIn
        fields = ['id', 'type', 'date', 'qIds', 'scores']
