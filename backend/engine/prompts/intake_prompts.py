"""Intake Prompts — System prompt and schema for the conversational intake coach."""

from typing import List
from pydantic import BaseModel, Field


INTAKE_SYSTEM_PROMPT = """You are a calm, empathetic mental performance coach. Someone just told you what's blocking them, and you're about to build a personalized mental reset session for them.

Before you start, you want to understand their situation a little better so the session really lands.

Rules:
1. Ask ONE short follow-up question per message — under 20 words.
2. Be warm and natural. Talk like a friend, not a therapist or a form.
3. Don't repeat or paraphrase what they already told you.
4. Don't diagnose, give advice, or offer reassurance yet — just ask.
5. Focus on what would help you build a BETTER session for them:
   - What specifically they're working on (if vague)
   - Whether it's anxiety, avoidance, overwhelm, or something else
   - How long they've been feeling this way (if it seems relevant)
   - What they need right now — to get back to work, or just decompress
6. If they've already given you enough detail to build a great session, say so warmly and set has_enough_context to true.
7. Never ask about their mental health history, medications, or personal relationships.
8. Keep it light. This is a 30-second conversation, not an intake form."""


INTAKE_USER_TEMPLATE = """The user said: "{stressor}"
Category detected: {category}
Intent detected: {intent}

This is question {question_number} of a maximum of 3.
{conversation_context}
Ask your next follow-up question, or indicate you have enough context."""


def build_intake_messages(
    stressor: str,
    category: str,
    intent: str,
    conversation: List[dict],
    question_number: int,
) -> list:
    """Build the message list for the intake LLM call.

    Args:
        stressor: The user's original stressor text.
        category: Classified category (deadline, presentation, etc.).
        intent: Classified intent (work, decompress).
        conversation: List of {role, content} dicts from previous turns.
        question_number: 1-indexed question number (max 3).

    Returns:
        List of (role, content) tuples for the LLM.
    """
    # Build conversation context string
    if conversation:
        lines = []
        for msg in conversation:
            role_label = "Coach" if msg["role"] == "assistant" else "User"
            lines.append(f"{role_label}: {msg['content']}")
        conversation_context = "Previous conversation:\n" + "\n".join(lines)
    else:
        conversation_context = "This is your first question — no previous conversation yet."

    user_message = INTAKE_USER_TEMPLATE.format(
        stressor=stressor,
        category=category,
        intent=intent,
        question_number=question_number,
        conversation_context=conversation_context,
    )

    return [
        ("system", INTAKE_SYSTEM_PROMPT),
        ("human", user_message),
    ]


class IntakeResponseSchema(BaseModel):
    """Structured output schema for the intake LLM response."""
    message: str = Field(
        description="Your warm, natural follow-up question (under 20 words), OR a brief closing acknowledgment if you have enough context (e.g. 'Got it, let me build your session.')."
    )
    has_enough_context: bool = Field(
        description="Set to True ONLY when your message is a closing acknowledgment (NOT a question). If your message asks a question (ends with '?'), this MUST be False. True means the conversation is over and no user response is expected."
    )
