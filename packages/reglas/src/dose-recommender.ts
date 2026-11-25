// Motor de recomendación de dosis (reglas zootécnicas explícitas, v1). Equivalente a
// dose_recommender.py. Función pura, sin I/O: la usan la API, la web (indicadores en vivo y
// simulador) y el modo offline.
import {
  O2_CRITICO_MG_L,
  O2_SUSPENSION_MG_L,
  SUPERVIVENCIA_ESTIMADA_DEFAULT,
  TEMP_MAX_EXTREMA,
  TEMP_MAX_OPTIMA,
  TEMP_MIN_EXTREMA,
  TEMP_MIN_OPTIMA,
  UMBRAL_SOBRANTE_ALTO,
  UMBRAL_SOBRANTE_CRITICO,
} from "./config";
import { fcaHeuristico, tasaBasePct } from "./feeding-tables";
import { f0, f1, redondearPy } from "./redondeo";

export type Nivel = "ok" | "warn" | "danger";

export interface Factor {
  factor: number;
  motivo: string | null;
  nivel: Nivel;
}

export interface EntradaDosis {
  densidadSiembra: number;
  hectareas: number;
  pesoPromedioG: number;
  supervivenciaEstimada?: number;
  porcentajeSobranteCharola?: number | null;
  temperaturaC?: number | null;
  oxigenoMgL?: number | null;
}

export interface DosisRecomendada {
  dosisRecomendadaKg: number;
  biomasaEstimadaKg: number;
  tasaBasePct: number;
  factorAjusteTotal: number;
  fcaEstimado: number;
  justificacion: string;
  /** Detalle por factor (nivel para los indicadores de la UI). */
  factores: { sobrante: Factor; temperatura: Factor; oxigeno: Factor };
}

const OK: Factor = { factor: 1, motivo: null, nivel: "ok" };

export function factorPorSobrante(pct: number | null | undefined): Factor {
  if (pct == null) return OK;
  if (pct > UMBRAL_SOBRANTE_CRITICO) {
    return { factor: 0.7, motivo: `${f0(pct)}% de sobrante en charola (nivel crítico)`, nivel: "danger" };
  }
  if (pct > UMBRAL_SOBRANTE_ALTO) {
    return { factor: pct <= 22.5 ? 0.9 : 0.85, motivo: `${f0(pct)}% de sobrante en charola`, nivel: "warn" };
  }
  return OK;
}

export function factorPorTemperatura(tempC: number | null | undefined): Factor {
  if (tempC == null) return OK;
  if (tempC < TEMP_MIN_EXTREMA || tempC > TEMP_MAX_EXTREMA) {
    return { factor: 0.6, motivo: `temperatura extrema de ${f1(tempC)}°C`, nivel: "danger" };
  }
  if (tempC < TEMP_MIN_OPTIMA || tempC > TEMP_MAX_OPTIMA) {
    return {
      factor: 0.85,
      motivo: `temperatura de ${f1(tempC)}°C fuera del rango óptimo (24-33°C)`,
      nivel: "warn",
    };
  }
  return OK;
}

export function factorPorOxigeno(o2MgL: number | null | undefined): Factor {
  if (o2MgL == null) return OK;
  if (o2MgL < O2_SUSPENSION_MG_L) {
    return {
      factor: 0,
      motivo: `oxígeno disuelto crítico de ${f1(o2MgL)} mg/L (alimentación suspendida, se recomienda aireación/recambio de agua)`,
      nivel: "danger",
    };
  }
  if (o2MgL < O2_CRITICO_MG_L) {
    return { factor: 0.5, motivo: `oxígeno disuelto bajo de ${f1(o2MgL)} mg/L`, nivel: "warn" };
  }
  return OK;
}

function construirJustificacion(motivos: string[], factorTotal: number): string {
  if (motivos.length === 0) return "Dosis calculada sin ajustes: condiciones dentro de rango normal.";
  const reduccionPct = redondearPy((1 - factorTotal) * 100);
  return `Dosis reducida en ${reduccionPct}% debido a ${motivos.join(" y ")}.`;
}

export function recomendarDosis(entrada: EntradaDosis): DosisRecomendada {
  const {
    densidadSiembra,
    hectareas,
    pesoPromedioG,
    supervivenciaEstimada = SUPERVIVENCIA_ESTIMADA_DEFAULT,
    porcentajeSobranteCharola,
    temperaturaC,
    oxigenoMgL,
  } = entrada;

  if (!(pesoPromedioG > 0)) {
    throw new Error("pesoPromedioG debe ser mayor a 0; se requiere un muestreo de biometría");
  }

  const biomasaKg = densidadSiembra * hectareas * 10_000 * supervivenciaEstimada * (pesoPromedioG / 1000);

  const tasaPct = tasaBasePct(pesoPromedioG);
  const dosisBaseKg = (biomasaKg * tasaPct) / 100;

  const sobrante = factorPorSobrante(porcentajeSobranteCharola);
  const temperatura = factorPorTemperatura(temperaturaC);
  const oxigeno = factorPorOxigeno(oxigenoMgL);

  // Multiplicativo: penalizaciones independientes, se mantiene acotado en [0, dosisBase]
  // a diferencia de sumar recortes (que puede dar dosis negativas sin sentido).
  const factorTotal = sobrante.factor * temperatura.factor * oxigeno.factor;
  const dosisRecomendadaKg = redondearPy(dosisBaseKg * factorTotal, 3);

  // El orden de los motivos replica el backend: oxígeno, sobrante, temperatura.
  const motivos = [oxigeno.motivo, sobrante.motivo, temperatura.motivo].filter((m): m is string => m !== null);

  return {
    dosisRecomendadaKg,
    biomasaEstimadaKg: redondearPy(biomasaKg, 3),
    tasaBasePct: tasaPct,
    factorAjusteTotal: redondearPy(factorTotal, 4),
    fcaEstimado: fcaHeuristico(pesoPromedioG),
    justificacion: construirJustificacion(motivos, factorTotal),
    factores: { sobrante, temperatura, oxigeno },
  };
}

export type EstadoDosis = "normal" | "reducida" | "suspendida";

/** Estado del resultado según factor_ajuste_total: 1 → normal, < 1 → reducida, 0 → suspendida. */
export function estadoDosis(factorAjusteTotal: number): EstadoDosis {
  if (factorAjusteTotal === 0) return "suspendida";
  return factorAjusteTotal < 1 ? "reducida" : "normal";
}
