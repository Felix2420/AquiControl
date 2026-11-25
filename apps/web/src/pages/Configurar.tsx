import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Campo } from "@/components/Campo";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import type { Rol } from "@/lib/api";
import {
  useAsignarMiembro,
  useCrearEstanque,
  useCrearGranja,
  useEstanques,
  useGranjas,
  useMiembros,
  useQuitarMiembro,
  useRegistrarBiometria,
} from "@/lib/queries";
import { hoyISO } from "@/lib/utils";
import { useUi } from "@/store/ui";

const RANGO: Record<Rol, number> = { tecnico: 1, biologo: 2, admin: 3 };
const NOMBRE_ROL: Record<Rol, string> = { admin: "Administrador", biologo: "Biólogo", tecnico: "Técnico" };

/** Texto numérico obligatorio y > 0. */
const positivo = (nombre: string) =>
  z.string().refine((v) => v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) > 0, `${nombre} debe ser mayor que 0.`);

const msg = (e: unknown) => (e as Error).message;

export function Configurar() {
  const { data: granjas, isLoading } = useGranjas();
  const [granjaSel, setGranjaSel] = useState<number | null>(null);
  const granja = granjas?.find((g) => g.id === granjaSel) ?? granjas?.[0] ?? null;
  const rol = granja?.rol ?? null;

  return (
    <>
      <div className="pb-3">
        <p className="eyebrow mb-3">CONFIGURACIÓN</p>
        <h1 className="text-[32px] leading-[1.13] tracking-[-0.022em]">Granja y estanques</h1>
        <p className="mt-2 text-muted">Da de alta tu granja, tus estanques y su biometría para poder calcular dosis.</p>
      </div>

      {isLoading ? (
        <div className="card"><div className="skeleton h-12 w-full" /></div>
      ) : (
        <>
          <FormGranja primera={!granjas || granjas.length === 0} />
          {granja && (
            <section className="card" aria-labelledby="granja-activa">
              <h2 id="granja-activa" className="card-title">Granja activa</h2>
              <label htmlFor="granja-select" className="sr-only">Granja</label>
              <Select id="granja-select" value={granja.id} onChange={(e) => setGranjaSel(Number(e.target.value))}>
                {granjas!.map((g) => (
                  <option key={g.id} value={g.id}>{g.nombre} · {NOMBRE_ROL[g.rol]}</option>
                ))}
              </Select>
              {rol && RANGO[rol] < RANGO.biologo && (
                <p className="help">Tu rol de técnico permite capturar lecturas y dosis; crear estanques y biometría requiere biólogo o administrador.</p>
              )}
            </section>
          )}
          {granja && rol && RANGO[rol] >= RANGO.biologo && <FormEstanque granjaId={granja.id} />}
          {granja && rol && RANGO[rol] >= RANGO.biologo && <FormBiometria granjaId={granja.id} />}
          {granja && rol === "admin" && <Miembros granjaId={granja.id} />}
        </>
      )}
    </>
  );
}

// ───────── Granja ─────────
const esquemaGranja = z.object({ nombre: z.string().trim().min(1, "Escribe un nombre."), ubicacion: z.string(), hectareas_totales: positivo("Las hectáreas") });

function FormGranja({ primera }: { primera: boolean }) {
  const crear = useCrearGranja();
  const toast = useUi((s) => s.mostrarToast);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof esquemaGranja>>({
    resolver: zodResolver(esquemaGranja),
    defaultValues: { nombre: "", ubicacion: "", hectareas_totales: "" },
  });
  const enviar = handleSubmit(async (v) => {
    try {
      await crear.mutateAsync({ nombre: v.nombre.trim(), ubicacion: v.ubicacion.trim() || null, hectareas_totales: Number(v.hectareas_totales) });
      toast("Granja creada. Eres su administrador.");
      reset();
    } catch (e) {
      toast(msg(e), "error");
    }
  });
  return (
    <section className="card card-hover" aria-labelledby="nueva-granja">
      <h2 id="nueva-granja" className="card-title"><span className="step">01</span>{primera ? "Crea tu primera granja" : "Nueva granja"}</h2>
      <form onSubmit={enviar} className="space-y-5" noValidate>
        <Campo id="g-nombre" etiqueta="Nombre" error={errors.nombre?.message}><Input id="g-nombre" aria-describedby="g-nombre-ayuda" {...register("nombre")} /></Campo>
        <Campo id="g-ubicacion" etiqueta="Ubicación" ayuda="Opcional."><Input id="g-ubicacion" aria-describedby="g-ubicacion-ayuda" {...register("ubicacion")} /></Campo>
        <Campo id="g-ha" etiqueta="Hectáreas totales" unidad="ha" error={errors.hectareas_totales?.message}><Input id="g-ha" type="number" step="0.1" inputMode="decimal" aria-describedby="g-ha-ayuda" {...register("hectareas_totales")} /></Campo>
        <Button type="submit" variant={primera ? "accent" : "ghost"} cargando={crear.isPending}>Crear granja</Button>
      </form>
    </section>
  );
}

