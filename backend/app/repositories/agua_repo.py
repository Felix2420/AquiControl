import psycopg

from ..schemas.agua import AguaCreate


def crear(conn: psycopg.Connection, estanque_id: int, parametros: AguaCreate) -> dict:
    cur = conn.execute(
        """INSERT INTO parametros_agua
           (estanque_id, fecha, temperatura_c, oxigeno_mg_l, salinidad_ppm, ph, amonio_ppm)
           VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
        (
            estanque_id,
            parametros.fecha,
            parametros.temperatura_c,
            parametros.oxigeno_mg_l,
            parametros.salinidad_ppm,
            parametros.ph,
            parametros.amonio_ppm,
        ),
    )
    return obtener(conn, cur.fetchone()["id"])


def listar(conn: psycopg.Connection, estanque_id: int) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM parametros_agua WHERE estanque_id = %s ORDER BY fecha DESC, id DESC",
        (estanque_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def obtener(conn: psycopg.Connection, parametro_id: int) -> dict | None:
    row = conn.execute(
        "SELECT * FROM parametros_agua WHERE id = %s", (parametro_id,)
    ).fetchone()
    return dict(row) if row else None


def ultimo(conn: psycopg.Connection, estanque_id: int) -> dict | None:
    row = conn.execute(
        "SELECT * FROM parametros_agua WHERE estanque_id = %s ORDER BY fecha DESC, id DESC LIMIT 1",
        (estanque_id,),
    ).fetchone()
    return dict(row) if row else None
