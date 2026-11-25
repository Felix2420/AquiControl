// Paridad con el recomendador Python original, sobre una rejilla generada por
// scripts/generar_fixture_paridad.py. Sigue siendo una prueba de regresión útil tras retirar backend/.
import { describe, expect, it } from "vitest";
import fixture from "./paridad.fixture.json";
import { recomendarDosis } from "./index";

interface Caso {
  in: {
    densidadSiembra: number;
    hectareas: number;
    supervivenciaEstimada: number;
    pesoPromedioG: number;
    porcentajeSobranteCharola: number | null;
    temperaturaC: number | null;
    oxigenoMgL: number | null;
  };
  out: {
    dosisRecomendadaKg: number;
    biomasaEstimadaKg: number;
    tasaBasePct: number;
    factorAjusteTotal: number;
    fcaEstimado: number;
    justificacion: string;
  };
}

describe("paridad con backend Python", () => {
  const casos = fixture as Caso[];

  it("el fixture no está vacío", () => {
    expect(casos.length).toBeGreaterThan(1000);
  });

  it("produce resultados idénticos en toda la rejilla", () => {
    const diferencias: string[] = [];
    for (const c of casos) {
      const r = recomendarDosis(c.in);
      const obtenido = {
        dosisRecomendadaKg: r.dosisRecomendadaKg,
        biomasaEstimadaKg: r.biomasaEstimadaKg,
        tasaBasePct: r.tasaBasePct,
        factorAjusteTotal: r.factorAjusteTotal,
        fcaEstimado: r.fcaEstimado,
        justificacion: r.justificacion,
      };
      if (JSON.stringify(obtenido) !== JSON.stringify(c.out)) {
        diferencias.push(`${JSON.stringify(c.in)}\n  esperado ${JSON.stringify(c.out)}\n  obtenido ${JSON.stringify(obtenido)}`);
        if (diferencias.length >= 5) break;
      }
    }
    expect(diferencias).toEqual([]);
  });
});