// ───────── Estanque ─────────
const esquemaEstanque = z.object({
  identificador_estanque: z.string().trim().min(1, "Escribe un identificador."),
  hectareas: positivo("Las hectáreas"),
  densidad_siembra: positivo("La densidad"),
  fecha_siembra: z.string().min(1, "Elige la fecha de siembra."),
});

function FormEstanque({ granjaId }: { granjaId: number }) {
  const crear = useCrearEstanque();
  const toast = useUi((s) => s.mostrarToast);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof esquemaEstanque>>({
    resolver: zodResolver(esquemaEstanque),
    defaultValues: { identificador_estanque: "", hectareas: "", densidad_siembra: "", fecha_siembra: hoyISO() },
  });
  const enviar = handleSubmit(async (v) => {
    try {
      await crear.mutateAsync({
        granja_id: granjaId,
        identificador_estanque: v.identificador_estanque.trim(),
        hectareas: Number(v.hectareas),
        densidad_siembra: Number(v.densidad_siembra),
        fecha_siembra: v.fecha_siembra,
      });
      toast("Estanque creado.");
      reset({ identificador_estanque: "", hectareas: "", densidad_siembra: "", fecha_siembra: hoyISO() });
    } catch (e) {
      toast(msg(e), "error");
    }
  });
  return (
    <section className="card card-hover" aria-labelledby="nuevo-estanque">
      <h2 id="nuevo-estanque" className="card-title"><span className="step">02</span>Nuevo estanque</h2>
      <form onSubmit={enviar} className="space-y-5" noValidate>
        <Campo id="e-id" etiqueta="Identificador" ayuda="Por ejemplo E1." error={errors.identificador_estanque?.message}><Input id="e-id" aria-describedby="e-id-ayuda" {...register("identificador_estanque")} /></Campo>
        <Campo id="e-ha" etiqueta="Superficie" unidad="ha" error={errors.hectareas?.message}><Input id="e-ha" type="number" step="0.1" inputMode="decimal" aria-describedby="e-ha-ayuda" {...register("hectareas")} /></Campo>
        <Campo id="e-dens" etiqueta="Densidad de siembra" unidad="org/m²" error={errors.densidad_siembra?.message}><Input id="e-dens" type="number" step="0.1" inputMode="decimal" aria-describedby="e-dens-ayuda" {...register("densidad_siembra")} /></Campo>
        <Campo id="e-fecha" etiqueta="Fecha de siembra" error={errors.fecha_siembra?.message}><Input id="e-fecha" type="date" aria-describedby="e-fecha-ayuda" {...register("fecha_siembra")} /></Campo>
        <Button type="submit" variant="ghost" cargando={crear.isPending}>Crear estanque</Button>
      </form>
    </section>
  );
}

// ───────── Biometría ─────────
const esquemaBio = z.object({
  estanqueId: z.string().min(1, "Elige un estanque."),
  fecha: z.string().min(1, "Elige la fecha."),
  peso_promedio_g: positivo("El peso"),
  ganancia_semanal_g: z.string().refine((v) => v.trim() === "" || Number.isFinite(Number(v)), "Escribe un número válido."),
});

