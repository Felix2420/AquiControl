import psycopg

from fastapi import APIRouter, Depends

from ..db import get_db_dependency
from ..repositories import charolas_repo
from ..schemas.charolas import CharolaCreate, CharolaOut
from .estanques import get_estanque_o_404

router = APIRouter(prefix="/api/estanques/{estanque_id}/charolas", tags=["charolas"])


@router.post("", response_model=CharolaOut, status_code=201)
def registrar_charola(
    estanque_id: int, lectura: CharolaCreate, conn: psycopg.Connection = Depends(get_db_dependency)
):
    get_estanque_o_404(estanque_id, conn)
    return charolas_repo.crear(conn, estanque_id, lectura)


@router.get("", response_model=list[CharolaOut])
def listar_charolas(estanque_id: int, conn: psycopg.Connection = Depends(get_db_dependency)):
    get_estanque_o_404(estanque_id, conn)
    return charolas_repo.listar(conn, estanque_id)
