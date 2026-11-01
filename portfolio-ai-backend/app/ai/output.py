from langchain_core.messages import AIMessage

from app.ai.errors import EmptyModelResponseError
from app.schemas.ai_schema import TokenUsage


def normalize_model_message(message: AIMessage) -> tuple[str, TokenUsage | None]:
    content = message.content
    if isinstance(content, str):
        answer = content.strip()
    elif isinstance(content, list):
        answer = "\n".join(
            block["text"].strip()
            for block in content
            if isinstance(block, dict) and block.get("type") == "text" and isinstance(block.get("text"), str)
        ).strip()
    else:
        answer = ""

    if not answer:
        raise EmptyModelResponseError("The model returned no answer.")

    usage = None
    metadata = message.usage_metadata
    if isinstance(metadata, dict):
        values = {key: metadata.get(key) for key in ("input_tokens", "output_tokens", "total_tokens")}
        if any(isinstance(value, int) and not isinstance(value, bool) and value >= 0 for value in values.values()):
            usage = TokenUsage(**{
                key: value if isinstance(value, int) and not isinstance(value, bool) and value >= 0 else None
                for key, value in values.items()
            })
    return answer, usage
