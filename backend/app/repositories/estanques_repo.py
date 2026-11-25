import psycopg

from ..schemas.estanques import EstanqueCreate


def crear(conn: psycopg.Connection, estanque: EstanqueCreate) -> dict:
    cur = conn.execute(
        """INSERT INTO estanques
           (granja_id, identificador_estanque, hectareas, densidad_siembra, fecha_siembra)
           VALUES (%s, %s, %s, %s, %s) RETURNING id""",
        (
            estanque.granja_id,
            estanque.identificador_estanque,
            estanque.hectareas,
            estanque.densidad_siembra,
            estanque.fecha_siembra,
        ),
    )
    return obtener(conn, cur.fetchone()["id"])


def listar(conn: psycopg.Connection, granja_id: int | None = None) -> list[dict]:
    if granja_id is not None:
        rows = conn.execute(
            "SELECT * FROM estanques WHERE granja_id = %s ORDER BY id", (granja_id,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM estanques ORDER BY id").fetchall()
    return [dict(r) for r in rows]


def obtener(conn: psycopg.Connection, estanque_id: int) -> dict | None:
    row = conn.execute("SELECT * FROM estanques WHERE id = %s", (estanque_id,)).fetchone()
    return dict(row) if row else None
