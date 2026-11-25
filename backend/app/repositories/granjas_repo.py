import psycopg

from ..schemas.granjas import GranjaCreate


def crear(conn: psycopg.Connection, granja: GranjaCreate) -> dict:
    cur = conn.execute(
        "INSERT INTO granjas (nombre, ubicacion, hectareas_totales) VALUES (%s, %s, %s) RETURNING id",
        (granja.nombre, granja.ubicacion, granja.hectareas_totales),
    )
    return obtener(conn, cur.fetchone()["id"])


def listar(conn: psycopg.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM granjas ORDER BY id").fetchall()
    return [dict(r) for r in rows]


def obtener(conn: psycopg.Connection, granja_id: int) -> dict | None:
    row = conn.execute("SELECT * FROM granjas WHERE id = %s", (granja_id,)).fetchone()
    return dict(row) if row else None
