import psycopg

from fastapi import APIRouter, Depends

from ..db import get_db_dependency
from ..repositories import biometria_repo
from ..schemas.biometria import BiometriaCreate, BiometriaOut
from .estanques import get_estanque_o_404

router = APIRouter(prefix="/api/estanques/{estanque_id}/biometria", tags=["biometria"])


@router.post("", response_model=BiometriaOut, status_code=201)
def registrar_biometria(
    estanque_id: int,
    muestreo: BiometriaCreate,
    conn: psycopg.Connection = Depends(get_db_dependency),
):
    get_estanque_o_404(estanque_id, conn)
    return biometria_repo.crear(conn, estanque_id, muestreo)


@router.get("", response_model=list[BiometriaOut])
def listar_biometria(estanque_id: int, conn: psycopg.Connection = Depends(get_db_dependency)):
    get_estanque_o_404(estanque_id, conn)
    return biometria_repo.listar(conn, estanque_id)
