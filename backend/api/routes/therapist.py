from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializers.therapist import TherapistMatchReadSerializer, TherapistMatchWriteSerializer
from app.models import TherapistMatch


class TherapistMatchCollectionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        matches = request.user.therapist_matches.order_by('created_at', 'id')
        serialized = TherapistMatchReadSerializer(matches, many=True).data
        return Response(
            {
                'matches': serialized,
                'therapistIds': [item['therapistId'] for item in serialized],
            }
        )

    def post(self, request):
        serializer = TherapistMatchWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        match, _ = TherapistMatch.objects.get_or_create(
            user=request.user,
            therapist_id=serializer.validated_data['therapistId'],
        )

        matches = request.user.therapist_matches.order_by('created_at', 'id')
        serialized = TherapistMatchReadSerializer(matches, many=True).data
        return Response(
            {
                'match': TherapistMatchReadSerializer(match).data,
                'matches': serialized,
                'therapistIds': [item['therapistId'] for item in serialized],
            }
        )
