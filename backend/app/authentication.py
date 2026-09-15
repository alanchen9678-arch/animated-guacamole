from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed


class ExpiringTokenAuthentication(TokenAuthentication):
    """DRF token authentication with a bounded server-side lifetime."""

    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)
        lifetime = timedelta(hours=settings.AUTH_TOKEN_TTL_HOURS)
        if token.created < timezone.now() - lifetime:
            token.delete()
            raise AuthenticationFailed('Session expired. Please sign in again.')
        return user, token
