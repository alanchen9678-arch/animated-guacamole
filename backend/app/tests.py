from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from unittest.mock import patch
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import (
    CheckIn,
    Conversation,
    JournalDoodle,
    JournalPrivacySettings,
    Message,
    PeerConnection,
    PeerDM,
    PeerRoom,
    PeerRoomMessage,
    UserProfile,
    TherapistMatch,
    ThoughtJournalEntry,
    get_user_checkin_summary,
    update_user_profile_insights,
)


class ConversationModelTests(TestCase):
    def setUp(self):
        # Each conversation test gets its own user in the isolated test database.
        self.user = get_user_model().objects.create_user(
            username='aurora-user',
            password='testpass123',
        )

    def test_conversation_can_be_created_for_each_supported_type(self):
        # The app supports AI, therapist, and peer conversations for a user.
        ai_conversation = Conversation.objects.create(
            user=self.user,
            type=Conversation.ConversationType.AI,
        )
        therapist_conversation = Conversation.objects.create(
            user=self.user,
            type=Conversation.ConversationType.THERAPIST,
        )
        peer_conversation = Conversation.objects.create(
            user=self.user,
            type=Conversation.ConversationType.PEER,
        )

        self.assertEqual(ai_conversation.type, 'ai')
        self.assertEqual(therapist_conversation.type, 'therapist')
        self.assertEqual(peer_conversation.type, 'peer')
        self.assertEqual(self.user.conversations.count(), 3)

    def test_messages_are_attached_to_conversation_in_timestamp_order(self):
        # Messages should stay linked to their conversation and come back oldest first.
        conversation = Conversation.objects.create(
            user=self.user,
            type=Conversation.ConversationType.AI,
        )
        first_message = Message.objects.create(
            conversation=conversation,
            role=Message.MessageRole.USER,
            content='Hello there',
        )
        second_message = Message.objects.create(
            conversation=conversation,
            role=Message.MessageRole.ASSISTANT,
            content='Hi, how can I help?',
        )

        messages = list(conversation.messages.all())

        self.assertEqual(messages, [first_message, second_message])
        self.assertEqual(messages[0].role, 'user')
        self.assertEqual(messages[1].role, 'assistant')


class JournalModelTests(TestCase):
    def setUp(self):
        # Use a fresh user so journal ownership and defaults can be tested cleanly.
        self.user = get_user_model().objects.create_user(
            username='journal-user',
            password='testpass123',
        )

    def test_thought_journal_entries_are_owned_by_user(self):
        # A journal entry should belong to the user who created it.
        entry = ThoughtJournalEntry.objects.create(
            user=self.user,
            title='Evening reflection',
            content='Today felt more manageable after my walk.',
        )

        self.assertEqual(entry.user, self.user)
        self.assertEqual(self.user.thought_journal_entries.count(), 1)
        self.assertEqual(entry.title, 'Evening reflection')

    def test_doodle_can_be_linked_to_entry_and_user(self):
        # Doodles should stay connected to both the entry and the authoring user.
        entry = ThoughtJournalEntry.objects.create(
            user=self.user,
            content='Sketching helped me slow down.',
        )
        doodle = JournalDoodle.objects.create(
            user=self.user,
            entry=entry,
            doodle_data='data:image/png;base64,abc123',
        )

        self.assertEqual(doodle.user, self.user)
        self.assertEqual(doodle.entry, entry)
        self.assertEqual(entry.doodles.count(), 1)

    def test_journal_privacy_settings_default_to_no_external_access(self):
        # New privacy settings should start locked down by default.
        privacy = JournalPrivacySettings.objects.create(user=self.user)

        self.assertFalse(privacy.allow_ai_access)
        self.assertFalse(privacy.allow_therapist_access)

    def test_journal_entry_can_store_mood_for_the_day(self):
        # Mood tracking is optional metadata stored alongside the journal entry.
        entry = ThoughtJournalEntry.objects.create(
            user=self.user,
            content='Today felt steadier.',
            mood='calm',
        )

        self.assertEqual(entry.mood, 'calm')


