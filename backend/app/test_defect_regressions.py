from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.routes.peer import _color
from app.models import (
    ChatUsage,
    Conversation,
    JournalDoodle,
    LibraryProgress,
    Message,
    TherapistAppointment,
    TherapistBooking,
    TherapistMatch,
)


class AuthenticatedAPITestCase(TestCase):
    username = 'regression-user'

    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username=self.username,
            password='testpass123',
        )
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')


class ChatDefectRegressionTests(AuthenticatedAPITestCase):
    @patch('api.routes.chat.generate_chat_reply')
    def test_failed_generation_does_not_store_message_or_consume_allowance(self, generate):
        generate.side_effect = RuntimeError('provider unavailable')

        response = self.client.post(reverse('chat'), {'message': 'Please help.'}, format='json')

        self.assertEqual(response.status_code, 502)
        self.assertEqual(Message.objects.count(), 0)
        self.assertEqual(ChatUsage.objects.get(user=self.user).message_count, 0)

    @patch('api.routes.chat.generate_chat_reply')
    def test_database_usage_limit_is_enforced(self, generate):
        ChatUsage.objects.create(user=self.user, message_count=200)

        response = self.client.post(reverse('chat'), {'message': 'One more.'}, format='json')

        self.assertEqual(response.status_code, 429)
        generate.assert_not_called()

    def test_history_returns_newest_one_hundred_messages_in_chronological_order(self):
        conversation = Conversation.objects.create(
            user=self.user,
            type=Conversation.ConversationType.AI,
        )
        for index in range(110):
            Message.objects.create(
                conversation=conversation,
                role=Message.MessageRole.USER,
                content=f'message-{index}',
            )

        response = self.client.get(reverse('chat'))

        contents = [item['content'] for item in response.data['messages']]
        self.assertEqual(len(contents), 100)
        self.assertEqual(contents[0], 'message-10')
        self.assertEqual(contents[-1], 'message-109')


class JournalDefectRegressionTests(AuthenticatedAPITestCase):
    def test_doodle_round_trips_and_can_be_cleared(self):
        create_response = self.client.post(
            reverse('journal'),
            {'date': '2026-08-30', 'content': 'A sketch', 'doodleData': 'data:image/png;base64,abc'},
            format='json',
        )

        self.assertEqual(create_response.status_code, 200)
        self.assertEqual(create_response.data['entry']['doodleData'], 'data:image/png;base64,abc')
        self.assertEqual(JournalDoodle.objects.count(), 1)

        clear_response = self.client.post(
            reverse('journal'),
            {'date': '2026-08-30', 'doodleData': None},
            format='json',
        )

        self.assertEqual(clear_response.status_code, 200)
        self.assertIsNone(clear_response.data['entry']['doodleData'])
        self.assertEqual(JournalDoodle.objects.count(), 0)

    def test_privacy_controls_persist(self):
        response = self.client.patch(
            reverse('journal-privacy'),
            {'allowChatAccess': True, 'allowJournalAccess': True},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['allowChatAccess'])
        self.assertTrue(response.data['allowJournalAccess'])
        self.assertTrue(self.client.get(reverse('journal-privacy')).data['allowChatAccess'])

    def test_privacy_rejects_non_boolean_values(self):
        response = self.client.patch(
            reverse('journal-privacy'),
            {'allowChatAccess': 'yes'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)


class LibraryProgressRegressionTests(AuthenticatedAPITestCase):
    def test_model_streak_is_idempotent_and_resets_after_a_gap(self):
        progress = LibraryProgress.objects.create(user=self.user)

        progress.record_completion(date(2026, 8, 28))
        progress.record_completion(date(2026, 8, 28))
        self.assertEqual(progress.streak, 1)
        progress.record_completion(date(2026, 8, 29))
        self.assertEqual(progress.streak, 2)
        progress.record_completion(date(2026, 8, 31))
        self.assertEqual(progress.streak, 1)

    def test_quiz_completion_is_persisted_and_same_day_is_idempotent(self):
        first = self.client.post(reverse('library-progress'), {}, format='json')
        second = self.client.post(reverse('library-progress'), {}, format='json')

        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.data['streak'], 1)
        self.assertEqual(second.data['streak'], 1)
        self.assertEqual(self.client.get(reverse('library-progress')).data['streak'], 1)


class TherapistPersistenceRegressionTests(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        self.match = TherapistMatch.objects.create(user=self.user, therapist_id=7)

    def test_booking_request_is_persisted_for_the_owned_match(self):
        response = self.client.post(
            reverse('therapist-bookings', args=[self.match.id]),
            {'insuranceProvider': 'Aetna', 'memberId': 'ABC123'},
            format='json',
        )

        booking = TherapistBooking.objects.get()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(booking.user, self.user)
        self.assertEqual(booking.therapist_id, self.match.therapist_id)
        self.assertEqual(response.data['status'], 'requested')

    def test_booking_cannot_target_another_users_match(self):
        other = get_user_model().objects.create_user(username='other-booking-user')
        other_match = TherapistMatch.objects.create(user=other, therapist_id=3)

        response = self.client.post(
            reverse('therapist-bookings', args=[other_match.id]),
            {},
            format='json',
        )

        self.assertEqual(response.status_code, 404)
        self.assertFalse(TherapistBooking.objects.exists())

    def test_future_appointment_is_persisted_and_returned(self):
        scheduled_for = timezone.now() + timedelta(days=2)

        response = self.client.post(
            reverse('therapist-appointments', args=[self.match.id]),
            {
                'title': 'Initial consultation',
                'scheduledFor': scheduled_for.isoformat(),
                'description': 'Discuss goals',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(TherapistAppointment.objects.count(), 1)
        listed = self.client.get(reverse('therapist-appointments', args=[self.match.id]))
        self.assertEqual(listed.data['appointments'][0]['title'], 'Initial consultation')

    def test_past_appointment_is_rejected(self):
        response = self.client.post(
            reverse('therapist-appointments', args=[self.match.id]),
            {
                'title': 'Past consultation',
                'scheduledFor': (timezone.now() - timedelta(days=1)).isoformat(),
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(TherapistAppointment.objects.exists())


class PeerColorRegressionTests(TestCase):
    def test_generated_peer_color_is_stable(self):
        self.assertEqual(_color('CalmRiver17'), _color('CalmRiver17'))
        self.assertEqual(_color('CalmRiver17'), '#1d4ed8')
