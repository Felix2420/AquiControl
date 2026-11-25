from typing import Literal

from pydantic import BaseModel, Field


class CharolaCreate(BaseModel):
    fecha: str
    hora_toma: Literal["mañana", "tarde"]
    porcentaje_sobrante: float = Field(ge=0, le=100)
    ajuste_realizado_kg: float | None = None


class CharolaOut(CharolaCreate):
    id: int
    estanque_id: int
