// Réplica del redondeo de Python para que API, web y offline den exactamente los mismos textos y cifras.

/**
 * round(x, dec) de Python para x >= 0. toFixed() ya redondea según el valor binario exacto (igual que
 * Python); solo difieren en los empates exactos: JS sube, Python va al dígito par.
 */
export function redondearPy(x: number, dec = 0): number {
  const [ent = "0", frac = ""] = x.toFixed(100).split("."); // expansión decimal exacta del double
  const resto = frac.slice(dec);
  const empate = resto[0] === "5" && /^0*$/.test(resto.slice(1));
  const ultimo = Number(dec === 0 ? ent.slice(-1) : frac[dec - 1]);
  if (empate && ultimo % 2 === 0) {
    return Number(dec === 0 ? ent : `${ent}.${frac.slice(0, dec)}`);
  }
  return Number(x.toFixed(dec));
}

/** Equivalente de f"{x:.0f}" de Python (mismo desempate al par). */
export const f0 = (x: number): string => redondearPy(x).toFixed(0);

/** Equivalente de f"{x:.1f}" de Python (mismo desempate al par). */
export const f1 = (x: number): string => redondearPy(x, 1).toFixed(1);
