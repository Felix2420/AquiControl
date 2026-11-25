import psycopg

from fastapi import APIRouter, Depends, HTTPException

from ..db import get_db_dependency
from ..repositories import granjas_repo
from ..schemas.granjas import GranjaCreate, GranjaOut

router = APIRouter(prefix="/api/granjas", tags=["granjas"])


@router.post("", response_model=GranjaOut, status_code=201)
def crear_granja(granja: GranjaCreate, conn: psycopg.Connection = Depends(get_db_dependency)):
    return granjas_repo.crear(conn, granja)


@router.get("", response_model=list[GranjaOut])
def listar_granjas(conn: psycopg.Connection = Depends(get_db_dependency)):
    return granjas_repo.listar(conn)


@router.get("/{granja_id}", response_model=GranjaOut)
def obtener_granja(granja_id: int, conn: psycopg.Connection = Depends(get_db_dependency)):
    granja = granjas_repo.obtener(conn, granja_id)
    if granja is None:
        raise HTTPException(status_code=404, detail="Granja no encontrada")
    return granja
