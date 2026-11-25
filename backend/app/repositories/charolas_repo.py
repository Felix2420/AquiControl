import psycopg

from ..schemas.charolas import CharolaCreate


def crear(conn: psycopg.Connection, estanque_id: int, lectura: CharolaCreate) -> dict:
    cur = conn.execute(
        """INSERT INTO lecturas_charolas
           (estanque_id, fecha, hora_toma, porcentaje_sobrante, ajuste_realizado_kg)
           VALUES (%s, %s, %s, %s, %s) RETURNING id""",
        (
            estanque_id,
            lectura.fecha,
            lectura.hora_toma,
            lectura.porcentaje_sobrante,
            lectura.ajuste_realizado_kg,
        ),
    )
    return obtener(conn, cur.fetchone()["id"])


def listar(conn: psycopg.Connection, estanque_id: int) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM lecturas_charolas WHERE estanque_id = %s ORDER BY fecha DESC, id DESC",
        (estanque_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def obtener(conn: psycopg.Connection, lectura_id: int) -> dict | None:
    row = conn.execute(
        "SELECT * FROM lecturas_charolas WHERE id = %s", (lectura_id,)
    ).fetchone()
    return dict(row) if row else None


def ultima(conn: psycopg.Connection, estanque_id: int) -> dict | None:
    row = conn.execute(
        "SELECT * FROM lecturas_charolas WHERE estanque_id = %s ORDER BY fecha DESC, id DESC LIMIT 1",
        (estanque_id,),
    ).fetchone()
    return dict(row) if row else None
