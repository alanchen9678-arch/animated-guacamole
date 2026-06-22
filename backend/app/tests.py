from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import Conversation, Message


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
