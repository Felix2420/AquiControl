import psycopg

from ..schemas.alimentacion import AlimentacionCreate


def crear(conn: psycopg.Connection, estanque_id: int, registro: AlimentacionCreate) -> dict:
    cur = conn.execute(
        """INSERT INTO alimentacion_diaria
           (estanque_id, fecha, dosis_calculada_kg, dosis_aplicada_kg, fca_proyectado, explicacion_ia)
           VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
        (
            estanque_id,
            registro.fecha,
            registro.dosis_calculada_kg,
            registro.dosis_aplicada_kg,
            registro.fca_proyectado,
            registro.explicacion_ia,
        ),
    )
    return obtener(conn, cur.fetchone()["id"])


def listar(conn: psycopg.Connection, estanque_id: int) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM alimentacion_diaria WHERE estanque_id = %s ORDER BY fecha DESC, id DESC",
        (estanque_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def obtener(conn: psycopg.Connection, registro_id: int) -> dict | None:
    row = conn.execute(
        "SELECT * FROM alimentacion_diaria WHERE id = %s", (registro_id,)
    ).fetchone()
    return dict(row) if row else None
