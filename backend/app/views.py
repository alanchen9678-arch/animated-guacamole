from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserProfile, get_user_checkin_summary


def _user_payload(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    checkin_summary = get_user_checkin_summary(user)
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'firstName': user.first_name,
        'plan': profile.plan,
        'streak': checkin_summary['streak'],
        'mood': profile.mood,
        'lastCheckInDate': checkin_summary['last_check_in_date'],
        'checkInDueThisWeek': checkin_summary['due_this_week'],
    }


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '')
        first_name = request.data.get('firstName', '').strip()

        if not username or not password:
            return Response(
                {'error': 'Username and password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(username=username).exists():
            return Response(
                {'error': 'Username already taken.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
        )
        UserProfile.objects.create(user=user)
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {'token': token.key, 'user': _user_payload(user)},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        user = authenticate(username=username, password=password)
        if not user:
            return Response(
                {'error': 'Invalid username or password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': _user_payload(user)})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.user.auth_token.delete()
        return Response({'detail': 'Logged out.'})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(_user_payload(request.user))

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        user = request.user

        if 'firstName' in request.data:
            user.first_name = request.data['firstName'].strip()
            user.save(update_fields=['first_name'])
        if 'email' in request.data:
            user.email = request.data['email'].strip()
            user.save(update_fields=['email'])
        if 'mood' in request.data:
            profile.mood = request.data['mood']
            profile.save(update_fields=['mood'])

        return Response(_user_payload(request.user))
