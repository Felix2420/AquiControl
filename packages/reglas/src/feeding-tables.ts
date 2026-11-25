// Tablas de referencia zootécnica para camarón. Datos, no lógica de negocio, para que un
// biólogo pueda ajustarlas sin tocar dose-recommender.ts. Equivalente a feeding_tables.py.

/** [límite superior de peso_promedio_g EXCLUSIVO, valor] */
export type TablaPorPeso = ReadonlyArray<readonly [limite: number, valor: number]>;

/** Tasa base, % de biomasa por día. */
export const TASA_BASE_POR_PESO: TablaPorPeso = [
  [1.0, 15.0],
  [3.0, 8.0],
  [8.0, 6.0],
  [15.0, 4.5],
  [25.0, 3.5],
  [Infinity, 2.5],
];

/** FCA heurístico de referencia por rango de peso. Placeholder de v1: no proviene de un modelo entrenado. */
export const FCA_HEURISTICO_POR_PESO: TablaPorPeso = [
  [1.0, 1.0],
  [3.0, 1.2],
  [8.0, 1.4],
  [15.0, 1.6],
  [25.0, 1.8],
  [Infinity, 2.0],
];

function lookup(tabla: TablaPorPeso, pesoPromedioG: number): number {
  for (const [limite, valor] of tabla) {
    if (pesoPromedioG < limite) return valor;
  }
  return tabla[tabla.length - 1]![1];
}

export const tasaBasePct = (pesoPromedioG: number): number => lookup(TASA_BASE_POR_PESO, pesoPromedioG);

export const fcaHeuristico = (pesoPromedioG: number): number => lookup(FCA_HEURISTICO_POR_PESO, pesoPromedioG);
