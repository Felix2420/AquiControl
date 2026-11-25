import axios, { AxiosError } from "axios";

export const api = axios.create({ baseURL: "/api", withCredentials: true, timeout: 15_000 });

/** Error con el mensaje legible que manda la API ({ detail }). */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number | null,
  ) {
    super(message);
  }
  /** Sin respuesta del servidor (offline, caído). */
  get esRed() {
    return this.status === null;
  }
}

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError<{ detail?: string | string[]; message?: string }>) => {
    if (!err.response) return Promise.reject(new ApiError("Sin conexión con el servidor", null));
    const d = err.response.data?.detail ?? err.response.data?.message;
    const mensaje = Array.isArray(d) ? d.join("; ") : (d ?? `Error ${err.response.status}`);
    return Promise.reject(new ApiError(mensaje, err.response.status));
  },
);

// ───── Tipos de la API (JSON en snake_case, igual que la API Python original) ─────
export type Rol = "admin" | "biologo" | "tecnico";

export interface Granja {
  id: number;
  nombre: string;
  ubicacion: string | null;
  hectareas_totales: number;
  fecha_registro: string;
  rol: Rol;
}
export interface Estanque {
  id: number;
  granja_id: number;
  identificador_estanque: string;
  hectareas: number;
  densidad_siembra: number;
  fecha_siembra: string;
}
export interface Recomendacion {
  dosis_recomendada_kg: number;
  biomasa_estimada_kg: number;
  tasa_base_pct: number;
  factor_ajuste_total: number;
  fca_estimado: number;
  justificacion: string;
}
export interface Alimentacion {
  id: number;
  estanque_id: number;
  fecha: string;
  dosis_calculada_kg: number;
  dosis_aplicada_kg: number | null;
  fca_proyectado: number | null;
  explicacion_ia: string | null;
  client_id: string | null;
}
export interface Miembro {
  user_id: string;
  nombre: string;
  email: string;
  rol: Rol;
}
