from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row

from . import config


def get_connection() -> psycopg.Connection:
    # Se lee config.DATABASE_URL en cada llamada para poder sobrescribirla en tests.
    return psycopg.connect(config.DATABASE_URL, row_factory=dict_row)


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def get_db_dependency():
    """Dependency de FastAPI: entrega una conexión y hace commit al finalizar la request."""
    with get_db() as conn:
        yield conn
