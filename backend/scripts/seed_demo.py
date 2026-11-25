"""Inserta una granja y un estanque de ejemplo para probar la API/frontend."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import get_connection  # noqa: E402
from init_db import init_db  # noqa: E402


def seed() -> None:
    init_db()
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO granjas (nombre, ubicacion, hectareas_totales) VALUES (%s, %s, %s) RETURNING id",
            ("Granja Demo", "Sinaloa", 20.0),
        )
        granja_id = cur.fetchone()["id"]

        cur = conn.execute(
            """INSERT INTO estanques
               (granja_id, identificador_estanque, hectareas, densidad_siembra, fecha_siembra)
               VALUES (%s, %s, %s, %s, %s) RETURNING id""",
            (granja_id, "E1", 1.0, 20.0, "2026-06-01"),
        )
        estanque_id = cur.fetchone()["id"]

        conn.execute(
            """INSERT INTO muestreos_biometria
               (estanque_id, fecha, peso_promedio_g, ganancia_semanal_g)
               VALUES (%s, %s, %s, %s) RETURNING id""",
            (estanque_id, "2026-09-14", 12.5, 1.2),
        )

        conn.commit()
        print(f"Datos demo insertados: granja_id={granja_id}, estanque_id={estanque_id}")
    finally:
        conn.close()


if __name__ == "__main__":
    seed()
