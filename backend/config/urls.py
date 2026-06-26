from django.contrib import admin
from django.urls import path

from api.routes.chat import ChatView
from api.routes.checkins import CheckInCollectionView
from api.routes.journal import JournalEntryCollectionView
from api.routes.peer import (
    PeerConnectView,
    PeerDMView,
    PeerListView,
    PeerProfileView,
    PeerRoomListView,
    PeerRoomMessageView,
)
from api.routes.therapist import TherapistMatchCollectionView
from app.views import LoginView, LogoutView, MeView, RegisterView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/chat/', ChatView.as_view(), name='chat'),
    path('api/checkins/', CheckInCollectionView.as_view(), name='checkins'),
    path('api/journal/', JournalEntryCollectionView.as_view(), name='journal'),
    path('api/auth/register/', RegisterView.as_view(), name='auth-register'),
    path('api/auth/login/', LoginView.as_view(), name='auth-login'),
    path('api/auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('api/auth/me/', MeView.as_view(), name='auth-me'),
    path('api/peer/profile/', PeerProfileView.as_view(), name='peer-profile'),
    path('api/peer/rooms/', PeerRoomListView.as_view(), name='peer-rooms'),
    path('api/peer/rooms/<int:room_id>/messages/', PeerRoomMessageView.as_view(), name='peer-room-messages'),
    path('api/peer/peers/', PeerListView.as_view(), name='peer-list'),
    path('api/peer/connect/<int:user_id>/', PeerConnectView.as_view(), name='peer-connect'),
    path('api/peer/dm/<int:user_id>/', PeerDMView.as_view(), name='peer-dm'),
    path('api/therapist/matches/', TherapistMatchCollectionView.as_view(), name='therapist-matches'),
]
