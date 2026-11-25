import psycopg

from fastapi import APIRouter, Depends, HTTPException

from ..db import get_db_dependency
from ..repositories import estanques_repo, granjas_repo
from ..schemas.estanques import EstanqueCreate, EstanqueOut

router = APIRouter(prefix="/api/estanques", tags=["estanques"])


@router.post("", response_model=EstanqueOut, status_code=201)
def crear_estanque(estanque: EstanqueCreate, conn: psycopg.Connection = Depends(get_db_dependency)):
    if granjas_repo.obtener(conn, estanque.granja_id) is None:
        raise HTTPException(status_code=404, detail="Granja no encontrada")
    return estanques_repo.crear(conn, estanque)


@router.get("", response_model=list[EstanqueOut])
def listar_estanques(
    granja_id: int | None = None, conn: psycopg.Connection = Depends(get_db_dependency)
):
    return estanques_repo.listar(conn, granja_id)


@router.get("/{estanque_id}", response_model=EstanqueOut)
def obtener_estanque(estanque_id: int, conn: psycopg.Connection = Depends(get_db_dependency)):
    estanque = estanques_repo.obtener(conn, estanque_id)
    if estanque is None:
        raise HTTPException(status_code=404, detail="Estanque no encontrado")
    return estanque


def get_estanque_o_404(estanque_id: int, conn: psycopg.Connection) -> dict:
    estanque = estanques_repo.obtener(conn, estanque_id)
    if estanque is None:
        raise HTTPException(status_code=404, detail="Estanque no encontrado")
    return estanque
