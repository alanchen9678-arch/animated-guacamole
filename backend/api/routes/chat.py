from django.core.cache import cache
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from ai_engine.pipeline import generate_chat_reply
from api.serializers.chat import ChatRequestSerializer
from app.models import Conversation, Message, UserProfile

WEEKLY_MESSAGE_LIMIT = 200
WEEK_IN_SECONDS = 60 * 60 * 24 * 7
CONTEXT_MESSAGE_LIMIT = 12
HISTORY_MESSAGE_LIMIT = 100

PERSONALITY_STYLE_BY_CATEGORY = {
    'Thinker': 'Keep the tone a little more structured, direct, and concrete.',
    'Creator': 'Leave room for light imagery, curiosity, and reflective language.',
    'Leader': 'Sound steady, clear, and action-oriented without being pushy.',
    'Helper': 'Lean a bit more into warmth, validation, and relational language.',
}


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


def serialize_chat_messages(conversation):
    messages = conversation.messages.order_by('timestamp', 'id')[:HISTORY_MESSAGE_LIMIT]
    return [
        {
            "id": message.id,
            "role": message.role,
            "content": message.content,
            "timestamp": message.timestamp.isoformat(),
        }
        for message in messages
        if message.role in {Message.MessageRole.USER, Message.MessageRole.ASSISTANT}
    ]


def build_style_context(user):
    profile = UserProfile.objects.filter(user=user).first()
    if not profile or not profile.personality:
        return None

    personality = profile.personality or {}
    category = personality.get('category')
    name = personality.get('name')
    traits = [trait for trait in personality.get('traits') or [] if isinstance(trait, str) and trait.strip()]
    strengths = personality.get('strengths')

    parts = []
    if name:
        parts.append(f'The user identifies with {name}.')
    elif category:
        parts.append(f"The user's personality leans toward {category}.")

    category_hint = PERSONALITY_STYLE_BY_CATEGORY.get(category)
    if category_hint:
        parts.append(category_hint)

    if traits:
        parts.append(f"Subtly mirror cues like {', '.join(traits[:3])}.")

    if strengths:
        parts.append('When helpful, reflect their strengths without naming the profile.')

    if not parts:
        return None

    return 'Personality style guidance: ' + ' '.join(parts) + ' Keep this subtle and never mention the profile explicitly.'


class ChatView(APIView):
    def get(self, request):
        conversation = (
            request.user.conversations.filter(type=Conversation.ConversationType.AI)
            .order_by('-created_at', '-id')
            .first()
        )
        if not conversation:
            return Response({"messages": []}, status=status.HTTP_200_OK)

        return Response(
            {
                "conversation_id": conversation.id,
                "messages": serialize_chat_messages(conversation),
            },
            status=status.HTTP_200_OK,
        )

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
        style_context = build_style_context(user)

        Message.objects.create(
            conversation=conversation,
            role=Message.MessageRole.USER,
            content=message_text,
        )

        try:
            reply = generate_chat_reply(
                message_text,
                history=serialize_recent_history(conversation),
                style_context=style_context,
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
