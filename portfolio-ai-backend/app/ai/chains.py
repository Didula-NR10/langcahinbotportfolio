from langchain_core.runnables import Runnable, RunnableLambda

from app.ai.output import normalize_model_message
from app.ai.prompts import build_portfolio_prompt, build_prompt


def build_chain(model: Runnable) -> Runnable:
    return build_prompt() | model | RunnableLambda(normalize_model_message)


def build_portfolio_chain(model: Runnable) -> Runnable:
    return build_portfolio_prompt() | model | RunnableLambda(normalize_model_message)
