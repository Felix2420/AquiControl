import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type Alimentacion,
  type Estanque,
  type Granja,
  type Miembro,
  type Recomendacion,
  type Rol,
} from "./api";

export const useGranjas = () =>
  useQuery({ queryKey: ["granjas"], queryFn: async () => (await api.get<Granja[]>("/granjas")).data });

export const useEstanques = () =>
  useQuery({ queryKey: ["estanques"], queryFn: async () => (await api.get<Estanque[]>("/estanques")).data });

export const useHistorial = (estanqueId: number | null) =>
  useQuery({
    queryKey: ["alimentacion", estanqueId],
    enabled: estanqueId !== null,
    queryFn: async () => (await api.get<Alimentacion[]>(`/estanques/${estanqueId}/alimentacion`)).data,
  });

export const useMiembros = (granjaId: number | null, habilitado: boolean) =>
  useQuery({
    queryKey: ["miembros", granjaId],
    enabled: granjaId !== null && habilitado,
    queryFn: async () => (await api.get<Miembro[]>(`/granjas/${granjaId}/miembros`)).data,
  });

export interface LecturasOverride {
  porcentaje_sobrante_charola: number | null;
  temperatura_c: number | null;
  oxigeno_mg_l: number | null;
}

export const useRecomendacion = (estanqueId: number | null) =>
  useMutation({
    mutationFn: async (lecturas: LecturasOverride) =>
      (await api.post<Recomendacion>(`/estanques/${estanqueId}/dosis/recomendacion`, lecturas)).data,
  });

export interface NuevaAlimentacion {
  fecha: string;
  dosis_calculada_kg: number;
  dosis_aplicada_kg: number;
  fca_proyectado: number;
  explicacion_ia: string;
  client_id: string;
}

export function useRegistrarAlimentacion(estanqueId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (datos: NuevaAlimentacion) =>
      (await api.post<Alimentacion>(`/estanques/${estanqueId}/alimentacion`, datos)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alimentacion", estanqueId] }),
  });
}

// ── Configuración ──
export function useCrearGranja() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: { nombre: string; ubicacion: string | null; latitud: number | null; longitud: number | null; hectareas_totales: number }) =>
      (await api.post<Granja>("/granjas", d)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["granjas"] }),
  });
}

export function useEliminarGranja() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/granjas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["granjas"] });
      qc.invalidateQueries({ queryKey: ["estanques"] });
    },
  });
}

export function useCrearEstanque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: Omit<Estanque, "id">) => (await api.post<Estanque>("/estanques", d)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estanques"] }),
  });
}

export const useRegistrarBiometria = (estanqueId: number | null) =>
  useMutation({
    mutationFn: async (d: { fecha: string; peso_promedio_g: number; ganancia_semanal_g: number | null }) =>
      (await api.post(`/estanques/${estanqueId}/biometria`, d)).data,
  });

export function useAsignarMiembro(granjaId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: { email: string; rol: Rol }) =>
      (await api.put<Miembro>(`/granjas/${granjaId}/miembros`, d)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["miembros", granjaId] }),
  });
}

export function useQuitarMiembro(granjaId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => api.delete(`/granjas/${granjaId}/miembros/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["miembros", granjaId] }),
  });
}
