import pytest

from app.services.dose_recommender import recomendar_dosis

BASE_KWARGS = dict(
    densidad_siembra=20.0,
    hectareas=1.0,
    peso_promedio_g=12.5,
    supervivencia_estimada=0.85,
)


def test_biomasa_sigue_la_formula_del_spec():
    resultado = recomendar_dosis(**BASE_KWARGS)
    biomasa_esperada = 20.0 * 1.0 * 10_000 * 0.85 * (12.5 / 1000)
    assert resultado.biomasa_estimada_kg == pytest.approx(biomasa_esperada, rel=1e-6)


def test_sin_lecturas_no_aplica_ajustes():
    resultado = recomendar_dosis(**BASE_KWARGS)
    assert resultado.factor_ajuste_total == 1.0
    assert "sin ajustes" in resultado.justificacion


def test_sobrante_alto_reduce_dosis():
    resultado = recomendar_dosis(**BASE_KWARGS, porcentaje_sobrante_charola=18.0)
    assert resultado.factor_ajuste_total == pytest.approx(0.90)
    assert "18% de sobrante" in resultado.justificacion


def test_sobrante_critico_reduce_mas():
    resultado = recomendar_dosis(**BASE_KWARGS, porcentaje_sobrante_charola=35.0)
    assert resultado.factor_ajuste_total == pytest.approx(0.70)
    assert "crítico" in resultado.justificacion


def test_temperatura_fuera_de_rango_optimo():
    resultado = recomendar_dosis(**BASE_KWARGS, temperatura_c=34.0)
    assert resultado.factor_ajuste_total == pytest.approx(0.85)
    assert "34.0°C" in resultado.justificacion


def test_temperatura_extrema_reduce_mas():
    resultado = recomendar_dosis(**BASE_KWARGS, temperatura_c=36.5)
    assert resultado.factor_ajuste_total == pytest.approx(0.60)


def test_oxigeno_bajo_reduccion_critica():
    resultado = recomendar_dosis(**BASE_KWARGS, oxigeno_mg_l=3.0)
    assert resultado.factor_ajuste_total == pytest.approx(0.50)


def test_oxigeno_criticamente_bajo_suspende_alimentacion():
    resultado = recomendar_dosis(**BASE_KWARGS, oxigeno_mg_l=1.5)
    assert resultado.dosis_recomendada_kg == 0
    assert "suspendida" in resultado.justificacion


def test_factores_se_combinan_multiplicativamente():
    resultado = recomendar_dosis(
        **BASE_KWARGS,
        porcentaje_sobrante_charola=18.0,
        temperatura_c=34.0,
    )
    assert resultado.factor_ajuste_total == pytest.approx(0.90 * 0.85)
    assert "sobrante" in resultado.justificacion
    assert "34.0°C" in resultado.justificacion


def test_peso_invalido_lanza_error():
    with pytest.raises(ValueError):
        recomendar_dosis(**{**BASE_KWARGS, "peso_promedio_g": 0})
