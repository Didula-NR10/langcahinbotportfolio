import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def client() -> TestClient:
    app = create_app(Settings(_env_file=None, app_environment="testing"))
    with TestClient(app) as test_client:
        yield test_client
