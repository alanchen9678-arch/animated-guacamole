from rest_framework import serializers

from app.models import CheckIn

PERSONALITY_DIMENSION_IDS = {
    'socialEnergy',
    'cooperationTrust',
    'selfManagement',
    'emotionalRecovery',
    'opennessCuriosity',
}
PERSONALITY_SIGNAL_STRENGTHS = {'weak', 'moderate', 'strong', 'inconsistent'}


class CheckInWriteSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=[*CheckIn.CheckInType.choices, ('personality', 'Personality')])
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
    personality = serializers.JSONField(required=False, allow_null=True)

    def validate_personality(self, value):
        if value is None:
            return None
        if not isinstance(value, dict) or value.get('schemaVersion') != 2:
            raise serializers.ValidationError('A version 2 continuous personality profile is required.')
        if value.get('instrument') != 'aurora-personality-v2':
            raise serializers.ValidationError('Unknown personality instrument.')

        dimensions = value.get('dimensions')
        if not isinstance(dimensions, dict) or set(dimensions) != PERSONALITY_DIMENSION_IDS:
            raise serializers.ValidationError('All five personality dimensions are required.')

        normalized_dimensions = {}
        for dimension_id in PERSONALITY_DIMENSION_IDS:
            dimension = dimensions.get(dimension_id)
            if not isinstance(dimension, dict):
                raise serializers.ValidationError(f'Invalid {dimension_id} dimension.')
            try:
                score = float(dimension.get('score'))
                consistency = float(dimension.get('consistency'))
            except (TypeError, ValueError):
                raise serializers.ValidationError(f'Invalid {dimension_id} scores.')
            signal_strength = dimension.get('signalStrength')
            if not 1 <= score <= 5:
                raise serializers.ValidationError(f'{dimension_id} score must be between 1 and 5.')
            if not 0 <= consistency <= 1:
                raise serializers.ValidationError(f'{dimension_id} consistency must be between 0 and 1.')
            if signal_strength not in PERSONALITY_SIGNAL_STRENGTHS:
                raise serializers.ValidationError(f'Invalid {dimension_id} signal strength.')
            normalized_dimensions[dimension_id] = {
                'score': round(score, 2),
                'consistency': round(consistency, 2),
                'signalStrength': signal_strength,
            }

        return {
            'schemaVersion': 2,
            'instrument': 'aurora-personality-v2',
            'dimensions': normalized_dimensions,
            'updatedAt': value.get('updatedAt'),
        }

    def validate(self, attrs):
        if attrs.get('type') in {CheckIn.CheckInType.INITIAL, 'personality'} and not attrs.get('personality'):
            raise serializers.ValidationError({
                'personality': 'The initial assessment requires personalization responses.',
            })
        return attrs


class CheckInReadSerializer(serializers.ModelSerializer):
    qIds = serializers.ListField(source='question_ids')
    date = serializers.DateField(source='check_in_date')

    class Meta:
        model = CheckIn
        fields = ['id', 'type', 'date', 'qIds', 'scores']
