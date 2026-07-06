from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializers.checkins import CheckInReadSerializer, CheckInWriteSerializer
from app.models import CheckIn, get_user_checkin_summary, start_of_week, update_user_profile_insights


class CheckInCollectionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        checkins = request.user.checkins.order_by('check_in_date', 'created_at', 'id')
        summary = get_user_checkin_summary(request.user)
        return Response(
            {
                'history': CheckInReadSerializer(checkins, many=True).data,
                'streak': summary['streak'],
                'lastCheckInDate': summary['last_check_in_date'],
                'dueThisWeek': summary['due_this_week'],
                'hasInitialAssessment': summary['has_initial_assessment'],
            }
        )

    @transaction.atomic
    def post(self, request):
        serializer = CheckInWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        entry_type = serializer.validated_data['type']
        question_ids = serializer.validated_data.get('qIds', [])
        scores = serializer.validated_data.get('scores', {})
        personality = serializer.validated_data.get('personality')

        if entry_type == CheckIn.CheckInType.WEEKLY:
            today = timezone.localdate()
            week_start = start_of_week(today)
            checkin, _ = CheckIn.objects.update_or_create(
                user=request.user,
                type=CheckIn.CheckInType.WEEKLY,
                week_start_date=week_start,
                defaults={
                    'question_ids': question_ids,
                    'scores': scores,
                    'check_in_date': today,
                },
            )
        else:
            if request.user.checkins.filter(type=CheckIn.CheckInType.INITIAL).exists():
                return Response(
                    {'error': 'Initial assessment already completed.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            checkin = CheckIn.objects.create(
                user=request.user,
                type=CheckIn.CheckInType.INITIAL,
                question_ids=question_ids,
                scores=scores,
            )

        profile = update_user_profile_insights(
            request.user,
            personality=personality if entry_type == CheckIn.CheckInType.INITIAL else None,
        )
        checkins = request.user.checkins.order_by('check_in_date', 'created_at', 'id')
        summary = get_user_checkin_summary(request.user)
        return Response(
            {
                'entry': CheckInReadSerializer(checkin).data,
                'history': CheckInReadSerializer(checkins, many=True).data,
                'streak': summary['streak'],
                'lastCheckInDate': summary['last_check_in_date'],
                'dueThisWeek': summary['due_this_week'],
                'hasInitialAssessment': summary['has_initial_assessment'],
                'personality': profile.personality,
                'needsProfile': profile.needs_profile,
            }
        )
