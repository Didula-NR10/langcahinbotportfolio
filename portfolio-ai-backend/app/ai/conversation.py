"""Small, deterministic follow-up query contextualization."""

import re

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage

FOLLOW_UP_REFERENCE = re.compile(
    r"\b(?:it|its|that|this|those|these|they|them|their|first|second|third|one|ones|"
    r"former|latter|same|above|previous|earlier|he|she|his|her)\b",
    re.IGNORECASE,
)


def is_follow_up(question: str, history: tuple[BaseMessage, ...] | list[BaseMessage]) -> bool:
    return bool(history and FOLLOW_UP_REFERENCE.search(question))


def contextualize_retrieval_query(question: str, history: list[BaseMessage]) -> str:
    if not is_follow_up(question, history):
        return question
    previous_user = next((str(item.content) for item in reversed(history) if isinstance(item, HumanMessage)), "")
    previous_answer = next((str(item.content) for item in reversed(history) if isinstance(item, AIMessage)), "")
    return (
        f"Previous question: {previous_user[-300:]}\n"
        f"Previous answer: {previous_answer[-300:]}\n"
        f"Follow-up question: {question}"
    )
