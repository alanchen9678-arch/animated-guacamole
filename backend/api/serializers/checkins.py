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
CHECKIN_SCORE_KEYS = {'anxiety', 'loneliness', 'grief', 'burnout', 'stress', 'confidence'}


class CheckInWriteSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=[*CheckIn.CheckInType.choices, ('personality', 'Personality')])
    qIds = serializers.ListField(
        child=serializers.IntegerField(min_value=1, max_value=100000),
        required=False,
        allow_empty=True,
        default=list,
        max_length=100,
    )
    scores = serializers.DictField(
        child=serializers.IntegerField(min_value=0, max_value=100),
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
        question_ids = attrs.get('qIds', [])
        if len(question_ids) != len(set(question_ids)):
            raise serializers.ValidationError({'qIds': 'Question IDs must be unique.'})
        scores = attrs.get('scores', {})
        if len(scores) > len(CHECKIN_SCORE_KEYS) or set(scores) - CHECKIN_SCORE_KEYS:
            raise serializers.ValidationError({'scores': 'Unknown check-in score category.'})
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
