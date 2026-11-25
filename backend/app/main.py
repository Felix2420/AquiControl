from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .routers import agua, alimentacion, biometria, charolas, estanques, granjas

FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"

app = FastAPI(title="Acuicontrol API")

app.include_router(granjas.router)
app.include_router(estanques.router)
app.include_router(biometria.router)
app.include_router(charolas.router)
app.include_router(agua.router)
app.include_router(alimentacion.router)

app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
