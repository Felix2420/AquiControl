// Copia en el cliente de las reglas de dosis del backend, para los indicadores en vivo de la
// captura y el simulador de proyecto.html. La fuente de verdad sigue siendo el backend:
// si cambian backend/app/config.py, feeding_tables.py o dose_recommender.py, actualizar aquí.
(function () {
  const U = {
    supervivencia: 0.85,
    sobranteAlto: 15.0,
    sobranteCritico: 30.0,
    tempMinOptima: 24.0,
    tempMaxOptima: 33.0,
    tempMinExtrema: 20.0,
    tempMaxExtrema: 35.0,
    o2Critico: 3.5,
    o2Suspension: 2.0,
  };

  const TASA_BASE_POR_PESO = [[1, 15], [3, 8], [8, 6], [15, 4.5], [25, 3.5], [Infinity, 2.5]];
  const FCA_POR_PESO = [[1, 1.0], [3, 1.2], [8, 1.4], [15, 1.6], [25, 1.8], [Infinity, 2.0]];

  // round() de Python para x >= 0. toFixed() ya redondea según el valor binario exacto (igual que
  // Python); solo difieren en los empates exactos: JS sube, Python va al dígito par.
  function redondearPy(x, dec = 0) {
    const [ent, frac] = x.toFixed(100).split("."); // expansión decimal exacta del double
    const resto = frac.slice(dec);
    const empate = resto[0] === "5" && /^0*$/.test(resto.slice(1));
    const ultimo = Number(dec === 0 ? ent.slice(-1) : frac[dec - 1]);
    if (empate && ultimo % 2 === 0) return Number(dec === 0 ? ent : `${ent}.${frac.slice(0, dec)}`);
    return Number(x.toFixed(dec));
  }

  // Equivalentes de f"{x:.0f}" y f"{x:.1f}" de Python (mismo desempate al par).
  const f0 = (x) => redondearPy(x).toFixed(0);
  const f1 = (x) => redondearPy(x, 1).toFixed(1);

  function lookup(tabla, peso) {
    for (const [limite, valor] of tabla) if (peso < limite) return valor;
    return tabla[tabla.length - 1][1];
  }

  // Cada factor devuelve { factor, motivo, nivel } con nivel: "ok" | "warn" | "danger".
  function factorSobrante(pct) {
    if (pct == null) return { factor: 1, motivo: null, nivel: "ok" };
    if (pct > U.sobranteCritico)
      return { factor: 0.7, motivo: `${f0(pct)}% de sobrante en charola (nivel crítico)`, nivel: "danger" };
    if (pct > U.sobranteAlto)
      return { factor: pct <= 22.5 ? 0.9 : 0.85, motivo: `${f0(pct)}% de sobrante en charola`, nivel: "warn" };
    return { factor: 1, motivo: null, nivel: "ok" };
  }

  function factorTemperatura(t) {
    if (t == null) return { factor: 1, motivo: null, nivel: "ok" };
    if (t < U.tempMinExtrema || t > U.tempMaxExtrema)
      return { factor: 0.6, motivo: `temperatura extrema de ${f1(t)}°C`, nivel: "danger" };
    if (t < U.tempMinOptima || t > U.tempMaxOptima)
      return { factor: 0.85, motivo: `temperatura de ${f1(t)}°C fuera del rango óptimo (24-33°C)`, nivel: "warn" };
    return { factor: 1, motivo: null, nivel: "ok" };
  }

  function factorOxigeno(o2) {
    if (o2 == null) return { factor: 1, motivo: null, nivel: "ok" };
    if (o2 < U.o2Suspension)
      return {
        factor: 0,
        motivo: `oxígeno disuelto crítico de ${f1(o2)} mg/L (alimentación suspendida, se recomienda aireación/recambio de agua)`,
        nivel: "danger",
      };
    if (o2 < U.o2Critico) return { factor: 0.5, motivo: `oxígeno disuelto bajo de ${f1(o2)} mg/L`, nivel: "warn" };
    return { factor: 1, motivo: null, nivel: "ok" };
  }

  function recomendar({ densidad, hectareas, peso, supervivencia = U.supervivencia, sobrante, temperatura, oxigeno }) {
    const biomasa = densidad * hectareas * 10000 * supervivencia * (peso / 1000);
    const tasa = lookup(TASA_BASE_POR_PESO, peso);
    const base = (biomasa * tasa) / 100;
    const fS = factorSobrante(sobrante);
    const fT = factorTemperatura(temperatura);
    const fO = factorOxigeno(oxigeno);
    const total = fS.factor * fT.factor * fO.factor;
    const motivos = [fO.motivo, fS.motivo, fT.motivo].filter(Boolean);
    const justificacion = motivos.length
      ? `Dosis reducida en ${redondearPy((1 - total) * 100)}% debido a ${motivos.join(" y ")}.`
      : "Dosis calculada sin ajustes: condiciones dentro de rango normal.";
    return {
      dosis: redondearPy(base * total, 3),
      base,
      biomasa,
      tasa,
      fca: lookup(FCA_POR_PESO, peso),
      total,
      factores: { sobrante: fS, temperatura: fT, oxigeno: fO },
      justificacion,
    };
  }

  window.reglas = { U, factorSobrante, factorTemperatura, factorOxigeno, recomendar };
})();
