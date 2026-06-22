from django.contrib import admin
from django.urls import path

from api.routes.chat import ChatView
from app.views import LoginView, LogoutView, MeView, RegisterView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/chat/', ChatView.as_view(), name='chat'),
    path('api/auth/register/', RegisterView.as_view(), name='auth-register'),
    path('api/auth/login/', LoginView.as_view(), name='auth-login'),
    path('api/auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('api/auth/me/', MeView.as_view(), name='auth-me'),
]
