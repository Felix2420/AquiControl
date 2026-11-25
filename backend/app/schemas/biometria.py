from pydantic import BaseModel, Field


class BiometriaCreate(BaseModel):
    fecha: str
    peso_promedio_g: float = Field(gt=0)
    ganancia_semanal_g: float | None = None


class BiometriaOut(BiometriaCreate):
    id: int
    estanque_id: int
    biomasa_estimada_kg: float | None = None
