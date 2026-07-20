"""Model factory for LLM model agnosticism.

Utilizes LangChain's init_chat_model to allow dynamic model selection
(OpenAI, Anthropic, Gemini, local models) via configuration or state.
"""

import os
import logging
from typing import Optional, Any, Dict

from langchain.chat_models import init_chat_model
from langchain_core.language_models import BaseChatModel

from config.settings import get_settings

logger = logging.getLogger(__name__)


def get_chat_model(
    config: Optional[Dict[str, Any]] = None,
    temperature: float = 0.7,
    default_model: str = "gpt-4o-mini",
    default_provider: str = "openai",
) -> BaseChatModel:
    """Initialize a ChatModel instance dynamically.

    Supports configurable model override via LangGraph RunnableConfig:
    `config={"configurable": {"model": "claude-3-5-sonnet-20241022", "model_provider": "anthropic"}}`
    or model format strings like `"openai:gpt-4o-mini"`.

    Args:
        config: Optional LangGraph RunnableConfig context.
        temperature: Model sampling temperature.
        default_model: Fallback model name if not configured.
        default_provider: Fallback model provider if not configured.

    Returns:
        BaseChatModel instance.
    """
    settings = get_settings()

    configurable = config.get("configurable", {}) if config else {}
    model_param = configurable.get("model", default_model)
    provider_param = configurable.get("model_provider", default_provider)

    # Allow model string formats like "openai:gpt-4o-mini" or "anthropic:claude-3-5-sonnet"
    if ":" in model_param:
        provider_param, model_param = model_param.split(":", 1)

    api_key = configurable.get("api_key")
    if not api_key:
        api_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY") or "mock-key-for-testing"

    kwargs = {
        "model": model_param,
        "model_provider": provider_param,
        "temperature": temperature,
        "api_key": api_key,
    }

    logger.debug(f"Initializing chat model: {provider_param}:{model_param} (temp={temperature})")
    return init_chat_model(**kwargs)
