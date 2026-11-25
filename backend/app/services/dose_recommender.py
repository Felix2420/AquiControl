"""Motor de recomendación de dosis de alimentación (reglas zootécnicas explícitas, v1).

Función pura, sin I/O de base de datos, para poder testearla de forma aislada.
"""
from dataclasses import dataclass

from ..config import (
    O2_CRITICO_MG_L,
    O2_SUSPENSION_MG_L,
    SUPERVIVENCIA_ESTIMADA_DEFAULT,
    TEMP_MAX_EXTREMA,
    TEMP_MAX_OPTIMA,
    TEMP_MIN_EXTREMA,
    TEMP_MIN_OPTIMA,
    UMBRAL_SOBRANTE_ALTO,
    UMBRAL_SOBRANTE_CRITICO,
)
from .feeding_tables import fca_heuristico, tasa_base_pct


@dataclass
class DosisRecomendada:
    dosis_recomendada_kg: float
    biomasa_estimada_kg: float
    tasa_base_pct: float
    factor_ajuste_total: float
    fca_estimado: float
    justificacion: str


def _factor_por_sobrante(pct: float | None) -> tuple[float, str | None]:
    if pct is None:
        return 1.0, None
    if pct > UMBRAL_SOBRANTE_CRITICO:
        return 0.70, f"{pct:.0f}% de sobrante en charola (nivel crítico)"
    if pct > UMBRAL_SOBRANTE_ALTO:
        factor = 0.90 if pct <= 22.5 else 0.85
        return factor, f"{pct:.0f}% de sobrante en charola"
    return 1.0, None


def _factor_por_temperatura(temp_c: float | None) -> tuple[float, str | None]:
    if temp_c is None:
        return 1.0, None
    if temp_c < TEMP_MIN_EXTREMA or temp_c > TEMP_MAX_EXTREMA:
        return 0.60, f"temperatura extrema de {temp_c:.1f}°C"
    if temp_c < TEMP_MIN_OPTIMA or temp_c > TEMP_MAX_OPTIMA:
        return 0.85, f"temperatura de {temp_c:.1f}°C fuera del rango óptimo (24-33°C)"
    return 1.0, None


def _factor_por_oxigeno(o2_mg_l: float | None) -> tuple[float, str | None]:
    if o2_mg_l is None:
        return 1.0, None
    if o2_mg_l < O2_SUSPENSION_MG_L:
        return 0.0, f"oxígeno disuelto crítico de {o2_mg_l:.1f} mg/L (alimentación suspendida, se recomienda aireación/recambio de agua)"
    if o2_mg_l < O2_CRITICO_MG_L:
        return 0.50, f"oxígeno disuelto bajo de {o2_mg_l:.1f} mg/L"
    return 1.0, None


def _construir_justificacion(motivos: list[str], factor_total: float) -> str:
    if not motivos:
        return "Dosis calculada sin ajustes: condiciones dentro de rango normal."
    reduccion_pct = round((1 - factor_total) * 100)
    return f"Dosis reducida en {reduccion_pct}% debido a " + " y ".join(motivos) + "."


def recomendar_dosis(
    densidad_siembra: float,
    hectareas: float,
    peso_promedio_g: float,
    supervivencia_estimada: float = SUPERVIVENCIA_ESTIMADA_DEFAULT,
    porcentaje_sobrante_charola: float | None = None,
    temperatura_c: float | None = None,
    oxigeno_mg_l: float | None = None,
) -> DosisRecomendada:
    if peso_promedio_g <= 0:
        raise ValueError("peso_promedio_g debe ser mayor a 0; se requiere un muestreo de biometría")

    biomasa_kg = (
        densidad_siembra * hectareas * 10_000 * supervivencia_estimada * (peso_promedio_g / 1000)
    )

    tasa_pct = tasa_base_pct(peso_promedio_g)
    dosis_base_kg = biomasa_kg * tasa_pct / 100

    factor_sobrante, motivo_sobrante = _factor_por_sobrante(porcentaje_sobrante_charola)
    factor_temp, motivo_temp = _factor_por_temperatura(temperatura_c)
    factor_o2, motivo_o2 = _factor_por_oxigeno(oxigeno_mg_l)

    # Multiplicativo: penalizaciones independientes, se mantiene acotado en [0, dosis_base]
    # a diferencia de sumar recortes (que puede dar dosis negativas sin sentido).
    factor_total = factor_sobrante * factor_temp * factor_o2
    dosis_recomendada_kg = round(dosis_base_kg * factor_total, 3)

    motivos = [m for m in (motivo_o2, motivo_sobrante, motivo_temp) if m]
    justificacion = _construir_justificacion(motivos, factor_total)

    return DosisRecomendada(
        dosis_recomendada_kg=dosis_recomendada_kg,
        biomasa_estimada_kg=round(biomasa_kg, 3),
        tasa_base_pct=tasa_pct,
        factor_ajuste_total=round(factor_total, 4),
        fca_estimado=fca_heuristico(peso_promedio_g),
        justificacion=justificacion,
    )