class CheckInModelTests(TestCase):
    def setUp(self):
        # Each check-in test gets a clean user so streak math is deterministic.
        self.user = get_user_model().objects.create_user(
            username='checkin-user',
            password='testpass123',
        )

    def test_weekly_checkin_sets_monday_week_start(self):
        # Weekly check-ins are grouped by the Monday that starts their week.
        checkin = CheckIn.objects.create(
            user=self.user,
            type=CheckIn.CheckInType.WEEKLY,
            check_in_date=date(2026, 6, 24),  # Wednesday
            question_ids=[1, 2],
            scores={'stress': 55},
        )

        self.assertEqual(checkin.week_start_date, date(2026, 6, 22))

    def test_streak_counts_consecutive_monday_sunday_weeks(self):
        # Consecutive weekly check-ins should build an active streak and clear the due flag.
        CheckIn.objects.create(
            user=self.user,
            type=CheckIn.CheckInType.WEEKLY,
            check_in_date=date(2026, 6, 8),
        )
        CheckIn.objects.create(
            user=self.user,
            type=CheckIn.CheckInType.WEEKLY,
            check_in_date=date(2026, 6, 15),
        )
        CheckIn.objects.create(
            user=self.user,
            type=CheckIn.CheckInType.WEEKLY,
            check_in_date=date(2026, 6, 22),
        )

        summary = get_user_checkin_summary(self.user, today=date(2026, 6, 24))

        self.assertEqual(summary['streak'], 3)
        self.assertFalse(summary['due_this_week'])
        self.assertEqual(summary['last_check_in_date'], date(2026, 6, 22))

    def test_missing_entire_week_resets_streak(self):
        # Missing a full week should break the streak and mark the next check-in as due.
        CheckIn.objects.create(
            user=self.user,
            type=CheckIn.CheckInType.WEEKLY,
            check_in_date=date(2026, 6, 8),
        )
        CheckIn.objects.create(
            user=self.user,
            type=CheckIn.CheckInType.WEEKLY,
            check_in_date=date(2026, 6, 15),
        )

        summary = get_user_checkin_summary(self.user, today=date(2026, 6, 30))

        self.assertEqual(summary['streak'], 0)
        self.assertTrue(summary['due_this_week'])


class TherapistMatchModelTests(TestCase):
    def setUp(self):
        # Use a separate user so therapist matches are verified per account.
        self.user = get_user_model().objects.create_user(
            username='therapist-match-user',
            password='testpass123',
        )

    def test_saved_therapist_match_is_owned_by_user(self):
        # Saved matches should stay attached to the user who selected them.
        match = TherapistMatch.objects.create(
            user=self.user,
            therapist_id=3,
        )

        self.assertEqual(match.user, self.user)
        self.assertEqual(match.therapist_id, 3)
        self.assertEqual(self.user.therapist_matches.count(), 1)

    def test_therapist_conversation_can_link_to_saved_match(self):
        match = TherapistMatch.objects.create(
            user=self.user,
            therapist_id=7,
        )
        conversation = Conversation.objects.create(
            user=self.user,
            type=Conversation.ConversationType.THERAPIST,
            therapist_match=match,
        )

        self.assertEqual(conversation.therapist_match, match)


class TherapistMatchAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username='therapist-api-user',
            password='testpass123',
        )
        token, _ = Token.objects.get_or_create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_therapist_match_messages_require_existing_match(self):
        response = self.client.get(reverse('therapist-match-messages', args=[9999]))

        self.assertEqual(response.status_code, 404)

    def test_therapist_match_messages_bootstrap_conversation_history(self):
        match = TherapistMatch.objects.create(user=self.user, therapist_id=2)

        response = self.client.get(reverse('therapist-match-messages', args=[match.id]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['therapistId'], 2)
        self.assertEqual(len(response.data['messages']), 1)
        self.assertEqual(response.data['messages'][0]['role'], 'therapist')
        self.assertTrue(self.user.conversations.filter(therapist_match=match).exists())

    def test_therapist_match_messages_store_user_and_therapist_replies(self):
        match = TherapistMatch.objects.create(user=self.user, therapist_id=4)

        response = self.client.post(
            reverse('therapist-match-messages', args=[match.id]),
            {'message': 'I have been feeling burned out.'},
            format='json',
        )

        conversation = self.user.conversations.get(therapist_match=match)
        stored_roles = list(conversation.messages.values_list('role', flat=True))

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['userMessage']['role'], 'user')
        self.assertEqual(response.data['userMessage']['content'], 'I have been feeling burned out.')
        self.assertEqual(response.data['replyMessage']['role'], 'therapist')
        self.assertEqual(stored_roles, ['therapist', 'user', 'therapist'])


