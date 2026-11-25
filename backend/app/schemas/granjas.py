from pydantic import BaseModel, Field


class GranjaCreate(BaseModel):
    nombre: str
    ubicacion: str | None = None
    hectareas_totales: float = Field(gt=0)


class GranjaOut(GranjaCreate):
    id: int
    fecha_registro: str
