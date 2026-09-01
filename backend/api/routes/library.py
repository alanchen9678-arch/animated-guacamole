from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from app.models import LibraryProgress


def serialize_library_progress(progress):
    return {
        'streak': progress.streak,
        'lastCompletedDate': (
            progress.last_completed_date.isoformat()
            if progress.last_completed_date
            else None
        ),
    }


class LibraryProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        progress, _ = LibraryProgress.objects.get_or_create(user=request.user)
        return Response(serialize_library_progress(progress))

    @transaction.atomic
    def post(self, request):
        request.user.__class__.objects.select_for_update().get(pk=request.user.pk)
        progress, _ = LibraryProgress.objects.select_for_update().get_or_create(user=request.user)
        progress.record_completion()
        return Response(
            serialize_library_progress(progress),
            status=status.HTTP_200_OK,
        )