class AuthAPITests(TestCase):
    def setUp(self):
        # Use a dedicated API client so requests can be made against the auth endpoints.
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username='auth-user',
            email='auth@example.com',
            password='testpass123',
            first_name='Avery',
        )

    def test_register_creates_user_and_returns_token_payload(self):
        # Registration should create a new account and immediately return auth data for the frontend.
        response = self.client.post(
            reverse('auth-register'),
            {
                'username': 'new-user',
                'email': 'new@example.com',
                'password': 'securepass123',
                'firstName': 'Jordan',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['username'], 'new-user')
        self.assertEqual(response.data['user']['firstName'], 'Jordan')
        self.assertFalse(response.data['user']['hasInitialAssessment'])
        self.assertTrue(get_user_model().objects.filter(username='new-user').exists())

    def test_register_rejects_duplicate_username(self):
        # Usernames must be unique so the endpoint should fail cleanly on duplicates.
        response = self.client.post(
            reverse('auth-register'),
            {
                'username': 'auth-user',
                'password': 'securepass123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], 'Username already taken.')

    def test_login_returns_existing_user_token(self):
        # A valid login should return a reusable token and the normalized user payload.
        response = self.client.post(
            reverse('auth-login'),
            {
                'username': 'auth-user',
                'password': 'testpass123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['username'], 'auth-user')
        self.assertEqual(response.data['user']['email'], 'auth@example.com')

    def test_login_rejects_invalid_password(self):
        # Invalid credentials should not authenticate or leak alternate failure details.
        response = self.client.post(
            reverse('auth-login'),
            {
                'username': 'auth-user',
                'password': 'wrongpass',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data['error'], 'Invalid username or password.')

    def test_me_requires_authentication(self):
        # Profile reads should be protected so anonymous callers cannot fetch user data.
        response = self.client.get(reverse('auth-me'))

        self.assertEqual(response.status_code, 401)

    def test_me_returns_authenticated_user_payload(self):
        # Once authenticated, the frontend should get the current user's profile snapshot.
        token, _ = Token.objects.get_or_create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        response = self.client.get(reverse('auth-me'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['username'], 'auth-user')
        self.assertEqual(response.data['firstName'], 'Avery')
        self.assertIn('personality', response.data)
        self.assertIn('needsProfile', response.data)
        self.assertFalse(response.data['hasInitialAssessment'])

    def test_me_patch_updates_user_and_profile_fields(self):
        # Profile edits should persist both built-in user fields and custom profile metadata.
        token, _ = Token.objects.get_or_create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        response = self.client.patch(
            reverse('auth-me'),
            {
                'firstName': 'River',
                'email': 'river@example.com',
                'mood': 'calm',
                'displayName': 'River Stone',
                'bio': 'Taking things one day at a time.',
                'avatarColor': '#123456',
            },
            format='json',
        )

        self.user.refresh_from_db()
        self.user.profile.refresh_from_db()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.user.first_name, 'River')
        self.assertEqual(self.user.email, 'river@example.com')
        self.assertEqual(self.user.profile.mood, 'calm')
        self.assertEqual(self.user.profile.display_name, 'River Stone')
        self.assertEqual(self.user.profile.bio, 'Taking things one day at a time.')
        self.assertEqual(self.user.profile.avatar_color, '#123456')


class CheckInAPITests(TestCase):
    def setUp(self):
        # Authenticate a client once so the check-in endpoint tests stay focused on API behavior.
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username='checkin-api-user',
            password='testpass123',
        )
        token, _ = Token.objects.get_or_create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_checkin_history_requires_authentication(self):
        # Check-in history is private and should not be visible to anonymous callers.
        anonymous_client = APIClient()

        response = anonymous_client.get(reverse('checkins'))

        self.assertEqual(response.status_code, 401)

    def test_get_checkins_returns_only_current_users_history_and_summary(self):
        # The history endpoint should return the signed-in user's data along with summary fields.
        other_user = get_user_model().objects.create_user(
            username='someone-else',
            password='testpass123',
        )
        CheckIn.objects.create(
            user=self.user,
            type=CheckIn.CheckInType.INITIAL,
            question_ids=[1, 2],
            scores={'stress': 20},
        )
        CheckIn.objects.create(
            user=other_user,
            type=CheckIn.CheckInType.INITIAL,
            question_ids=[99],
            scores={'stress': 99},
        )

        response = self.client.get(reverse('checkins'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['history']), 1)
        self.assertEqual(response.data['history'][0]['qIds'], [1, 2])
        self.assertTrue(response.data['hasInitialAssessment'])

    def test_post_initial_checkin_creates_entry_and_updates_history(self):
        # Posting an initial assessment should create a new entry and include it in the response.
        response = self.client.post(
            reverse('checkins'),
            {
                'type': CheckIn.CheckInType.INITIAL,
                'qIds': [1, 2, 3],
                'scores': {'stress': 44, 'sleep': 72},
                'personality': {
                    'id': 'architect',
                    'name': 'The Architect',
                    'category': 'Thinker',
                },
            },
            format='json',
        )

        self.user.profile.refresh_from_db()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['entry']['type'], CheckIn.CheckInType.INITIAL)
        self.assertEqual(response.data['entry']['qIds'], [1, 2, 3])
        self.assertTrue(response.data['hasInitialAssessment'])
        self.assertEqual(self.user.checkins.count(), 1)
        self.assertEqual(self.user.profile.personality['id'], 'architect')
        self.assertEqual(self.user.profile.needs_profile['basis'], 'initial_assessment')
        self.assertEqual(self.user.profile.needs_profile['concerns']['stress'], 44)

    def test_needs_profile_uses_initial_assessment_until_five_weeklies_exist(self):
        CheckIn.objects.create(
            user=self.user,
            type=CheckIn.CheckInType.INITIAL,
            question_ids=[1, 2, 3],
            scores={
                'anxiety': 81,
                'loneliness': 33,
                'grief': 29,
                'burnout': 64,
                'stress': 72,
                'confidence': 55,
            },
        )

        for day, stress in ((date(2026, 6, 1), 20), (date(2026, 6, 8), 30), (date(2026, 6, 15), 40), (date(2026, 6, 22), 50)):
            CheckIn.objects.create(
                user=self.user,
                type=CheckIn.CheckInType.WEEKLY,
                check_in_date=day,
                scores={
                    'anxiety': 10,
                    'loneliness': 10,
                    'grief': 10,
                    'burnout': 10,
                    'stress': stress,
                    'confidence': 10,
                },
            )

        profile = update_user_profile_insights(self.user)

        self.assertEqual(profile.needs_profile['basis'], 'initial_assessment')
        self.assertEqual(profile.needs_profile['concerns']['stress'], 72)
        self.assertEqual(profile.needs_profile['concerns']['lowConfidence'], 55)

    def test_needs_profile_uses_average_of_last_five_weeklies(self):
        CheckIn.objects.create(
            user=self.user,
            type=CheckIn.CheckInType.INITIAL,
            question_ids=[1, 2, 3],
            scores={
                'anxiety': 99,
                'loneliness': 99,
                'grief': 99,
                'burnout': 99,
                'stress': 99,
                'confidence': 99,
            },
        )

        weekly_rows = [
            (date(2026, 5, 25), 10, 20),
            (date(2026, 6, 1), 20, 30),
            (date(2026, 6, 8), 30, 40),
            (date(2026, 6, 15), 40, 50),
            (date(2026, 6, 22), 50, 60),
            (date(2026, 6, 29), 90, 100),
        ]
        for day, stress, confidence in weekly_rows:
            CheckIn.objects.create(
                user=self.user,
                type=CheckIn.CheckInType.WEEKLY,
                check_in_date=day,
                scores={
                    'anxiety': 50,
                    'loneliness': 40,
                    'grief': 30,
                    'burnout': 20,
                    'stress': stress,
                    'confidence': confidence,
                },
            )

        profile = update_user_profile_insights(self.user)

        self.assertEqual(profile.needs_profile['basis'], 'weekly_average')
        self.assertEqual(profile.needs_profile['sources']['checkins'], 5)
        self.assertEqual(profile.needs_profile['concerns']['stress'], 46)
        self.assertEqual(profile.needs_profile['concerns']['lowConfidence'], 56)

    def test_post_initial_checkin_rejects_second_initial_assessment(self):
        CheckIn.objects.create(
            user=self.user,
            type=CheckIn.CheckInType.INITIAL,
            question_ids=[1, 2],
            scores={'stress': 44},
        )

        response = self.client.post(
            reverse('checkins'),
            {
                'type': CheckIn.CheckInType.INITIAL,
                'qIds': [3, 4],
                'scores': {'stress': 72},
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], 'Initial assessment already completed.')
        self.assertEqual(self.user.checkins.filter(type=CheckIn.CheckInType.INITIAL).count(), 1)

    def test_post_weekly_checkin_reuses_current_week_entry(self):
        # Weekly submissions should update the same week instead of creating duplicate weekly records.
        first_response = self.client.post(
            reverse('checkins'),
            {
                'type': CheckIn.CheckInType.WEEKLY,
                'qIds': [1],
                'scores': {'stress': 20},
            },
            format='json',
        )
        second_response = self.client.post(
            reverse('checkins'),
            {
                'type': CheckIn.CheckInType.WEEKLY,
                'qIds': [2, 3],
                'scores': {'stress': 65},
            },
            format='json',
        )

        weekly_entries = self.user.checkins.filter(type=CheckIn.CheckInType.WEEKLY)

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(weekly_entries.count(), 1)
        self.assertEqual(second_response.data['entry']['qIds'], [2, 3])
        self.assertEqual(second_response.data['entry']['scores'], {'stress': 65})

    def test_post_checkin_rejects_invalid_type(self):
        # Serializer validation should reject unsupported check-in types before any data is saved.
        response = self.client.post(
            reverse('checkins'),
            {
                'type': 'daily',
                'qIds': [1],
                'scores': {'stress': 20},
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(self.user.checkins.exists())


class JournalAPITests(TestCase):
    def setUp(self):
        # Journal API tests use an authenticated client because entries are user-private resources.
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username='journal-api-user',
            password='testpass123',
        )
        token, _ = Token.objects.get_or_create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_journal_history_requires_authentication(self):
        # Anonymous callers should not be able to browse someone else's private journal.
        anonymous_client = APIClient()

        response = anonymous_client.get(reverse('journal'))

        self.assertEqual(response.status_code, 401)

    def test_get_journal_returns_only_current_users_entries(self):
        # Journal list responses should include only the signed-in user's entries.
        other_user = get_user_model().objects.create_user(
            username='other-journal-user',
            password='testpass123',
        )
        ThoughtJournalEntry.objects.create(
            user=self.user,
            title='My entry',
            content='Today felt steady.',
            mood='calm',
        )
        ThoughtJournalEntry.objects.create(
            user=other_user,
            title='Other entry',
            content='This should stay private.',
            mood='anxious',
        )

        response = self.client.get(reverse('journal'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['entries']), 1)
        self.assertEqual(response.data['entries'][0]['title'], 'My entry')
        self.assertEqual(response.data['entries'][0]['text'], 'Today felt steady.')

    def test_post_journal_entry_creates_new_entry(self):
        # A valid journal submission should create a dated entry and echo it back to the frontend.
        response = self.client.post(
            reverse('journal'),
            {
                'date': '2026-06-29',
                'title': 'Evening reflection',
                'content': 'I felt more grounded after my walk.',
                'mood': 'calm',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['entry']['title'], 'Evening reflection')
        self.assertEqual(response.data['entry']['text'], 'I felt more grounded after my walk.')
        self.assertEqual(response.data['entry']['mood'], 'calm')
        self.assertEqual(self.user.thought_journal_entries.count(), 1)

    def test_post_journal_entry_updates_existing_entry_for_same_date(self):
        # Posting the same date twice should update the existing daily entry instead of duplicating it.
        ThoughtJournalEntry.objects.create(
            user=self.user,
            entry_date=date(2026, 6, 29),
            title='Morning note',
            content='Started tense.',
            mood='anxious',
        )

        response = self.client.post(
            reverse('journal'),
            {
                'date': '2026-06-29',
                'title': 'Evening reflection',
                'content': 'Ended the day feeling calmer.',
                'mood': 'calm',
            },
            format='json',
        )

        entry = self.user.thought_journal_entries.get(entry_date=date(2026, 6, 29))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.user.thought_journal_entries.count(), 1)
        self.assertEqual(entry.title, 'Evening reflection')
        self.assertEqual(entry.content, 'Ended the day feeling calmer.')
        self.assertEqual(entry.mood, 'calm')

    def test_post_journal_entry_rejects_invalid_date(self):
        # Serializer validation should stop malformed dates before any journal entry is written.
        response = self.client.post(
            reverse('journal'),
            {
                'date': 'not-a-date',
                'content': 'This should fail validation.',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(self.user.thought_journal_entries.exists())


class ChatAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username='chat-api-user',
            password='testpass123',
        )
        token, _ = Token.objects.get_or_create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_chat_requires_authentication(self):
        anonymous_client = APIClient()

        response = anonymous_client.post(
            reverse('chat'),
            {'message': 'Hello?'},
            format='json',
        )

        self.assertEqual(response.status_code, 401)

    def test_chat_history_returns_empty_list_before_any_messages(self):
        response = self.client.get(reverse('chat'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['messages'], [])

    @patch('api.routes.chat.generate_chat_reply')
    def test_chat_creates_or_reuses_ai_conversation_and_stores_messages(self, mock_generate_chat_reply):
        mock_generate_chat_reply.return_value = 'I am here with you.'

        first_response = self.client.post(
            reverse('chat'),
            {'message': 'I feel overwhelmed today.'},
            format='json',
        )
        second_response = self.client.post(
            reverse('chat'),
            {'message': 'Can you help me slow down?'},
            format='json',
        )

        conversations = self.user.conversations.filter(type=Conversation.ConversationType.AI)
        conversation = conversations.get()
        stored_messages = list(conversation.messages.values_list('role', 'content'))

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(conversations.count(), 1)
        self.assertEqual(first_response.data['reply'], 'I am here with you.')
        self.assertEqual(second_response.data['reply'], 'I am here with you.')
        self.assertEqual(
            stored_messages,
            [
                ('user', 'I feel overwhelmed today.'),
                ('assistant', 'I am here with you.'),
                ('user', 'Can you help me slow down?'),
                ('assistant', 'I am here with you.'),
            ],
        )

        first_history = mock_generate_chat_reply.call_args_list[0].kwargs['history']
        second_history = mock_generate_chat_reply.call_args_list[1].kwargs['history']

        self.assertEqual(first_history, [{'role': 'user', 'content': 'I feel overwhelmed today.'}])
        self.assertEqual(
            second_history,
            [
                {'role': 'user', 'content': 'I feel overwhelmed today.'},
                {'role': 'assistant', 'content': 'I am here with you.'},
                {'role': 'user', 'content': 'Can you help me slow down?'},
            ],
        )

    @patch('api.routes.chat.generate_chat_reply')
    def test_chat_forwarding_includes_subtle_personality_style_context(self, mock_generate_chat_reply):
        mock_generate_chat_reply.return_value = 'I am here with you.'
        UserProfile.objects.create(
            user=self.user,
            personality={
                'name': 'The Architect',
                'category': 'Thinker',
                'traits': ['Strategic', 'Analytical', 'Precise'],
                'strengths': 'Exceptional planning and long-term thinking.',
            },
        )

        self.client.post(
            reverse('chat'),
            {'message': 'I need help getting organized.'},
            format='json',
        )

        style_context = mock_generate_chat_reply.call_args.kwargs['style_context']

        self.assertIn('The Architect', style_context)
        self.assertIn('structured, direct, and concrete', style_context)
        self.assertIn('Strategic', style_context)

    @patch('api.routes.chat.generate_chat_reply')
    def test_chat_history_returns_saved_messages_in_order(self, mock_generate_chat_reply):
        mock_generate_chat_reply.return_value = 'Let us take one step at a time.'

        self.client.post(
            reverse('chat'),
            {'message': 'I am feeling stuck.'},
            format='json',
        )
        self.client.post(
            reverse('chat'),
            {'message': 'What should I do first?'},
            format='json',
        )

        response = self.client.get(reverse('chat'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['messages']), 4)
        self.assertEqual(
            [(message['role'], message['content']) for message in response.data['messages']],
            [
                ('user', 'I am feeling stuck.'),
                ('assistant', 'Let us take one step at a time.'),
                ('user', 'What should I do first?'),
                ('assistant', 'Let us take one step at a time.'),
            ],
        )
        self.assertTrue(all('timestamp' in message for message in response.data['messages']))


class PeerModerationAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username='peer-user',
            password='testpass123',
        )
        self.other_user = get_user_model().objects.create_user(
            username='peer-friend',
            password='testpass123',
        )
        token, _ = Token.objects.get_or_create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        UserProfile.objects.create(
            user=self.user,
            anonymous_name='CalmRiver17',
            avatar_color='#3a6898',
            is_peer_onboarded=True,
        )
        UserProfile.objects.create(
            user=self.other_user,
            anonymous_name='QuietStone24',
            avatar_color='#4d6b58',
            is_peer_onboarded=True,
        )
        self.room = PeerRoom.objects.create(name='Anxiety Support Room', topic='anxiety')
        PeerConnection.objects.create(
            requester=self.user,
            recipient=self.other_user,
            status=PeerConnection.Status.CONNECTED,
        )

    def test_room_message_blocks_contact_sharing(self):
        response = self.client.post(
            reverse('peer-room-messages', args=[self.room.id]),
            {'content': 'Message me on discord or at me@example.com'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("isn't allowed in anonymous chats", response.data['error'])
        self.assertEqual(PeerRoomMessage.objects.count(), 0)

    def test_room_message_blocks_harassment(self):
        response = self.client.post(
            reverse('peer-room-messages', args=[self.room.id]),
            {'content': 'You are such an idiot'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('potential harassment', response.data['error'])
        self.assertEqual(PeerRoomMessage.objects.count(), 0)

    def test_room_message_blocks_obfuscated_harassment_without_ai(self):
        response = self.client.post(
            reverse('peer-room-messages', args=[self.room.id]),
            {'content': 'y0u are d u m b'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('potential harassment', response.data['error'])
        self.assertEqual(PeerRoomMessage.objects.count(), 0)

    def test_dm_blocks_harmful_advice(self):
        response = self.client.post(
            reverse('peer-dm', args=[self.other_user.id]),
            {'content': 'You should stop taking medication right away'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('potentially harmful advice', response.data['error'])
        self.assertEqual(PeerDM.objects.count(), 0)

    @patch('api.routes.peer.moderate_peer_message')
    def test_dm_allows_safe_message_and_persists(self, mock_moderate_peer_message):
        mock_moderate_peer_message.return_value = {
            'decision': 'allow',
            'reason': 'supportive peer message',
        }

        response = self.client.post(
            reverse('peer-dm', args=[self.other_user.id]),
            {'content': 'I am glad you are here today.'},
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(PeerDM.objects.count(), 1)
        self.assertEqual(PeerDM.objects.get().content, 'I am glad you are here today.')
        mock_moderate_peer_message.assert_called_once_with('I am glad you are here today.')

    @patch('api.routes.peer.moderate_peer_message')
    def test_room_message_ai_blocks_bypassed_unsafe_content(self, mock_moderate_peer_message):
        mock_moderate_peer_message.return_value = {
            'decision': 'block',
            'reason': 'encourages harm indirectly',
        }

        response = self.client.post(
            reverse('peer-room-messages', args=[self.room.id]),
            {'content': 'Maybe everyone would be better off if you disappeared.'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Aurora's safety system", response.data['error'])
        self.assertEqual(PeerRoomMessage.objects.count(), 0)

    @patch('api.routes.peer.moderate_peer_message')
    def test_room_message_returns_503_when_ai_moderation_is_unavailable(self, mock_moderate_peer_message):
        mock_moderate_peer_message.side_effect = ValueError('OPENAI_API_KEY is not set.')

        response = self.client.post(
            reverse('peer-room-messages', args=[self.room.id]),
            {'content': 'I am having a rough day but trying to hang in there.'},
            format='json',
        )

        self.assertEqual(response.status_code, 503)
        self.assertIn('temporarily unavailable', response.data['error'])
        self.assertEqual(PeerRoomMessage.objects.count(), 0)
