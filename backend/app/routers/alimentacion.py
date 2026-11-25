import psycopg

from fastapi import APIRouter, Depends, HTTPException

from ..config import SUPERVIVENCIA_ESTIMADA_DEFAULT
from ..db import get_db_dependency
from ..repositories import agua_repo, alimentacion_repo, biometria_repo, charolas_repo
from ..schemas.alimentacion import (
    AlimentacionCreate,
    AlimentacionOut,
    DosisRecomendacionRequest,
    DosisRecomendacionResponse,
)
from ..services.dose_recommender import recomendar_dosis
from .estanques import get_estanque_o_404

router = APIRouter(prefix="/api/estanques/{estanque_id}", tags=["alimentacion"])


@router.post("/dosis/recomendacion", response_model=DosisRecomendacionResponse)
def calcular_recomendacion(
    estanque_id: int,
    overrides: DosisRecomendacionRequest = DosisRecomendacionRequest(),
    conn: psycopg.Connection = Depends(get_db_dependency),
):
    estanque = get_estanque_o_404(estanque_id, conn)

    biometria = biometria_repo.ultimo(conn, estanque_id)
    if biometria is None:
        raise HTTPException(
            status_code=422,
            detail="No hay muestreos de biometría registrados para este estanque",
        )

    charola = charolas_repo.ultima(conn, estanque_id)
    agua = agua_repo.ultimo(conn, estanque_id)

    porcentaje_sobrante = overrides.porcentaje_sobrante_charola
    if porcentaje_sobrante is None and charola is not None:
        porcentaje_sobrante = charola["porcentaje_sobrante"]

    temperatura_c = overrides.temperatura_c
    oxigeno_mg_l = overrides.oxigeno_mg_l
    if agua is not None:
        if temperatura_c is None:
            temperatura_c = agua["temperatura_c"]
        if oxigeno_mg_l is None:
            oxigeno_mg_l = agua["oxigeno_mg_l"]

    resultado = recomendar_dosis(
        densidad_siembra=estanque["densidad_siembra"],
        hectareas=estanque["hectareas"],
        peso_promedio_g=biometria["peso_promedio_g"],
        supervivencia_estimada=overrides.supervivencia_estimada or SUPERVIVENCIA_ESTIMADA_DEFAULT,
        porcentaje_sobrante_charola=porcentaje_sobrante,
        temperatura_c=temperatura_c,
        oxigeno_mg_l=oxigeno_mg_l,
    )
    return DosisRecomendacionResponse(**resultado.__dict__)


@router.post("/alimentacion", response_model=AlimentacionOut, status_code=201)
def registrar_alimentacion(
    estanque_id: int,
    registro: AlimentacionCreate,
    conn: psycopg.Connection = Depends(get_db_dependency),
):
    get_estanque_o_404(estanque_id, conn)
    return alimentacion_repo.crear(conn, estanque_id, registro)


@router.get("/alimentacion", response_model=list[AlimentacionOut])
def listar_alimentacion(estanque_id: int, conn: psycopg.Connection = Depends(get_db_dependency)):
    get_estanque_o_404(estanque_id, conn)
    return alimentacion_repo.listar(conn, estanque_id)
