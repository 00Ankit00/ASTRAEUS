import pytest
from fastapi.testclient import TestClient
from main import app

# Create a TestClient using the context manager to trigger lifespan events
@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert "version" in data
