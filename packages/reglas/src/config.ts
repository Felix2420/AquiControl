// Umbrales de negocio. Equivalente a backend/app/config.py.
// Si cambian, actualizar también las tablas de la página Proyecto (se generan desde aquí).

// Simplificación de v1: el schema no rastrea mortalidad, así que la supervivencia
// estimada es una constante configurable en vez de un dato medido.
export const SUPERVIVENCIA_ESTIMADA_DEFAULT = 0.85;

export const UMBRAL_SOBRANTE_ALTO = 15.0;
export const UMBRAL_SOBRANTE_CRITICO = 30.0;

export const TEMP_MIN_OPTIMA = 24.0;
export const TEMP_MAX_OPTIMA = 33.0;
export const TEMP_MIN_EXTREMA = 20.0;
export const TEMP_MAX_EXTREMA = 35.0;

export const O2_CRITICO_MG_L = 3.5;
export const O2_SUSPENSION_MG_L = 2.0;
