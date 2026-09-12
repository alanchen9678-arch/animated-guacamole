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
    CheckIn,
    Conversation,
    JournalPrivacySettings,
    JournalDoodle,
    LibraryProgress,
    Message,
    ThoughtJournalEntry,
    TherapistAppointment,
    TherapistBooking,
    TherapistMatch,
    UserProfile,
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

    def test_booking_history_is_returned_and_outstanding_request_can_be_cancelled(self):
        older = TherapistBooking.objects.create(
            user=self.user,
            match=self.match,
            therapist_id=self.match.therapist_id,
            insurance_provider='Aetna',
        )
        newer = TherapistBooking.objects.create(
            user=self.user,
            match=self.match,
            therapist_id=self.match.therapist_id,
            insurance_provider='Cigna',
        )

        cancelled = self.client.patch(
            reverse('therapist-booking-detail', args=[self.match.id, newer.id]),
            {'status': 'cancelled'},
            format='json',
        )
        listed = self.client.get(reverse('therapist-bookings', args=[self.match.id]))

        self.assertEqual(cancelled.status_code, 200)
        self.assertEqual(cancelled.data['status'], 'cancelled')
        self.assertEqual([item['id'] for item in listed.data['bookings']], [newer.id, older.id])
        self.assertEqual(listed.data['bookings'][0]['status'], 'cancelled')

        self.match.refresh_from_db()
        active_matches = self.client.get(reverse('therapist-matches'))
        self.assertFalse(self.match.is_active)
        self.assertEqual(active_matches.data['matches'], [])
        self.assertEqual(active_matches.data['therapistIds'], [])

        reactivated = self.client.post(
            reverse('therapist-matches'),
            {'therapistId': self.match.therapist_id},
            format='json',
        )
        self.match.refresh_from_db()
        self.assertEqual(reactivated.status_code, 200)
        self.assertTrue(self.match.is_active)
        self.assertEqual(reactivated.data['match']['id'], self.match.id)
        self.assertEqual(TherapistBooking.objects.filter(match=self.match).count(), 2)

    def test_confirmed_booking_request_cannot_be_cancelled(self):
        booking = TherapistBooking.objects.create(
            user=self.user,
            match=self.match,
            therapist_id=self.match.therapist_id,
            status=TherapistBooking.Status.CONFIRMED,
        )

        response = self.client.patch(
            reverse('therapist-booking-detail', args=[self.match.id, booking.id]),
            {'status': 'cancelled'},
            format='json',
        )

        self.assertEqual(response.status_code, 409)
        booking.refresh_from_db()
        self.assertEqual(booking.status, TherapistBooking.Status.CONFIRMED)

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
        self.assertEqual(response.data['durationMinutes'], 50)
        self.assertEqual(response.data['timezone'], 'UTC')
        self.assertEqual(response.data['status'], 'confirmed')
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

    def test_duplicate_and_overlapping_appointments_are_rejected_but_adjacent_is_allowed(self):
        scheduled_for = timezone.now() + timedelta(days=3)
        first = self.client.post(
            reverse('therapist-appointments', args=[self.match.id]),
            {
                'title': 'First session',
                'scheduledFor': scheduled_for.isoformat(),
                'durationMinutes': 50,
                'timezone': 'America/Chicago',
            },
            format='json',
        )
        duplicate = self.client.post(
            reverse('therapist-appointments', args=[self.match.id]),
            {
                'title': 'Duplicate',
                'scheduledFor': scheduled_for.isoformat(),
                'durationMinutes': 50,
                'timezone': 'America/Chicago',
            },
            format='json',
        )
        overlap = self.client.post(
            reverse('therapist-appointments', args=[self.match.id]),
            {
                'title': 'Overlap',
                'scheduledFor': (scheduled_for + timedelta(minutes=30)).isoformat(),
                'durationMinutes': 50,
                'timezone': 'America/Chicago',
            },
            format='json',
        )
        adjacent = self.client.post(
            reverse('therapist-appointments', args=[self.match.id]),
            {
                'title': 'Adjacent',
                'scheduledFor': (scheduled_for + timedelta(minutes=50)).isoformat(),
                'durationMinutes': 50,
                'timezone': 'America/Chicago',
            },
            format='json',
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(overlap.status_code, 409)
        self.assertEqual(overlap.data['conflict']['title'], 'First session')
        self.assertEqual(adjacent.status_code, 201)

    def test_appointment_can_be_edited_and_soft_cancelled(self):
        appointment = TherapistAppointment.objects.create(
            user=self.user,
            match=self.match,
            title='Consultation',
            scheduled_for=timezone.now() + timedelta(days=2),
        )
        moved_to = timezone.now() + timedelta(days=4)

        edited = self.client.patch(
            reverse('therapist-appointment-detail', args=[self.match.id, appointment.id]),
            {
                'title': 'Follow-up',
                'scheduledFor': moved_to.isoformat(),
                'durationMinutes': 75,
                'timezone': 'America/New_York',
            },
            format='json',
        )
        cancelled = self.client.patch(
            reverse('therapist-appointment-detail', args=[self.match.id, appointment.id]),
            {'status': 'cancelled'},
            format='json',
        )
        listed = self.client.get(reverse('therapist-appointments', args=[self.match.id]))

        self.assertEqual(edited.status_code, 200)
        self.assertEqual(edited.data['title'], 'Follow-up')
        self.assertEqual(edited.data['durationMinutes'], 75)
        self.assertEqual(cancelled.status_code, 200)
        self.assertEqual(cancelled.data['status'], 'cancelled')
        self.assertEqual(listed.data['appointments'][0]['status'], 'cancelled')

    def test_appointment_edit_cannot_move_into_an_occupied_time(self):
        occupied_time = timezone.now() + timedelta(days=5)
        TherapistAppointment.objects.create(
            user=self.user,
            match=self.match,
            title='Occupied',
            scheduled_for=occupied_time,
            duration_minutes=60,
        )
        movable = TherapistAppointment.objects.create(
            user=self.user,
            match=self.match,
            title='Movable',
            scheduled_for=occupied_time + timedelta(hours=3),
            duration_minutes=50,
        )

        response = self.client.patch(
            reverse('therapist-appointment-detail', args=[self.match.id, movable.id]),
            {'scheduledFor': (occupied_time + timedelta(minutes=15)).isoformat()},
            format='json',
        )

        self.assertEqual(response.status_code, 409)
        movable.refresh_from_db()
        self.assertEqual(movable.title, 'Movable')
        self.assertEqual(movable.scheduled_for, occupied_time + timedelta(hours=3))

    def test_sharing_preview_returns_only_records_allowed_by_privacy_settings(self):
        UserProfile.objects.create(
            user=self.user,
            needs_profile={'basis': 'initial_assessment', 'overall': 42},
        )
        checkin = CheckIn.objects.create(
            user=self.user,
            type=CheckIn.CheckInType.INITIAL,
            scores={'anxiety': 40},
        )
        ThoughtJournalEntry.objects.create(
            user=self.user,
            content='A journal entry I chose to share.',
            mood='calm',
        )
        conversation = Conversation.objects.create(user=self.user, type=Conversation.ConversationType.AI)
        Message.objects.create(
            conversation=conversation,
            role=Message.MessageRole.USER,
            content='A recent AI chat message.',
        )
        JournalPrivacySettings.objects.update_or_create(
            user=self.user,
            defaults={'allow_therapist_access': True, 'allow_chat_access': False},
        )

        response = self.client.get(reverse('therapist-sharing-preview'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['checkIns'][0]['id'], checkin.id)
        self.assertEqual(response.data['journal']['entries'][0]['content'], 'A journal entry I chose to share.')
        self.assertTrue(response.data['journal']['allowed'])
        self.assertFalse(response.data['chat']['allowed'])
        self.assertEqual(response.data['chat']['messages'], [])

        settings = JournalPrivacySettings.objects.get(user=self.user)
        settings.allow_chat_access = True
        settings.save(update_fields=['allow_chat_access'])
        shared_chat = self.client.get(reverse('therapist-sharing-preview'))
        self.assertTrue(shared_chat.data['chat']['allowed'])
        self.assertEqual(shared_chat.data['chat']['messages'][0]['content'], 'A recent AI chat message.')
        self.assertEqual(shared_chat.data['chat']['messages'][0]['userId'], self.user.id)


class PeerColorRegressionTests(TestCase):
    def test_generated_peer_color_is_stable(self):
        self.assertEqual(_color('CalmRiver17'), _color('CalmRiver17'))
        self.assertEqual(_color('CalmRiver17'), '#1d4ed8')
