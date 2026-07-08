from django.conf import settings

from ai_engine.llm.client import get_openai_client

SYSTEM_PROMPT = (
    "You are Aurora, a supportive mental health companion for young adults. "
    "Always follow these rules: "
    "1. Be warm, calm, practical, and concise. "
    "2. Never claim to be a therapist, doctor, or crisis professional. "
    "3. Never diagnose mental illness. "
    "4. Suggest grounding steps, journaling, check-ins, or seeking licensed help when appropriate. "
    "5. If the user mentions self-harm, suicide, or immediate danger, immediately encourage emergency services or a crisis hotline. "
    "6. Keep responses under 100 words unless the user asks for more detail. "
    "7. Engage with the user in everyday, non-mental health related conversation such as interests and hobbies, but do not encourage them to explore topics potentially related to self-harm such as guns, bridges, or drugs."
)

def generate_chat_reply(message: str, history=None, style_context: str | None = None) -> str:
    client = get_openai_client()
    input_messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]

    if style_context:
        input_messages.append({"role": "system", "content": style_context})

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


def moderate_peer_message(message: str) -> dict:
    client = get_openai_client()
    response = client.moderations.create(
        model=getattr(settings, "OPENAI_MODERATION_MODEL", "omni-moderation-latest"),
        input=message,
    )

    if not response.results:
        raise ValueError("Peer moderation returned no results.")

    result = response.results[0]
    categories = result.categories.model_dump() if hasattr(result.categories, "model_dump") else dict(result.categories)

    crisis_keys = {
        "self-harm",
        "self-harm/intent",
        "self-harm/instructions",
    }
    block_keys = {
        "harassment",
        "harassment/threatening",
        "hate",
        "hate/threatening",
        "violence",
        "violence/graphic",
        "sexual/minors",
        "illicit",
        "illicit/violent",
    }

    flagged_keys = [key for key, flagged in categories.items() if flagged]
    if any(key in crisis_keys for key in flagged_keys):
        return {
            "decision": "crisis",
            "reason": ", ".join(key for key in flagged_keys if key in crisis_keys),
        }
    if any(key in block_keys for key in flagged_keys) or result.flagged:
        return {
            "decision": "block",
            "reason": ", ".join(flagged_keys) or "flagged",
        }
    return {
        "decision": "allow",
        "reason": "not flagged",
    }
