import psycopg
import pytest
from fastapi.testclient import TestClient

from app import config
from app.main import app

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from init_db import crear_bd_si_falta  # noqa: E402


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(config, "DATABASE_URL", config.TEST_DATABASE_URL)
    crear_bd_si_falta(config.TEST_DATABASE_URL)

    # Esquema limpio por test (aislamiento equivalente al tmp_path de SQLite).
    with psycopg.connect(config.TEST_DATABASE_URL) as conn:
        conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
        conn.execute(config.SCHEMA_PATH.read_text(encoding="utf-8"))

    return TestClient(app)