function FormBiometria({ granjaId }: { granjaId: number }) {
  const { data: todos } = useEstanques();
  const estanques = todos?.filter((e) => e.granja_id === granjaId) ?? [];
  const toast = useUi((s) => s.mostrarToast);
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<z.infer<typeof esquemaBio>>({
    resolver: zodResolver(esquemaBio),
    defaultValues: { estanqueId: "", fecha: hoyISO(), peso_promedio_g: "", ganancia_semanal_g: "" },
  });
  const sel = Number(watch("estanqueId") || estanques[0]?.id || 0) || null;
  const registrar = useRegistrarBiometria(sel);
  const enviar = handleSubmit(async (v) => {
    try {
      await registrar.mutateAsync({
        fecha: v.fecha,
        peso_promedio_g: Number(v.peso_promedio_g),
        ganancia_semanal_g: v.ganancia_semanal_g.trim() === "" ? null : Number(v.ganancia_semanal_g),
      });
      toast("Biometría registrada.");
      reset({ estanqueId: v.estanqueId, fecha: hoyISO(), peso_promedio_g: "", ganancia_semanal_g: "" });
    } catch (e) {
      toast(msg(e), "error");
    }
  });
  return (
    <section className="card card-hover" aria-labelledby="nueva-bio">
      <h2 id="nueva-bio" className="card-title"><span className="step">03</span>Registrar biometría</h2>
      {estanques.length === 0 ? (
        <p className="text-muted">Crea un estanque para registrar su biometría.</p>
      ) : (
        <form onSubmit={enviar} className="space-y-5" noValidate>
          <Campo id="b-est" etiqueta="Estanque" error={errors.estanqueId?.message}>
            <Select id="b-est" aria-describedby="b-est-ayuda" {...register("estanqueId")}>
              {estanques.map((e) => <option key={e.id} value={e.id}>{e.identificador_estanque}</option>)}
            </Select>
          </Campo>
          <Campo id="b-fecha" etiqueta="Fecha" error={errors.fecha?.message}><Input id="b-fecha" type="date" aria-describedby="b-fecha-ayuda" {...register("fecha")} /></Campo>
          <Campo id="b-peso" etiqueta="Peso promedio" unidad="g" error={errors.peso_promedio_g?.message}><Input id="b-peso" type="number" step="0.01" inputMode="decimal" aria-describedby="b-peso-ayuda" {...register("peso_promedio_g")} /></Campo>
          <Campo id="b-gan" etiqueta="Ganancia semanal" unidad="g" ayuda="Opcional." error={errors.ganancia_semanal_g?.message}><Input id="b-gan" type="number" step="0.01" inputMode="decimal" aria-describedby="b-gan-ayuda" {...register("ganancia_semanal_g")} /></Campo>
          <Button type="submit" variant="ghost" cargando={registrar.isPending}>Registrar biometría</Button>
        </form>
      )}
    </section>
  );
}

// ───────── Miembros (admin) ─────────
const esquemaMiembro = z.object({ email: z.email("Escribe un correo válido."), rol: z.enum(["admin", "biologo", "tecnico"]) });

function Miembros({ granjaId }: { granjaId: number }) {
  const { data: miembros } = useMiembros(granjaId, true);
  const asignar = useAsignarMiembro(granjaId);
  const quitar = useQuitarMiembro(granjaId);
  const toast = useUi((s) => s.mostrarToast);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof esquemaMiembro>>({
    resolver: zodResolver(esquemaMiembro),
    defaultValues: { email: "", rol: "tecnico" },
  });
  const enviar = handleSubmit(async (v) => {
    try {
      await asignar.mutateAsync(v);
      toast("Miembro actualizado.");
      reset({ email: "", rol: v.rol });
    } catch (e) {
      toast(msg(e), "error");
    }
  });
  return (
    <section className="card card-hover" aria-labelledby="miembros">
      <h2 id="miembros" className="card-title"><span className="step">04</span>Equipo</h2>
      <ul className="divide-y divide-line mb-5">
        {miembros?.map((m) => (
          <li key={m.user_id} className="flex items-center justify-between gap-3 py-3">
            <span className="min-w-0"><span className="block truncate text-paper">{m.nombre}</span><span className="block truncate text-[13px] text-muted">{m.email}</span></span>
            <span className="flex items-center gap-3">
              <span className="tag">{NOMBRE_ROL[m.rol]}</span>
              <button type="button" className="text-[13px] text-muted hover:text-danger" onClick={() => quitar.mutate(m.user_id, { onError: (e) => toast(msg(e), "error") })}>Quitar</button>
            </span>
          </li>
        ))}
      </ul>
      <form onSubmit={enviar} className="space-y-5" noValidate>
        <Campo id="m-email" etiqueta="Correo de la persona" ayuda="Debe haberse registrado antes en Acuicontrol." error={errors.email?.message}><Input id="m-email" type="email" aria-describedby="m-email-ayuda" {...register("email")} /></Campo>
        <Campo id="m-rol" etiqueta="Rol">
          <Select id="m-rol" aria-describedby="m-rol-ayuda" {...register("rol")}>
            <option value="tecnico">Técnico: captura lecturas y dosis</option>
            <option value="biologo">Biólogo: además estanques y biometría</option>
            <option value="admin">Administrador: además equipo</option>
          </Select>
        </Campo>
        <Button type="submit" variant="ghost" cargando={asignar.isPending}>Agregar o cambiar rol</Button>
      </form>
    </section>
  );
}
