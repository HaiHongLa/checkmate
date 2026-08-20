from app.llm.base import LLMProvider
from app.llm.openai_provider import OpenAIProvider
from app.config import settings


def get_llm_provider() -> LLMProvider:
    """Factory for LLM providers. Extend here for Anthropic, etc."""
    if not settings.openai_api_key:
        raise RuntimeError(
            "OpenAI API key is not configured. Set OPENAI_API_KEY in your environment."
        )
    return OpenAIProvider(settings.openai_api_key, settings.openai_model)
