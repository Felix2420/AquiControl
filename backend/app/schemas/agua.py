from pydantic import BaseModel, Field


class AguaCreate(BaseModel):
    fecha: str
    temperatura_c: float | None = None
    oxigeno_mg_l: float | None = Field(default=None, ge=0)
    salinidad_ppm: float | None = None
    ph: float | None = None
    amonio_ppm: float | None = None


class AguaOut(AguaCreate):
    id: int
    estanque_id: int
