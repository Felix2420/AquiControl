# Acuicontrol

Aplicación web de gestión inteligente de dosis de alimentación camaronícola y optimización del FCA (Factor de Conversión Alimenticia), sin hardware IoT. El técnico captura sobrante en charolas, biometría y parámetros del agua; el sistema recomienda la dosis diaria en kg con una explicación en español.

Ver [CLAUDE.md](CLAUDE.md) para arquitectura, reglas de cálculo y detalles de desarrollo.

## Estructura

| Carpeta | Contenido |
|---|---|
| `apps/api` | API (Hono + TypeScript, Better Auth, Drizzle + PostgreSQL) |
| `apps/web` | Web (React + Vite + Tailwind): información del proyecto, inicio de sesión, captura y configuración de granja |
| `packages/reglas` | Motor de recomendación de dosis, compartido por API y web |
| `backend/`, `frontend/` | Versión 1 original (Python/FastAPI), sin autenticación; se conserva como referencia |

## Inicio rápido

Requiere [Node.js](https://nodejs.org) ≥ 22 y [pnpm](https://pnpm.io) 10.

```
pnpm install
pnpm dev
```

Abre **http://localhost:5173**. La primera pantalla es la información del proyecto; desde **Entrar** puedes crear una cuenta o iniciar sesión. La API corre en el puerto 8000.

Sin configuración extra, los datos se guardan en una base PostgreSQL embebida (PGlite) en `.data/pglite`. Para datos de ejemplo:

```
pnpm seed
```

Esto crea una granja demo con 3 estanques, 14 días de historial y tres usuarios (contraseña `demo12345`): `demo@acuicontrol.test` (admin), `biologo@acuicontrol.test` y `tecnico@acuicontrol.test`. Para regenerarlo: `pnpm seed -- --reset`. Hay un guion de presentación en [docs/GUION_DEMO.md](docs/GUION_DEMO.md).

### Usar tu propio PostgreSQL

1. Crea una base de datos vacía, por ejemplo `acuicontrol_app` (no reutilices una base que ya tenga tablas de la versión 1).
2. Copia `.env.example` a `.env` y ajusta la conexión:
   ```
   DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/acuicontrol_app
   ```
3. Ejecuta `pnpm dev`: las migraciones se aplican solas al arrancar. La API imprime `base de datos: Postgres (DATABASE_URL)` si tomó tu `.env`; si dice PGlite, no lo encontró.

`.env` está en `.gitignore`; no subas tu contraseña. En producción define también `BETTER_AUTH_SECRET`.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | API + web en modo desarrollo |
| `pnpm seed` | Datos y usuario de demostración |
| `pnpm test` | Pruebas (Vitest) de API, reglas y web |
| `pnpm typecheck` | Comprobación de tipos |
| `pnpm lint` | ESLint |

## Roles

Cada usuario solo ve las granjas donde es miembro. Quien crea una granja es su **admin**.

| Rol | Puede |
|---|---|
| técnico | capturar charolas, agua y registrar la alimentación |
| biólogo | lo anterior + registrar biometría y crear estanques |
| admin | lo anterior + gestionar los miembros de la granja |

## Versión 1 (Python, referencia)

```
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python backend\scripts\init_db.py
uvicorn backend.app.main:app --reload --port 8000
```

Abre `http://localhost:8000`. Necesita PostgreSQL y `DATABASE_URL` en `.env`. No la ejecutes a la vez que `pnpm dev` (ambas usan el puerto 8000) ni con la misma base de datos.

## Equipo

Aguilar Félix Jesús Antonio · José Luiz López Bojórquez · Kevin Jesús Cázarez Lara · Manjarrez Oliva Mariana
