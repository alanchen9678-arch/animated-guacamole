import logging

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.db.models import Q
from rest_framework import status
from rest_framework import serializers
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import UserProfile, get_user_checkin_summary, update_user_profile_insights

security_logger = logging.getLogger('dawn-harbor.security')


class MeUpdateSerializer(serializers.Serializer):
    firstName = serializers.CharField(required=False, allow_blank=True, max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True, max_length=254)
    mood = serializers.ChoiceField(
        required=False,
        allow_blank=True,
        choices=['calm', 'anxious', 'sad', 'happy', 'stressed', 'grateful', 'tired', 'hopeful'],
    )
    displayName = serializers.CharField(required=False, allow_blank=True, max_length=50)
    bio = serializers.CharField(required=False, allow_blank=True, max_length=500)
    avatarColor = serializers.RegexField(required=False, regex=r'^#[0-9a-fA-F]{6}$')


def _rotate_token(user):
    with transaction.atomic():
        Token.objects.filter(user=user).delete()
        return Token.objects.create(user=user)


def _user_payload(user):
    profile = update_user_profile_insights(user)
    checkin_summary = get_user_checkin_summary(user)
    latest_journal_entry = (
        user.thought_journal_entries
        .filter(Q(content__gt='') | Q(doodles__isnull=False))
        .distinct()
        .order_by('-entry_date', '-created_at', '-id')
        .first()
    )
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'firstName': user.first_name,
        'plan': profile.plan,
        'streak': checkin_summary['streak'],
        'mood': profile.mood,
        'displayName': profile.display_name,
        'bio': profile.bio,
        'avatarColor': profile.avatar_color,
        'anonymousName': profile.anonymous_name or '',
        'isPeerOnboarded': profile.is_peer_onboarded,
        'needsProfile': profile.needs_profile,
        'hasInitialAssessment': checkin_summary['has_initial_assessment'],
        'hasCurrentPersonalityAssessment': checkin_summary['has_current_personality_assessment'],
        'lastCheckInDate': checkin_summary['last_check_in_date'],
        'lastWeeklyCheckInDate': checkin_summary['last_weekly_check_in_date'],
        'checkInDueThisWeek': checkin_summary['due_this_week'],
        'weeklyCheckInDueSince': checkin_summary['weekly_due_since'],
        'lastJournalEntryDate': latest_journal_entry.entry_date if latest_journal_entry else None,
    }


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'register'

    @transaction.atomic
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
        if User.objects.filter(username=username).exists():
            return Response(
                {'error': 'Username already taken.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        candidate = User(
            username=username,
            email=email,
            first_name=first_name,
        )
        try:
            User._meta.get_field('username').run_validators(username)
            if email:
                validate_email(email)
            validate_password(password, candidate)
        except DjangoValidationError as exc:
            return Response(
                {'error': ' '.join(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        candidate.set_password(password)
        candidate.save()
        user = candidate
        UserProfile.objects.create(user=user)
        token = _rotate_token(user)
        security_logger.info('auth.register.success user_id=%s', user.id)
        return Response(
            {'token': token.key, 'user': _user_payload(user)},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        user = authenticate(username=username, password=password)
        if not user:
            security_logger.warning('auth.login.failed')
            return Response(
                {'error': 'Invalid username or password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token = _rotate_token(user)
        security_logger.info('auth.login.success user_id=%s', user.id)
        return Response({'token': token.key, 'user': _user_payload(user)})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.auth
        if isinstance(token, Token):
            token.delete()
        else:
            Token.objects.filter(user=request.user).delete()
        security_logger.info('auth.logout user_id=%s', request.user.id)
        return Response({'detail': 'Logged out.'})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(_user_payload(request.user))

    def patch(self, request):
        serializer = MeUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        user = request.user
        user_fields = []
        profile_fields = []

        if 'firstName' in values:
            user.first_name = values['firstName']
            user_fields.append('first_name')
        if 'email' in values:
            user.email = values['email']
            user_fields.append('email')
        if user_fields:
            user.save(update_fields=user_fields)

        if 'mood' in values:
            profile.mood = values['mood']
            profile_fields.append('mood')
        if 'displayName' in values:
            profile.display_name = values['displayName']
            profile_fields.append('display_name')
        if 'bio' in values:
            profile.bio = values['bio']
            profile_fields.append('bio')
        if 'avatarColor' in values:
            profile.avatar_color = values['avatarColor']
            profile_fields.append('avatar_color')
        if profile_fields:
            profile.save(update_fields=profile_fields)

        if user_fields or profile_fields:
            security_logger.info(
                'profile.updated user_id=%s fields=%s',
                request.user.id,
                ','.join([*user_fields, *profile_fields]),
            )
        return Response(_user_payload(request.user))
