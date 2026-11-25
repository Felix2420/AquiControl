import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Campo } from "@/components/Campo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth";
import { cn } from "@/lib/utils";

const esquema = z.object({
  nombre: z.string(),
  email: z.email("Escribe un correo válido."),
  password: z.string().min(8, "Mínimo 8 caracteres."),
  confirmar: z.string(),
});
type Form = z.infer<typeof esquema>;

const BENEFICIOS = [
  "Dosis diaria en kg para cada estanque, con la explicación en español.",
  "Sobrante, temperatura y oxígeno se capturan desde el celular, en la orilla del estanque.",
  "Historial de lo calculado frente a lo aplicado para ir bajando el FCA.",
];

function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Acuicontrol, ir al inicio">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
        <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
        <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      </svg>
      Acuicontrol
    </Link>
  );
}

export function Login() {
  const { data: sesion, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const [registro, setRegistro] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(esquema), defaultValues: { nombre: "", email: "", password: "", confirmar: "" } });

  if (!isPending && sesion) return <Navigate to="/captura" replace />;

  const cambiarModo = (r: boolean) => {
    setRegistro(r);
    setErrorServidor(null);
    clearErrors();
  };

  const enviar = handleSubmit(async (v) => {
    setErrorServidor(null);
    if (registro) {
      if (v.nombre.trim() === "") return setError("nombre", { message: "Escribe tu nombre." });
      if (v.confirmar !== v.password) return setError("confirmar", { message: "Las contraseñas no coinciden." });
    }
    const { error } = registro
      ? await authClient.signUp.email({ name: v.nombre.trim(), email: v.email, password: v.password })
      : await authClient.signIn.email({ email: v.email, password: v.password });
    if (error) {
      setErrorServidor(
        error.status === 401 || error.code === "INVALID_EMAIL_OR_PASSWORD"
          ? "Correo o contraseña incorrectos."
          : error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
            ? "Ya existe una cuenta con ese correo."
            : error.status === 429
              ? "Demasiados intentos. Espera un momento e inténtalo de nuevo."
              : (error.message ?? "No se pudo completar la solicitud. Revisa tu conexión."),
      );
      return;
    }
    navigate("/captura", { replace: true });
  });

  const tab = (activo: boolean) =>
    cn(
      "min-h-10 flex-1 rounded-[6px] text-[14px] font-medium transition-colors",
      activo ? "bg-surface-2 text-paper shadow-[inset_0_0_0_1px_var(--border-strong)]" : "text-muted hover:text-paper",
    );

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      {/* Panel de marca (solo en pantallas anchas) */}
      <aside className="hero-floor !rounded-none hidden flex-col justify-between !p-12 lg:flex" aria-hidden="true">
        <Logo />
        <div className="max-w-md">
          <p className="eyebrow mb-4">ACUICONTROL</p>
          <p className="hero-title !text-[44px]">Alimentar al camarón con datos, no a ojo.</p>
          <ul className="mt-10 space-y-4">
            {BENEFICIOS.map((b) => (
              <li key={b} className="flex gap-3 text-[15px] text-muted">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[13px] text-muted">Sin sensores ni hardware IoT: solo un celular.</p>
      </aside>

      <main className="flex flex-col px-4 py-8 sm:px-8">
        <div className="mx-auto flex w-full max-w-sm items-center justify-between">
          <Link to="/" className="nav-link -ml-3 gap-1.5">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Información del proyecto
          </Link>
          <span className="lg:hidden"><Logo /></span>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-[28px] font-medium leading-tight tracking-[-0.022em] text-paper">
            {registro ? "Crea tu cuenta" : "Bienvenido de nuevo"}
          </h1>
          <p className="mt-2 text-muted">
            {registro ? "Regístrate para capturar lecturas y recibir recomendaciones." : "Inicia sesión para registrar la alimentación de tus estanques."}
          </p>

          <div className="mt-8 flex gap-1 rounded-[8px] bg-white/[0.03] p-1 shadow-[var(--hairline)]" role="tablist" aria-label="Modo de acceso">
            <button type="button" role="tab" aria-selected={!registro} className={tab(!registro)} onClick={() => cambiarModo(false)}>
              Iniciar sesión
            </button>
            <button type="button" role="tab" aria-selected={registro} className={tab(registro)} onClick={() => cambiarModo(true)}>
              Crear cuenta
            </button>
          </div>

          <form onSubmit={enviar} className="mt-6 space-y-5" noValidate>
            {registro && (
              <Campo id="nombre" etiqueta="Nombre" error={errors.nombre?.message}>
                <Input id="nombre" autoComplete="name" aria-describedby="nombre-ayuda" aria-invalid={!!errors.nombre} {...register("nombre")} />
              </Campo>
            )}
            <Campo id="email" etiqueta="Correo" error={errors.email?.message}>
              <Input id="email" type="email" inputMode="email" autoComplete="email" autoFocus aria-describedby="email-ayuda" aria-invalid={!!errors.email} {...register("email")} />
            </Campo>
            <Campo id="password" etiqueta="Contraseña" ayuda={registro ? "Mínimo 8 caracteres." : undefined} error={errors.password?.message}>
              <div className="relative">
                <Input
                  id="password"
                  type={verPassword ? "text" : "password"}
                  autoComplete={registro ? "new-password" : "current-password"}
                  className="pr-12"
                  aria-describedby="password-ayuda"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                <button
                  type="button"
                  className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[6px] text-muted hover:text-paper"
                  onClick={() => setVerPassword((v) => !v)}
                  aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={verPassword}
                >
                  {verPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                </button>
              </div>
            </Campo>
            {registro && (
              <Campo id="confirmar" etiqueta="Confirmar contraseña" error={errors.confirmar?.message}>
                <Input id="confirmar" type={verPassword ? "text" : "password"} autoComplete="new-password" aria-describedby="confirmar-ayuda" aria-invalid={!!errors.confirmar} {...register("confirmar")} />
              </Campo>
            )}
            {errorServidor && <div className="alerta" role="alert">{errorServidor}</div>}
            <Button type="submit" cargando={isSubmitting}>{registro ? "Crear cuenta" : "Entrar"}</Button>
          </form>
        </div>
      </main>
    </div>
  );
}
