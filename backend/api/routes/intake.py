"""Intake routes — POST /api/intake/classify + POST /api/intake/ask (SSE)."""

import json
import logging
from typing import List

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from engine.utils.llm_factory import get_chat_model
from engine.prompts.intake_prompts import (
    build_intake_messages,
    IntakeResponseSchema,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Request/Response Schemas ──────────────────────────────────────────────

class ClassifyRequest(BaseModel):
    stressor: str = Field(..., min_length=3, max_length=500)


class ClassifyResponse(BaseModel):
    category: str
    intent: str


class ConversationMessage(BaseModel):
    role: str = Field(..., description="'assistant' or 'user'")
    content: str


class IntakeAskRequest(BaseModel):
    stressor: str = Field(..., min_length=3, max_length=500)
    category: str
    intent: str
    conversation: List[ConversationMessage] = Field(default_factory=list)
    question_number: int = Field(default=1, ge=1, le=3)


# ── POST /api/intake/classify ─────────────────────────────────────────────

@router.post("/api/intake/classify", response_model=ClassifyResponse)
async def classify_stressor(request: ClassifyRequest):
    """Lightweight classification — returns category + intent only.

    Does NOT use the full classifier_node (which also builds section plans
    and requires pacing profiles). This avoids crashes for categories like
    'gibberish' that don't have pacing profiles.
    """
    from engine.utils.llm_factory import get_chat_model
    from engine.models.schemas import ClassifierResponseSchema
    from engine.prompts.classifier_prompts import (
        CLASSIFIER_PROMPT_TEMPLATE,
        VALID_INTENTS,
    )

    llm = get_chat_model(temperature=0.1, default_model="gpt-4o-mini")
    structured_llm = llm.with_structured_output(ClassifierResponseSchema)

    messages = CLASSIFIER_PROMPT_TEMPLATE.format_messages(stressor=request.stressor)

    try:
        response: ClassifierResponseSchema = await structured_llm.ainvoke(messages)
        category = response.type
        intent = response.intent if response.intent in VALID_INTENTS else "work"
    except Exception as e:
        logger.error(f"Classification failed: {e}")
        category = "general"
        intent = "work"

    return ClassifyResponse(
        category=category,
        intent=intent,
    )


# ── POST /api/intake/ask (SSE streaming) ──────────────────────────────────

@router.post("/api/intake/ask")
async def intake_ask(request: IntakeAskRequest):
    """Stream a follow-up question from the intake coach via SSE.

    SSE events:
    - event: token   data: {"token": "word "}
    - event: done    data: {"has_enough_context": bool, "full_response": "..."}
    - event: error   data: {"error": "..."}
    """

    async def event_generator():
        try:
            # Use gpt-4o-mini for speed and cost
            llm = get_chat_model(temperature=0.6, default_model="gpt-4o-mini")
            structured_llm = llm.with_structured_output(IntakeResponseSchema)

            conversation_dicts = [
                {"role": msg.role, "content": msg.content}
                for msg in request.conversation
            ]

            messages = build_intake_messages(
                stressor=request.stressor,
                category=request.category,
                intent=request.intent,
                conversation=conversation_dicts,
                question_number=request.question_number,
            )

            # For structured output we can't easily stream token-by-token,
            # so we do a single call and simulate word-by-word streaming.
            result: IntakeResponseSchema = await structured_llm.ainvoke(messages)

            # Determine if we have enough context.
            # If the message is a question (ends with ?), the user still needs to answer —
            # never auto-advance on a question. The frontend's handleSubmit hard-caps at 3 questions.
            is_question = result.message.strip().endswith("?")
            has_enough = result.has_enough_context and not is_question

            # Stream the response word by word (pacing handled by frontend)
            words = result.message.split(" ")
            for i, word in enumerate(words):
                token = word + (" " if i < len(words) - 1 else "")
                yield {
                    "event": "token",
                    "data": json.dumps({"token": token}),
                }

            # Send completion event
            yield {
                "event": "done",
                "data": json.dumps({
                    "has_enough_context": has_enough,
                    "full_response": result.message,
                }),
            }

        except Exception as e:
            logger.error(f"Intake ask failed: {e}")
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)}),
            }

    return EventSourceResponse(event_generator())
