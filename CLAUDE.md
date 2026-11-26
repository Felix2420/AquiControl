# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es Acuicontrol

Acuicontrol es una aplicación web para optimizar la dosis diaria de alimento en granjas camaronícolas y reducir el FCA (Factor de Conversión Alimenticia), sin hardware IoT. Un técnico/biólogo captura datos de campo (sobrante en charolas de muestreo, biometría del camarón, parámetros físico-químicos del agua) y el sistema recomienda una dosis en kg/día con una justificación explicable en español.

Origen: el proyecto nació de un spec/prompt (`gemini-code-*.txt`, conservado en la raíz) escrito para pedirle a un asistente de IA que diseñara la arquitectura inicial. La v1 se hizo en Python/FastAPI; la **v0.2** la reescribió en TypeScript con cuentas de usuario.

Glosario de dominio (términos que se mantienen en español en código y DB):
- **estanque**: pond
- **charola** (de muestreo): feeding tray used to estimate leftover feed
- **sobrante**: leftover feed percentage found in a charola
- **FCA**: Feed Conversion Ratio (kg alimento / kg biomasa ganada)
- **biometría**: periodic shrimp weight sampling
- **biomasa**: estimated total shrimp weight in a pond

## Dos aplicaciones en el repo

| | Ubicación | Estado |
|---|---|---|
| **v0.2 (vigente)** | `apps/api`, `apps/web`, `packages/reglas` (monorepo pnpm) | Es la que se desarrolla. Tiene inicio de sesión, roles y multi-granja. |
| **v1 (legado)** | `backend/` (FastAPI + SQLite/Postgres) y `frontend/` (HTML + Tailwind CDN) | Sin autenticación. Se conserva como referencia y como fuente del fixture de paridad de las reglas. No añadir funciones aquí. |

Si te piden algo de la app "que se corre con `pnpm dev`" (login, `/captura`, `/configurar`), es v0.2. Si ves `uvicorn`, es la v1.

## Stack (v0.2)

| Capa | Elección | Razón |
|---|---|---|
| API | Hono + `@hono/node-server`, TypeScript, Zod (`@hono/zod-validator`) | Ligera; los errores replican el formato de FastAPI (`{ detail }`, 422 en validación) para no cambiar el cliente. |
| Auth | Better Auth (correo + contraseña, mín. 8) con adaptador Drizzle | Sesiones por cookie, mismo origen (Vite hace proxy de `/api`). |
| DB | PostgreSQL vía Drizzle ORM (`apps/api/src/db/schema.ts`), migraciones en `apps/api/drizzle/` | Con `DATABASE_URL` usa `pg`; sin ella usa **PGlite** (Postgres embebido en `.data/pglite`, sin instalar nada). Las migraciones se aplican solas al arrancar (`db/client.ts`). |
| Reglas de dosis | `packages/reglas` (TypeScript puro) | Función pura compartida por la API y la web (indicadores en vivo y simulador). |
| Web | React 19 + Vite + Tailwind 4, React Router, TanStack Query, react-hook-form + Zod, Zustand | Sin PWA/offline todavía. |
| Tests | Vitest | `pnpm test` corre API, reglas y web. |

## Comandos

Requiere Node ≥ 22 y pnpm 10.

```
pnpm install
cp .env.example .env        # opcional; sin DATABASE_URL se usa PGlite
pnpm dev                    # API en :8000 + web en http://localhost:5173
pnpm seed                   # granja demo: 3 estanques, 14 días de historial, usuarios admin/biologo/tecnico (ver apps/api/src/db/seed.ts)
pnpm seed -- --reset        # borra y regenera la granja demo
pnpm test                   # vitest en todos los paquetes
pnpm typecheck              # tsc --noEmit en todos los paquetes
pnpm lint                   # eslint .
pnpm --filter @acuicontrol/api db:generate   # genera migración Drizzle tras cambiar schema.ts
```

Abrir **http://localhost:5173** (la API sola no sirve la web). Si el puerto 8000 está ocupado (p. ej. `uvicorn` de la v1) la API no arranca.

