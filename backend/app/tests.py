from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import (
    CheckIn,
    Conversation,
    JournalDoodle,
    JournalPrivacySettings,
    Message,
    ThoughtJournalEntry,
    get_user_checkin_summary,
)


class ConversationModelTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='aurora-user',
            password='testpass123',
        )

    def test_conversation_can_be_created_for_each_supported_type(self):
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
        self.user = get_user_model().objects.create_user(
            username='journal-user',
            password='testpass123',
        )

    def test_thought_journal_entries_are_owned_by_user(self):
        entry = ThoughtJournalEntry.objects.create(
            user=self.user,
            title='Evening reflection',
            content='Today felt more manageable after my walk.',
        )

        self.assertEqual(entry.user, self.user)
        self.assertEqual(self.user.thought_journal_entries.count(), 1)
        self.assertEqual(entry.title, 'Evening reflection')

    def test_doodle_can_be_linked_to_entry_and_user(self):
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
        privacy = JournalPrivacySettings.objects.create(user=self.user)

        self.assertFalse(privacy.allow_ai_access)
        self.assertFalse(privacy.allow_therapist_access)


class CheckInModelTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='checkin-user',
            password='testpass123',
        )

    def test_weekly_checkin_sets_monday_week_start(self):
        checkin = CheckIn.objects.create(
            user=self.user,
            type=CheckIn.CheckInType.WEEKLY,
            check_in_date=date(2026, 6, 24),  # Wednesday
            question_ids=[1, 2],
            scores={'stress': 55},
        )

        self.assertEqual(checkin.week_start_date, date(2026, 6, 22))

    def test_streak_counts_consecutive_monday_sunday_weeks(self):
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
