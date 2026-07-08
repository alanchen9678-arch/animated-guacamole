import json

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
    "7. Engage with the user in everyday, non-mental health related conversation such as interests and hobbies, "
    "but do not encourage them to explore topics potentially related to self-harm such as guns, bridges, or drugs."
)

PEER_MODERATION_PROMPT = (
    "You are a strict safety moderator for an anonymous mental health peer support chat. "
    "Decide whether a single user message is safe to post. "
    "Return JSON only with keys decision and reason. "
    "Valid decisions are: allow, block, crisis, review. "
    "Use block for harassment, abuse, contact sharing, predatory behavior, unsafe instructions, medical advice, or content that should not be posted. "
    "Use crisis for imminent suicide or self-harm risk that should not be posted to peers. "
    "Use review for ambiguous cases that are concerning but not clearly safe. "
    "Use allow only if the message is appropriate for anonymous peer support."
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
    response = client.responses.create(
        model=settings.OPENAI_MODEL,
        input=[
            {"role": "system", "content": PEER_MODERATION_PROMPT},
            {"role": "user", "content": message},
        ],
    )

    raw_output = response.output_text.strip()
    try:
        payload = json.loads(raw_output)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Peer moderation returned invalid JSON: {raw_output}") from exc

    decision = str(payload.get("decision", "")).strip().lower()
    if decision not in {"allow", "block", "crisis", "review"}:
        raise ValueError(f"Peer moderation returned invalid decision: {decision or raw_output}")

    reason = str(payload.get("reason", "")).strip()
    return {
        "decision": decision,
        "reason": reason,
    }
