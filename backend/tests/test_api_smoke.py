def _crear_granja_y_estanque(client):
    granja = client.post(
        "/api/granjas",
        json={"nombre": "Granja Test", "ubicacion": "Sinaloa", "hectareas_totales": 10.0},
    ).json()

    estanque = client.post(
        "/api/estanques",
        json={
            "granja_id": granja["id"],
            "identificador_estanque": "E1",
            "hectareas": 1.0,
            "densidad_siembra": 20.0,
            "fecha_siembra": "2026-06-01",
        },
    ).json()
    return granja, estanque


def test_flujo_completo_estanque_y_dosis(client):
    granja, estanque = _crear_granja_y_estanque(client)
    estanque_id = estanque["id"]

    biometria_resp = client.post(
        f"/api/estanques/{estanque_id}/biometria",
        json={"fecha": "2026-09-14", "peso_promedio_g": 12.5, "ganancia_semanal_g": 1.2},
    )
    assert biometria_resp.status_code == 201

    charola_resp = client.post(
        f"/api/estanques/{estanque_id}/charolas",
        json={
            "fecha": "2026-09-14",
            "hora_toma": "mañana",
            "porcentaje_sobrante": 18.0,
        },
    )
    assert charola_resp.status_code == 201

    agua_resp = client.post(
        f"/api/estanques/{estanque_id}/agua",
        json={"fecha": "2026-09-14", "temperatura_c": 34.0, "oxigeno_mg_l": 5.0},
    )
    assert agua_resp.status_code == 201

    recomendacion_resp = client.post(f"/api/estanques/{estanque_id}/dosis/recomendacion", json={})
    assert recomendacion_resp.status_code == 200
    recomendacion = recomendacion_resp.json()
    assert recomendacion["dosis_recomendada_kg"] > 0
    assert recomendacion["factor_ajuste_total"] < 1.0

    alimentacion_resp = client.post(
        f"/api/estanques/{estanque_id}/alimentacion",
        json={
            "fecha": "2026-09-14",
            "dosis_calculada_kg": recomendacion["dosis_recomendada_kg"],
            "dosis_aplicada_kg": recomendacion["dosis_recomendada_kg"],
            "fca_proyectado": recomendacion["fca_estimado"],
            "explicacion_ia": recomendacion["justificacion"],
        },
    )
    assert alimentacion_resp.status_code == 201

    historial = client.get(f"/api/estanques/{estanque_id}/alimentacion").json()
    assert len(historial) == 1


def test_recomendacion_sin_biometria_devuelve_422(client):
    _, estanque = _crear_granja_y_estanque(client)
    resp = client.post(f"/api/estanques/{estanque['id']}/dosis/recomendacion", json={})
    assert resp.status_code == 422


def test_oxigeno_critico_suspende_alimentacion(client):
    _, estanque = _crear_granja_y_estanque(client)
    estanque_id = estanque["id"]
    client.post(
        f"/api/estanques/{estanque_id}/biometria",
        json={"fecha": "2026-09-14", "peso_promedio_g": 12.5},
    )
    resp = client.post(
        f"/api/estanques/{estanque_id}/dosis/recomendacion",
        json={"oxigeno_mg_l": 1.5},
    )
    assert resp.json()["dosis_recomendada_kg"] == 0