El `.env` se carga desde la **raíz** del monorepo (`apps/api/src/env.ts`, importado primero en `index.ts` y `seed.ts`); `dotenv/config` a secas buscaba en `apps/api` y caía en PGlite sin avisar. Al arrancar, la API imprime qué motor usa. Usar una base propia de la v0.2 (p. ej. `acuicontrol_app`), distinta de la de la v1.

Variables (`.env`, ignorado por git; ver `.env.example`): `DATABASE_URL`, `TEST_DATABASE_URL`, `BETTER_AUTH_SECRET` (obligatoria en producción), `BETTER_AUTH_URL`, `PORT`. `docker-compose.yml` levanta Postgres 16 + API, pero está escrito **sin probar** (no hay Docker en la máquina de desarrollo).

## Arquitectura (v0.2)

**API** (`apps/api/src`): `index.ts` conecta DB + Better Auth y arranca; `app.ts` (`crearApp`) arma las rutas y recibe `db` y `resolverSesion` inyectados, por eso los tests (`api.test.ts`) usan PGlite en memoria con una sesión falsa en vez de Better Auth. Todo bajo `/api` exige sesión (`access.ts#exigirSesion`), salvo `/api/salud` y `/api/auth/*`.
- Rutas en `routes/granjas.ts` y `routes/estanques.ts`; validación en `schemas.ts`.
- **Autorización por granja** (`access.ts`): un usuario solo ve granjas donde es miembro (`granja_miembros`); roles `tecnico < biologo < admin`. Un ajeno recibe **404, no 403**. El técnico captura charolas, agua y alimentación; el biólogo además registra biometría y crea estanques; solo el admin gestiona miembros (y no puede quitarse a sí mismo).
- Endpoint clave: `POST /api/estanques/{id}/dosis/recomendacion` es un **preview que no persiste**: toma overrides opcionales del body o, si se omiten, la última biometría/charola/agua del estanque (422 si no hay biometría). El técnico confirma y entonces `POST /api/estanques/{id}/alimentacion` persiste (`dosis_calculada_kg` vs `dosis_aplicada_kg` quedan separadas). Ese POST es **idempotente por `client_id`** (reenvíos de una cola offline devuelven el registro original con 200).
- Tablas: `user`/`session`/`account`/`verification` (Better Auth) + `granjas`, `granja_miembros`, `estanques`, `muestreos_biometria`, `lecturas_charolas`, `parametros_agua`, `alimentacion_diaria`.

**Reglas** (`packages/reglas/src`): `dose-recommender.ts` (`recomendarDosis`, `estadoDosis`), `feeding-tables.ts` (tasa base % por rango de peso y FCA heurístico, separados de la lógica), `config.ts` (umbrales), `redondeo.ts` (replica el `round()` al par y `f"{x:.0f}"` de Python). `paridad.fixture.json` (generado con `scripts/generar_fixture_paridad.py` desde el recomendador Python) y `paridad.test.ts` garantizan que el resultado sea idéntico al de la v1.

Algoritmo de dosis:
1. `biomasa_kg = densidad_siembra * hectareas * 10_000 * supervivencia_estimada * (peso_promedio_g / 1000)`.
2. `dosis_base_kg = biomasa_kg * tasa_base_pct(peso_promedio_g) / 100`.
3. Factores de corrección **multiplicativos** (acotan la dosis en `[0, dosis_base]`): sobrante en charola (>15 %: ×0.90/×0.85; >30 %: ×0.70), temperatura (fuera de 24–33 °C: ×0.85; <20 o >35: ×0.60), oxígeno (<3.5 mg/L: ×0.50; <2.0 mg/L: ×0 = suspensión).
4. Estado por `factorAjusteTotal`: 1 → Normal, < 1 → Reducida, 0 → Suspendida (con suspensión, registrar exige marcar una casilla).

