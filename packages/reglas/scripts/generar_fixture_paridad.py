"""Genera src/paridad.fixture.json ejecutando el recomendador Python real sobre una rejilla de
entradas. El test de TS (paridad.test.ts) exige resultados idénticos. Se conserva para poder
regenerar el fixture si cambian las reglas (mientras exista backend/).

Uso (desde la raíz del repo, con el venv activo):
    python packages/reglas/scripts/generar_fixture_paridad.py
"""
import itertools
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(RAIZ / "backend"))

from app.services.dose_recommender import recomendar_dosis  # noqa: E402

PESOS = [0.5, 1.0, 2.9, 3.0, 7.99, 8.0, 12.5, 15.0, 24.9, 25.0, 40.0]
SOBRANTES = [None, 0.0, 15.0, 15.5, 22.5, 23.0, 30.0, 30.1, 50.0]
TEMPS = [None, 19.9, 20.0, 23.9, 24.0, 33.0, 33.1, 35.0, 35.1]
O2S = [None, 1.5, 2.0, 3.4, 3.5, 5.0]
GRANJAS = [(20.0, 1.5, 0.85), (7.5, 0.5, 0.7), (60.0, 2.5, 0.9)]

casos = []
for (dens, ha, sup), peso, sob, temp, o2 in itertools.product(GRANJAS, PESOS, SOBRANTES, TEMPS, O2S):
    r = recomendar_dosis(
        densidad_siembra=dens,
        hectareas=ha,
        peso_promedio_g=peso,
        supervivencia_estimada=sup,
        porcentaje_sobrante_charola=sob,
        temperatura_c=temp,
        oxigeno_mg_l=o2,
    )
    casos.append(
        {
            "in": {
                "densidadSiembra": dens,
                "hectareas": ha,
                "supervivenciaEstimada": sup,
                "pesoPromedioG": peso,
                "porcentajeSobranteCharola": sob,
                "temperaturaC": temp,
                "oxigenoMgL": o2,
            },
            "out": {
                "dosisRecomendadaKg": r.dosis_recomendada_kg,
                "biomasaEstimadaKg": r.biomasa_estimada_kg,
                "tasaBasePct": r.tasa_base_pct,
                "factorAjusteTotal": r.factor_ajuste_total,
                "fcaEstimado": r.fca_estimado,
                "justificacion": r.justificacion,
            },
        }
    )

destino = RAIZ / "packages" / "reglas" / "src" / "paridad.fixture.json"
destino.write_text(json.dumps(casos, ensure_ascii=False), encoding="utf-8")
print(f"{len(casos)} casos escritos en {destino}")
