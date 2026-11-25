import os
from pathlib import Path

from psycopg.conninfo import make_conninfo

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _cargar_env(path: Path) -> None:
    """Carga KEY=VALUE de un .env (ignorado por git) sin pisar variables ya definidas."""
    if not path.is_file():
        return
    for linea in path.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if linea and not linea.startswith("#") and "=" in linea:
            clave, valor = linea.split("=", 1)
            os.environ.setdefault(clave.strip(), valor.strip().strip("\"'"))


_cargar_env(BACKEND_DIR.parent / ".env")

# La contraseña va en .env o en la variable de entorno, nunca en el repo:
#   DATABASE_URL=postgresql://postgres:<pwd>@localhost:5432/acuicontrol
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres@localhost:5432/acuicontrol")
# Por defecto, la misma conexión pero contra la BD acuicontrol_test.
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL") or make_conninfo(
    DATABASE_URL, dbname="acuicontrol_test"
)
SCHEMA_PATH = BACKEND_DIR / "db" / "schema.sql"

# Simplificación de v1: el schema no rastrea mortalidad, así que la
# supervivencia estimada es una constante configurable en vez de un dato medido.
SUPERVIVENCIA_ESTIMADA_DEFAULT = 0.85

UMBRAL_SOBRANTE_ALTO = 15.0
UMBRAL_SOBRANTE_CRITICO = 30.0

TEMP_MIN_OPTIMA = 24.0
TEMP_MAX_OPTIMA = 33.0
TEMP_MIN_EXTREMA = 20.0
TEMP_MAX_EXTREMA = 35.0

O2_CRITICO_MG_L = 3.5
O2_SUSPENSION_MG_L = 2.0
