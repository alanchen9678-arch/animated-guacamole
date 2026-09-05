from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from ai_engine.pipeline import generate_chat_reply
from api.serializers.chat import ChatRequestSerializer
from app.models import ChatUsage, Conversation, Message, UserProfile

WEEKLY_MESSAGE_LIMIT = 200
WEEK_IN_SECONDS = 60 * 60 * 24 * 7
CONTEXT_MESSAGE_LIMIT = 12
HISTORY_MESSAGE_LIMIT = 100

PERSONALITY_DIMENSION_GUIDANCE = {
    'socialEnergy': {
        'low': 'Prefer private reflection, one trusted person, and lower-intensity social options before group activities.',
        'high': 'Include collaboration, talking ideas through, gathering perspectives, and group-based options when relevant.',
    },
    'cooperationTrust': {
        'low': 'Emphasize evidence, tradeoffs, autonomy, and alternative viewpoints.',
        'high': 'Include relationship effects, collaboration, boundaries, and mutually workable options.',
    },
    'selfManagement': {
        'low': 'Offer fewer steps at once, a clear immediate action, and shorter planning horizons.',
        'high': 'Offer structured multi-step plans, milestones, dependencies, and longer planning horizons when useful.',
    },
    'emotionalRecovery': {
        'low': 'Reduce information overload, break difficult situations into smaller parts, and separate controllable from uncontrollable factors.',
        'high': 'Move efficiently into analysis and present multiple tradeoffs without unnecessary emotional framing.',
    },
    'opennessCuriosity': {
        'low': 'Start with practical, concrete, established approaches and familiar examples.',
        'high': 'Include alternative perspectives, creative approaches, analogies, and broader possibilities.',
    },
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
    messages = list(conversation.messages.order_by('-timestamp', '-id')[:HISTORY_MESSAGE_LIMIT])
    messages.reverse()
    return [
        {
            "id": message.id,
            "userId": message.user_id,
            "role": message.role,
            "content": message.content,
            "timestamp": message.timestamp.isoformat(),
        }
        for message in messages
        if message.role in {Message.MessageRole.USER, Message.MessageRole.ASSISTANT}
    ]


def reserve_chat_message(user):
    now = timezone.now()
    with transaction.atomic():
        user.__class__.objects.select_for_update().get(pk=user.pk)
        usage, _ = ChatUsage.objects.select_for_update().get_or_create(user=user)
        if (now - usage.window_started_at).total_seconds() >= WEEK_IN_SECONDS:
            usage.window_started_at = now
            usage.message_count = 0
        if usage.message_count >= WEEKLY_MESSAGE_LIMIT:
            return None
        usage.message_count += 1
        usage.save(update_fields=['window_started_at', 'message_count', 'updated_at'])
        return usage.message_count


def release_chat_message(user):
    with transaction.atomic():
        user.__class__.objects.select_for_update().get(pk=user.pk)
        usage = ChatUsage.objects.select_for_update().filter(user=user).first()
        if usage and usage.message_count:
            usage.message_count -= 1
            usage.save(update_fields=['message_count', 'updated_at'])


def build_style_context(user):
    profile = UserProfile.objects.filter(user=user).first()
    if not profile or not profile.personality:
        return None

    personality = profile.personality or {}
    if (
        personality.get('schemaVersion') != 2
        or personality.get('instrument') != 'aurora-personality-v2'
    ):
        return None

    dimensions = personality.get('dimensions')
    if not isinstance(dimensions, dict):
        return None

    guidance = []
    for dimension_id, options in PERSONALITY_DIMENSION_GUIDANCE.items():
        dimension = dimensions.get(dimension_id)
        if not isinstance(dimension, dict):
            continue
        signal_strength = dimension.get('signalStrength')
        if signal_strength not in {'moderate', 'strong'}:
            continue
        try:
            score = float(dimension.get('score'))
        except (TypeError, ValueError):
            continue
        direction = 'high' if score >= 3 else 'low'
        qualifier = 'Lightly consider' if signal_strength == 'moderate' else 'Consider'
        guidance.append(f'{qualifier}: {options[direction]}')

    if not guidance:
        return None

    return (
        'Personalization guidance (low priority): '
        + ' '.join(guidance)
        + ' Safety, factual accuracy, the current request, and current conversation context always override these tendencies.'
        + ' Use them only to rank or frame potentially helpful options. Never mention a profile, score, trait label, or inferred identity.'
        + ' Never infer mental health, ability, character, identity, or life outcomes from these signals.'
    )


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
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message_text = serializer.validated_data['message']
        reserved_count = reserve_chat_message(user)
        if reserved_count is None:
            return Response(
                {'detail': f'Weekly message limit of {WEEKLY_MESSAGE_LIMIT} reached. Resets 7 days after your first message in the current window.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        conversation = get_or_create_ai_conversation(user)
        style_context = build_style_context(user)
        history = serialize_recent_history(conversation)

        try:
            reply = generate_chat_reply(
                message_text,
                history=history,
                style_context=style_context,
            )
        except ValueError as exc:
            release_chat_message(user)
            return Response({'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception:
            release_chat_message(user)
            return Response(
                {'detail': 'OpenAI request failed.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            with transaction.atomic():
                Message.objects.create(
                    conversation=conversation,
                    user=user,
                    role=Message.MessageRole.USER,
                    content=message_text,
                )
                Message.objects.create(
                    conversation=conversation,
                    user=user,
                    role=Message.MessageRole.ASSISTANT,
                    content=reply,
                )
        except Exception:
            release_chat_message(user)
            raise

        return Response(
            {
                'userId': user.id,
                'reply': reply,
                'messages_used': reserved_count,
                'messages_remaining': WEEKLY_MESSAGE_LIMIT - reserved_count,
            },
            status=status.HTTP_200_OK,
        )