**Web** (`apps/web/src`):
- Rutas (`App.tsx`): `/` **Proyecto** (página informativa, pública y primera pantalla), `/entrar` (login/registro, fuera del `Layout`), `/captura` (flujo Estanque → Lecturas → Recomendación → Confirmar + historial) y `/configurar` (granja, estanques, biometría, miembros) protegidas por `Protegida` → redirige a `/entrar`. `Layout.tsx` es ancho en `/` y de formulario (`max-w-xl`) en el resto.
- `pages/Proyecto.tsx`: escena del estanque fija con scroll, problema, flujo, fórmulas, simulador interactivo, glosario, tecnología, equipo. Usa `@acuicontrol/reglas` directamente. **Si cambian umbrales (`config.ts`) o tablas (`feeding-tables.ts`), actualizar también las tablas escritas a mano en esta página** y la sección «Lo que falta» si cambia el alcance.
- Animaciones: `[data-reveal]` / `[data-reveal-group]` (aparecen con desenfoque al entrar en pantalla, `useRevelar`) y efectos ligados al scroll (`useScroll`); todo respeta `prefers-reduced-motion`.
- `/captura` incluye un historial con gráfica SVG de dosis recomendada vs aplicada (`components/GraficaDosis.tsx`, 14 registros) y exportación a CSV (`descargarCsv` en `lib/utils.ts`).
- `/configurar` incluye mapas de ubicación (`components/MapaUbicacion.tsx`, Leaflet + OpenStreetMap/Esri satélite, sin llave de API): al crear granja o estanque se hace clic en el mapa y se guardan `latitud`/`longitud` (columnas opcionales, migración `0001`). Los mosaicos necesitan internet; sin conexión el mapa queda gris pero la página funciona. El seed pone coordenadas a la granja demo y sus estanques.
- Datos: `lib/api.ts` (cliente HTTP, `ApiError`), `lib/queries.ts` (TanStack Query), `lib/auth.ts` (Better Auth client), `lib/validacion.ts` (Zod alineado con la API), `store/ui.ts` (estanque elegido persistido + toasts `aria-live` en lugar de `alert()`). `hoyISO()` usa fecha local, no UTC.
- Diseño: `frontend/DESIGN.md` (estilo Linear: oscuro, Inter + JetBrains Mono, bordes finos, un solo acento lima `#e4f222` para la acción principal de cada vista). Tokens y clases de componente (`.card`, `.field`, `.btn-accent`…) en `src/styles/app.css` (copia del de la v1), mapeados a utilidades Tailwind en `src/index.css` (`bg-surface`, `text-muted`, `divide-line`…).
- Desviaciones intencionales de DESIGN.md: inputs a 18px (no 14px) para lectura en campo y evitar zoom en iOS; ámbar `#e2a336` solo para el estado "Reducida".

## v1 legado (`backend/`, `frontend/`)

```
python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt
python backend\scripts\init_db.py       # crea la BD si falta + aplica schema.sql (idempotente); --test para acuicontrol_test
python backend\scripts\seed_demo.py
uvicorn backend.app.main:app --reload --port 8000   # http://localhost:8000 (sirve frontend/ y /docs)
cd backend && pytest
```

FastAPI + psycopg 3 (`dict_row`), SQL a mano en `backend/db/schema.sql`, sin ORM, **PostgreSQL** (ya no SQLite). Lee `DATABASE_URL` del `.env` de la raíz (`config.py`). **Ojo:** usa las mismas variables que la v0.2 y tablas con los mismos nombres; no apuntar ambas apps a la misma base. Las columnas de fecha son `TEXT` (ISO `YYYY-MM-DD`). Capas: `routers/` → `repositories/` → `db.py`; `services/dose_recommender.py` es la versión de referencia de las reglas (si se cambian las reglas, regenerar el fixture de paridad de `packages/reglas`). El frontend de la v1 (`proyecto.html`, `js/reglas.js`…) ya no se mantiene.

## Limitaciones conocidas

- `supervivencia_estimada` es una constante configurable (0.85), no un dato medido — no hay tabla de mortalidad.
- `fca_estimado` es una heurística por rango de peso, no un modelo entrenado. Reemplazarlo por un modelo con tracking de MAE es trabajo futuro.
- Sin PWA instalable ni modo offline en la web (la API ya es idempotente por `client_id` para soportar una cola offline).
- `docker-compose.yml` sin probar.
- Las migraciones de Drizzle chocarán si se apuntan a una base que ya contiene las tablas de la v1 (mismos nombres): usar bases distintas.

Guion de presentación y checklist previo: `docs/GUION_DEMO.md`.
