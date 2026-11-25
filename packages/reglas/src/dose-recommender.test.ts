// Port de backend/tests/test_dose_recommender.py
import { describe, expect, it } from "vitest";
import { estadoDosis, recomendarDosis, redondearPy } from "./index";

const BASE = { densidadSiembra: 20, hectareas: 1, pesoPromedioG: 12.5, supervivenciaEstimada: 0.85 };

describe("recomendarDosis", () => {
  it("biomasa sigue la fórmula del spec", () => {
    const r = recomendarDosis(BASE);
    const esperada = 20 * 1 * 10_000 * 0.85 * (12.5 / 1000);
    expect(r.biomasaEstimadaKg).toBeCloseTo(esperada, 6);
  });

  it("sin lecturas no aplica ajustes", () => {
    const r = recomendarDosis(BASE);
    expect(r.factorAjusteTotal).toBe(1);
    expect(r.justificacion).toContain("sin ajustes");
  });

  it("sobrante alto reduce dosis", () => {
    const r = recomendarDosis({ ...BASE, porcentajeSobranteCharola: 18 });
    expect(r.factorAjusteTotal).toBeCloseTo(0.9);
    expect(r.justificacion).toContain("18% de sobrante");
  });

  it("sobrante crítico reduce más", () => {
    const r = recomendarDosis({ ...BASE, porcentajeSobranteCharola: 35 });
    expect(r.factorAjusteTotal).toBeCloseTo(0.7);
    expect(r.justificacion).toContain("crítico");
  });

  it("temperatura fuera de rango óptimo", () => {
    const r = recomendarDosis({ ...BASE, temperaturaC: 34 });
    expect(r.factorAjusteTotal).toBeCloseTo(0.85);
    expect(r.justificacion).toContain("34.0°C");
  });

  it("temperatura extrema reduce más", () => {
    expect(recomendarDosis({ ...BASE, temperaturaC: 36.5 }).factorAjusteTotal).toBeCloseTo(0.6);
  });

  it("oxígeno bajo: reducción crítica", () => {
    expect(recomendarDosis({ ...BASE, oxigenoMgL: 3 }).factorAjusteTotal).toBeCloseTo(0.5);
  });

  it("oxígeno críticamente bajo suspende la alimentación", () => {
    const r = recomendarDosis({ ...BASE, oxigenoMgL: 1.5 });
    expect(r.dosisRecomendadaKg).toBe(0);
    expect(r.justificacion).toContain("suspendida");
    expect(estadoDosis(r.factorAjusteTotal)).toBe("suspendida");
  });

  it("los factores se combinan multiplicativamente", () => {
    const r = recomendarDosis({ ...BASE, porcentajeSobranteCharola: 18, temperaturaC: 34 });
    expect(r.factorAjusteTotal).toBeCloseTo(0.9 * 0.85);
    expect(r.justificacion).toContain("sobrante");
    expect(r.justificacion).toContain("34.0°C");
  });

  it("peso inválido lanza error", () => {
    expect(() => recomendarDosis({ ...BASE, pesoPromedioG: 0 })).toThrow();
  });
});

describe("redondearPy (redondeo al par como Python)", () => {
  it("empates exactos van al dígito par", () => {
    expect(redondearPy(0.5)).toBe(0);
    expect(redondearPy(1.5)).toBe(2);
    expect(redondearPy(2.5)).toBe(2);
    expect(redondearPy(0.125, 2)).toBe(0.12);
    expect(redondearPy(0.375, 2)).toBe(0.38);
  });

  it("respeta el valor binario exacto fuera de empates", () => {
    expect(redondearPy(2.675, 2)).toBe(2.67); // 2.675 es en realidad 2.67499999…
  });
});

describe("estadoDosis", () => {
  it("clasifica por factor", () => {
    expect(estadoDosis(1)).toBe("normal");
    expect(estadoDosis(0.85)).toBe("reducida");
    expect(estadoDosis(0)).toBe("suspendida");
  });
});
