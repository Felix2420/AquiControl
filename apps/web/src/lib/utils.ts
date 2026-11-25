import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/** Fecha local (no UTC): en México toISOString() adelanta el día por la tarde/noche. */
export function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const fmt = (n: number, dec = 2): string =>
  Number(n).toLocaleString("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec });

/** Descarga un CSV (con BOM para que Excel respete los acentos). */
export function descargarCsv(nombre: string, filas: (string | number | null)[][]): void {
  const celda = (v: string | number | null) => {
    const t = v === null ? "" : String(v);
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const csv = "\ufeff" + filas.map((f) => f.map(celda).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}
