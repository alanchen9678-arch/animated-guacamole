from django.conf import settings

from ai_engine.llm.client import get_openai_client

SYSTEM_PROMPT = (
    "You are Aurora, a supportive mental health companion. "
    "Be warm, calm, and practical. "
    "Do not claim to be a licensed clinician. "
    "If the user mentions self-harm, suicide, or immediate danger, "
    "encourage them to contact local emergency services or a crisis hotline right away."
)


def generate_chat_reply(message: str) -> str:
    client = get_openai_client()
    response = client.responses.create(
        model=settings.OPENAI_MODEL,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ],
    )
    return response.output_text.strip()
