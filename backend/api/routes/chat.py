from django.core.cache import cache
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from ai_engine.pipeline import generate_chat_reply
from api.serializers.chat import ChatRequestSerializer
from app.models import Conversation, Message

WEEKLY_MESSAGE_LIMIT = 200
WEEK_IN_SECONDS = 60 * 60 * 24 * 7
CONTEXT_MESSAGE_LIMIT = 12


def get_or_create_ai_conversation(user):
    conversation = (
        user.conversations.filter(type=Conversation.ConversationType.AI)
        .order_by('-created_at', '-id')
        .first()
    )
    if conversation:
        return conversation
    return Conversation.objects.create(user=user, type=Conversation.ConversationType.AI)


def serialize_recent_history(conversation):
    recent_messages = list(conversation.messages.order_by('-timestamp', '-id')[:CONTEXT_MESSAGE_LIMIT])
    recent_messages.reverse()
    return [
        {
            "role": message.role,
            "content": message.content,
        }
        for message in recent_messages
        if message.role in {Message.MessageRole.USER, Message.MessageRole.ASSISTANT}
    ]


class ChatView(APIView):
    def post(self, request):
        user = request.user
        user_id = user.id
        cache_key = f"chat_limit:{user_id}"

        count = cache.get(cache_key, 0)
        if count >= WEEKLY_MESSAGE_LIMIT:
            return Response(
                {"detail": f"Weekly message limit of {WEEKLY_MESSAGE_LIMIT} reached. Resets in 7 days."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message_text = serializer.validated_data["message"]
        conversation = get_or_create_ai_conversation(user)

        Message.objects.create(
            conversation=conversation,
            role=Message.MessageRole.USER,
            content=message_text,
        )

        try:
            reply = generate_chat_reply(
                message_text,
                history=serialize_recent_history(conversation),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as exc:
            return Response(
                {"detail": "OpenAI request failed.", "error": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        Message.objects.create(
            conversation=conversation,
            role=Message.MessageRole.ASSISTANT,
            content=reply,
        )

        if count == 0:
            cache.set(cache_key, 1, timeout=WEEK_IN_SECONDS)
        else:
            cache.incr(cache_key)

        return Response({"reply": reply, "messages_used": count + 1, "messages_remaining": WEEKLY_MESSAGE_LIMIT - count - 1}, status=status.HTTP_200_OK)
