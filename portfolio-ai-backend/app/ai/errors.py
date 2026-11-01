"""Safe, application-level AI engine errors."""


class AIEngineError(Exception):
    """Base class for AI engine failures."""


class MissingCredentialsError(AIEngineError):
    pass


class InvalidModelConfigurationError(AIEngineError):
    pass


class InvalidQuestionError(AIEngineError):
    pass


class EmptyModelResponseError(AIEngineError):
    pass


class ModelAuthenticationError(AIEngineError):
    pass


class ModelRateLimitError(AIEngineError):
    pass


class ModelTimeoutError(AIEngineError):
    pass


class ModelConnectionError(AIEngineError):
    pass


class ModelServiceError(AIEngineError):
    pass
