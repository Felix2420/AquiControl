import psycopg

from fastapi import APIRouter, Depends

from ..db import get_db_dependency
from ..repositories import agua_repo
from ..schemas.agua import AguaCreate, AguaOut
from .estanques import get_estanque_o_404

router = APIRouter(prefix="/api/estanques/{estanque_id}/agua", tags=["agua"])


@router.post("", response_model=AguaOut, status_code=201)
def registrar_agua(
    estanque_id: int, parametros: AguaCreate, conn: psycopg.Connection = Depends(get_db_dependency)
):
    get_estanque_o_404(estanque_id, conn)
    return agua_repo.crear(conn, estanque_id, parametros)


@router.get("", response_model=list[AguaOut])
def listar_agua(estanque_id: int, conn: psycopg.Connection = Depends(get_db_dependency)):
    get_estanque_o_404(estanque_id, conn)
    return agua_repo.listar(conn, estanque_id)
