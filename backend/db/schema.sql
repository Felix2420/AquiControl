-- Acuicontrol - esquema inicial (PostgreSQL)

CREATE TABLE IF NOT EXISTS granjas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT NOT NULL,
    ubicacion TEXT,
    hectareas_totales DOUBLE PRECISION NOT NULL CHECK (hectareas_totales > 0),
    fecha_registro TEXT NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY-MM-DD')
);

CREATE TABLE IF NOT EXISTS estanques (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    granja_id BIGINT NOT NULL REFERENCES granjas(id),
    identificador_estanque TEXT NOT NULL,
    hectareas DOUBLE PRECISION NOT NULL CHECK (hectareas > 0),
    densidad_siembra DOUBLE PRECISION NOT NULL CHECK (densidad_siembra > 0),
    fecha_siembra TEXT NOT NULL,
    UNIQUE (granja_id, identificador_estanque)
);

CREATE TABLE IF NOT EXISTS muestreos_biometria (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    estanque_id BIGINT NOT NULL REFERENCES estanques(id),
    fecha TEXT NOT NULL,
    peso_promedio_g DOUBLE PRECISION NOT NULL CHECK (peso_promedio_g > 0),
    ganancia_semanal_g DOUBLE PRECISION,
    biomasa_estimada_kg DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS lecturas_charolas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    estanque_id BIGINT NOT NULL REFERENCES estanques(id),
    fecha TEXT NOT NULL,
    hora_toma TEXT NOT NULL CHECK (hora_toma IN ('mañana', 'tarde')),
    porcentaje_sobrante DOUBLE PRECISION NOT NULL CHECK (porcentaje_sobrante BETWEEN 0 AND 100),
    ajuste_realizado_kg DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS parametros_agua (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    estanque_id BIGINT NOT NULL REFERENCES estanques(id),
    fecha TEXT NOT NULL,
    temperatura_c DOUBLE PRECISION,
    oxigeno_mg_l DOUBLE PRECISION CHECK (oxigeno_mg_l IS NULL OR oxigeno_mg_l >= 0),
    salinidad_ppm DOUBLE PRECISION,
    ph DOUBLE PRECISION,
    amonio_ppm DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS alimentacion_diaria (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    estanque_id BIGINT NOT NULL REFERENCES estanques(id),
    fecha TEXT NOT NULL,
    dosis_calculada_kg DOUBLE PRECISION NOT NULL,
    dosis_aplicada_kg DOUBLE PRECISION,
    fca_proyectado DOUBLE PRECISION,
    explicacion_ia TEXT
);

CREATE INDEX IF NOT EXISTS idx_estanques_granja ON estanques(granja_id);
CREATE INDEX IF NOT EXISTS idx_biometria_estanque ON muestreos_biometria(estanque_id, fecha);
CREATE INDEX IF NOT EXISTS idx_charolas_estanque ON lecturas_charolas(estanque_id, fecha);
CREATE INDEX IF NOT EXISTS idx_agua_estanque ON parametros_agua(estanque_id, fecha);
CREATE INDEX IF NOT EXISTS idx_alimentacion_estanque ON alimentacion_diaria(estanque_id, fecha);
