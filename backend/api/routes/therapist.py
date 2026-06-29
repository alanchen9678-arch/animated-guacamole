from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializers.chat import ChatRequestSerializer
from api.serializers.therapist import TherapistMatchReadSerializer, TherapistMatchWriteSerializer
from app.models import Conversation, Message, TherapistMatch

THERAPIST_AUTO_REPLIES = [
    "Hello. I've reviewed your Aurora profile and I'm glad you reached out. How have things been feeling for you lately?",
    "That makes sense. I'd like to understand what has been weighing on you most before we focus on solutions. What feels hardest right now?",
    "We can take this one step at a time. You do not need to explain everything at once.",
    "I hear a pattern there. Let's slow it down together and look at what tends to happen just before that feeling spikes.",
    "Thank you for being direct about that. Based on what you've shared, it sounds worth exploring both stress triggers and the supports already working for you.",
]


def get_or_create_therapist_conversation(match):
    conversation = (
        match.conversations
        .filter(user=match.user, type=Conversation.ConversationType.THERAPIST)
        .order_by('-created_at', '-id')
        .first()
    )
    if conversation:
        return conversation

    conversation = Conversation.objects.create(
        user=match.user,
        type=Conversation.ConversationType.THERAPIST,
        therapist_match=match,
    )
    Message.objects.create(
        conversation=conversation,
        role=Message.MessageRole.THERAPIST,
        content=THERAPIST_AUTO_REPLIES[0],
    )
    return conversation


def serialize_therapist_message(message):
    return {
        'id': message.id,
        'role': message.role,
        'content': message.content,
        'timestamp': message.timestamp.isoformat(),
    }


class TherapistMatchCollectionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        matches = request.user.therapist_matches.order_by('created_at', 'id')
        serialized = TherapistMatchReadSerializer(matches, many=True).data
        return Response(
            {
                'matches': serialized,
                'therapistIds': [item['therapistId'] for item in serialized],
            }
        )

    def post(self, request):
        serializer = TherapistMatchWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        match, _ = TherapistMatch.objects.get_or_create(
            user=request.user,
            therapist_id=serializer.validated_data['therapistId'],
        )

        matches = request.user.therapist_matches.order_by('created_at', 'id')
        serialized = TherapistMatchReadSerializer(matches, many=True).data
        return Response(
            {
                'match': TherapistMatchReadSerializer(match).data,
                'matches': serialized,
                'therapistIds': [item['therapistId'] for item in serialized],
            }
        )


class TherapistMatchMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def get_match(self, request, match_id):
        try:
            return TherapistMatch.objects.get(id=match_id, user=request.user)
        except TherapistMatch.DoesNotExist:
            return None

    def get(self, request, match_id):
        match = self.get_match(request, match_id)
        if not match:
            return Response({'error': 'Therapist match not found.'}, status=status.HTTP_404_NOT_FOUND)

        conversation = get_or_create_therapist_conversation(match)
        messages = conversation.messages.order_by('timestamp', 'id')
        return Response(
            {
                'matchId': match.id,
                'therapistId': match.therapist_id,
                'messages': [serialize_therapist_message(message) for message in messages],
            }
        )

    def post(self, request, match_id):
        match = self.get_match(request, match_id)
        if not match:
            return Response({'error': 'Therapist match not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation = get_or_create_therapist_conversation(match)

        user_message = Message.objects.create(
            conversation=conversation,
            role=Message.MessageRole.USER,
            content=serializer.validated_data['message'],
        )

        reply_index = conversation.messages.filter(role=Message.MessageRole.THERAPIST).count()
        reply_text = THERAPIST_AUTO_REPLIES[reply_index % len(THERAPIST_AUTO_REPLIES)]
        reply_message = Message.objects.create(
            conversation=conversation,
            role=Message.MessageRole.THERAPIST,
            content=reply_text,
        )

        return Response(
            {
                'userMessage': serialize_therapist_message(user_message),
                'replyMessage': serialize_therapist_message(reply_message),
            },
            status=status.HTTP_201_CREATED,
        )
