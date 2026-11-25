from pydantic import BaseModel, Field


class EstanqueCreate(BaseModel):
    granja_id: int
    identificador_estanque: str
    hectareas: float = Field(gt=0)
    densidad_siembra: float = Field(gt=0)
    fecha_siembra: str


class EstanqueOut(EstanqueCreate):
    id: int
