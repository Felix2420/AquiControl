"""Crea la BD (si no existe) y aplica db/schema.sql. Idempotente.

Uso: python backend/scripts/init_db.py [--test]   (--test usa TEST_DATABASE_URL)
"""
import sys
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict, make_conninfo

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import config  # noqa: E402


def crear_bd_si_falta(url: str) -> None:
    info = conninfo_to_dict(url)
    nombre = info["dbname"]
    admin_url = make_conninfo(url, dbname="postgres")
    with psycopg.connect(admin_url, autocommit=True) as conn:
        existe = conn.execute("SELECT 1 FROM pg_database WHERE datname = %s", (nombre,)).fetchone()
        if not existe:
            conn.execute(
                sql.SQL("CREATE DATABASE {} ENCODING 'UTF8' TEMPLATE template0").format(
                    sql.Identifier(nombre)
                )
            )
            print(f"Base de datos '{nombre}' creada")


def init_db(url: str | None = None) -> None:
    url = url or config.DATABASE_URL
    crear_bd_si_falta(url)
    schema_sql = config.SCHEMA_PATH.read_text(encoding="utf-8")
    with psycopg.connect(url) as conn:
        conn.execute(schema_sql)
    print("Esquema aplicado en PostgreSQL")


if __name__ == "__main__":
    init_db(config.TEST_DATABASE_URL if "--test" in sys.argv else None)
