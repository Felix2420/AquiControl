from pydantic import BaseModel, Field


class DosisRecomendacionRequest(BaseModel):
    """Todos los campos son opcionales: si se omiten, se usa la última lectura
    registrada de cada tipo (charola/agua) para ese estanque."""

    supervivencia_estimada: float | None = Field(default=None, gt=0, le=1)
    porcentaje_sobrante_charola: float | None = Field(default=None, ge=0, le=100)
    temperatura_c: float | None = None
    oxigeno_mg_l: float | None = Field(default=None, ge=0)


class DosisRecomendacionResponse(BaseModel):
    dosis_recomendada_kg: float
    biomasa_estimada_kg: float
    tasa_base_pct: float
    factor_ajuste_total: float
    fca_estimado: float
    justificacion: str


class AlimentacionCreate(BaseModel):
    fecha: str
    dosis_calculada_kg: float = Field(ge=0)
    dosis_aplicada_kg: float | None = Field(default=None, ge=0)
    fca_proyectado: float | None = None
    explicacion_ia: str | None = None


class AlimentacionOut(AlimentacionCreate):
    id: int
    estanque_id: int
