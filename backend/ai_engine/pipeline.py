from django.conf import settings

from ai_engine.llm.client import get_openai_client

SYSTEM_PROMPT = (
    "You are Aurora, a supportive mental health companion. "
    "Be warm, calm, and practical. "
    "Do not claim to be a licensed clinician. "
    "If the user mentions self-harm, suicide, or immediate danger, "
    "encourage them to contact local emergency services or a crisis hotline right away."
)


def generate_chat_reply(message: str, history=None) -> str:
    client = get_openai_client()
    input_messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]

    for item in history or []:
        role = item.get("role")
        content = (item.get("content") or "").strip()
        if role not in {"user", "assistant"} or not content:
            continue
        input_messages.append({"role": role, "content": content})

    input_messages.append({"role": "user", "content": message})

    response = client.responses.create(
        model=settings.OPENAI_MODEL,
        input=input_messages,
    )
    return response.output_text.strip()
