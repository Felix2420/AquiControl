import psycopg

from ..schemas.biometria import BiometriaCreate


def crear(conn: psycopg.Connection, estanque_id: int, muestreo: BiometriaCreate) -> dict:
    cur = conn.execute(
        """INSERT INTO muestreos_biometria
           (estanque_id, fecha, peso_promedio_g, ganancia_semanal_g)
           VALUES (%s, %s, %s, %s) RETURNING id""",
        (estanque_id, muestreo.fecha, muestreo.peso_promedio_g, muestreo.ganancia_semanal_g),
    )
    return obtener(conn, cur.fetchone()["id"])


def listar(conn: psycopg.Connection, estanque_id: int) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM muestreos_biometria WHERE estanque_id = %s ORDER BY fecha DESC",
        (estanque_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def obtener(conn: psycopg.Connection, muestreo_id: int) -> dict | None:
    row = conn.execute(
        "SELECT * FROM muestreos_biometria WHERE id = %s", (muestreo_id,)
    ).fetchone()
    return dict(row) if row else None


def ultimo(conn: psycopg.Connection, estanque_id: int) -> dict | None:
    row = conn.execute(
        "SELECT * FROM muestreos_biometria WHERE estanque_id = %s ORDER BY fecha DESC, id DESC LIMIT 1",
        (estanque_id,),
    ).fetchone()
    return dict(row) if row else None
