# Copilot Instructions — Diskus

Purpose: give an AI coding agent the minimal, actionable knowledge to be productive in this repo.

- Quick start (dev): the monorepo uses Bun and three workspaces. From the repo root:
  - Run the full dev stack: `bun run dev` (root `package.json` script runs `backend`, `dashboard`, `widget` dev servers)
  - Build artifacts: `bun run build:widget` and `bun run build:dashboard` (root scripts)

- Architecture (big picture):
  - Backend: `backend/` — Hono-based HTTP app. Entry is `backend/src/index.ts`. Routes split into `routes/`, controllers in `controllers/`, and business logic in `services/`.
  - Dashboard: SPA admin UI in `dashboard/` (Vite + Preact/React). Client talks to backend via `/api/v1` (see `dashboard/src/lib/api.ts`).
  - Widget: embeddable Preact widget in `widget/`. The embed entry is `widget/src/embed.tsx` which mounts `DiskusWidget` into third-party pages using Shadow DOM and injects styles.
  - DB & migrations: `backend/drizzle/` contains SQL migrations and `drizzle.config.ts` at `backend/drizzle.config.ts`.

- Critical flows and integration points (concrete examples):
  - Embed token flow: widget code calls `GET /api/v1/widget/embed-token?api_key=...` (see `widget/src/embed.tsx` and `backend/src/controllers/widget.controller.ts#getEmbedToken`). The widget must obtain a temporary embed token before rendering.
  - CORS & security: `backend/src/index.ts` applies different CORS middleware per route prefix: widget routes use `widgetCorsMiddleware` (open CORS), admin/auth use `adminCorsMiddleware` (restricted to dashboard origin). When changing endpoints, check these middlewares.
  - Auth header: dashboard client sets `Authorization: Bearer <token>` in `dashboard/src/lib/api.ts` via `fetchWithAuth`.
  - Honeypot anti-bot: backend form endpoints check `_diskus_trap` and deliberately return dummy success for bots (see `WidgetController.register` and `postComment`).
  - Notifications: email notifications use a service under `backend/src/services/notification.service.ts` (Resend/send provider keys live in account/site config). Search there before changing email behavior.

- Project-specific conventions & patterns:
  - Services layer: business logic lives in `backend/src/services/*` and controllers are thin wrappers (no DB queries in controllers).
  - Routes: `backend/src/routes/*` mount controllers. Prefer adding new endpoints in `routes/` and controller methods in `controllers/`.
  - Shadow DOM styling: `widget/src/embed.tsx` injects `@property` CSS rules into the host `<head>` because browsers ignore them inside Shadow DOM — replicate that pattern if changing CSS.
  - SPA support for embeds: widget scans the document and patches `history.pushState`/`replaceState`, and listens to framework events (`astro:page-load`) — keep these hooks if modifying widget initialization.
  - API URL override: widget uses `data-api-url` attribute; dashboard uses Vite `VITE_API_URL`. Defaults assume backend served at `/api/v1`.

- Files to look at first (examples):
  - `backend/src/index.ts` — server and route wiring
  - `backend/src/controllers/widget.controller.ts` — embed, getComments, postComment flows
  - `backend/src/middlewares/security.ts` — CORS and security headers
  - `backend/drizzle/` and `backend/drizzle.config.ts` — migrations and DB schema
  - `widget/src/embed.tsx` — embedding logic, attribute API (`data-app-id`, `data-thread-key`, `data-api-url`, `data-title`)
  - `widget/src/components/DiskusWidget.tsx` — client-side comment rendering and hooks
  - `dashboard/src/lib/api.ts` — client-side API wrapper and auth flow

- Non-discoverable but important: runtime expectations
  - Dev uses `bun` (scripts call `bun run dev`). Ensure `bun` is installed when running the dev script.
  - Backend exports `{ port, fetch }` (Bun-friendly) — deployment may expect that shape.

If anything above is unclear or you'd like the instructions to include more examples (e.g., sample API requests, environment vars, or deploy notes), tell me which areas to expand. I'll iterate. 
