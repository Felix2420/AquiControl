"""Tablas de referencia zootécnica para camarón. Datos, no lógica de negocio,
para que un biólogo pueda ajustarlas sin tocar dose_recommender.py."""

# (límite superior de peso_promedio_g EXCLUSIVO, tasa base % de biomasa/día)
TASA_BASE_POR_PESO = [
    (1.0, 15.0),
    (3.0, 8.0),
    (8.0, 6.0),
    (15.0, 4.5),
    (25.0, 3.5),
    (float("inf"), 2.5),
]

# FCA heurístico de referencia por rango de peso. Placeholder de v1: no proviene
# de un modelo entrenado; ver TODO en dose_recommender.py.
FCA_HEURISTICO_POR_PESO = [
    (1.0, 1.0),
    (3.0, 1.2),
    (8.0, 1.4),
    (15.0, 1.6),
    (25.0, 1.8),
    (float("inf"), 2.0),
]


def _lookup(tabla: list[tuple[float, float]], peso_promedio_g: float) -> float:
    for limite, valor in tabla:
        if peso_promedio_g < limite:
            return valor
    return tabla[-1][1]


def tasa_base_pct(peso_promedio_g: float) -> float:
    return _lookup(TASA_BASE_POR_PESO, peso_promedio_g)


def fca_heuristico(peso_promedio_g: float) -> float:
    return _lookup(FCA_HEURISTICO_POR_PESO, peso_promedio_g)
