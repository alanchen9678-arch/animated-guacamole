from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from ai_engine.pipeline import generate_chat_reply
from api.serializers.chat import ChatRequestSerializer


class ChatView(APIView):
    def post(self, request):
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            reply = generate_chat_reply(serializer.validated_data["message"])
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as exc:
            return Response(
                {"detail": "OpenAI request failed.", "error": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"reply": reply}, status=status.HTTP_200_OK)
