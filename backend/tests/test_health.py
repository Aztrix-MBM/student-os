import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "Welcome to Student OS API" in data["message"]
    assert data["health"] == "/api/health"


def test_health_check_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app_name"] == "Student OS API"
    assert data["version"] == "0.1.0"
    assert data["database"] == "connected"
    assert "timestamp" in data
