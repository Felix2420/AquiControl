import { useEffect, useState } from "react";

export const prefiereMenosMovimiento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Anima una cifra de `desde` a `hasta` (easeOutCubic). Sin animación si se prefiere menos movimiento. */
export function useContar(hasta: number, desde: number, dur = 900): number {
  const [valor, setValor] = useState(prefiereMenosMovimiento() ? hasta : desde);
  useEffect(() => {
    if (prefiereMenosMovimiento()) {
      setValor(hasta);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const paso = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setValor(desde + (hasta - desde) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [hasta, desde, dur]);
  return valor;
}

/** false en el primer render y true tras dos frames: dispara transiciones CSS de entrada. */
export function useMontado(): boolean {
  const [listo, setListo] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setListo(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  return listo;
}
