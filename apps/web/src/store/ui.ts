import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Toast {
  id: number;
  mensaje: string;
  tipo: "ok" | "error";
}

interface UiState {
  /** Estanque elegido en la captura; se recuerda entre visitas. */
  estanqueId: number | null;
  setEstanqueId: (id: number | null) => void;
  toast: Toast | null;
  mostrarToast: (mensaje: string, tipo?: Toast["tipo"]) => void;
  ocultarToast: () => void;
}

let contador = 0;

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      estanqueId: null,
      setEstanqueId: (estanqueId) => set({ estanqueId }),
      toast: null,
      mostrarToast: (mensaje, tipo = "ok") => set({ toast: { id: ++contador, mensaje, tipo } }),
      ocultarToast: () => set({ toast: null }),
    }),
    {
      name: "acuicontrol-ui",
      partialize: (s) => ({ estanqueId: s.estanqueId }), // solo se persiste el estanque
    },
  ),
);
