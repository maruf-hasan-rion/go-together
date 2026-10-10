# Copilot Instructions for AI Agents

## Project overview
TypeScript/Node.js backend (Express 5 + Prisma 7) for the Go Together events platform, targeting PostgreSQL. ESM (`"type": "module"`) — relative imports use explicit `.js` extensions.

## Architecture
- **Entry:** `src/server.ts` (listen + graceful shutdown + hourly PENDING-booking sweeper via node-cron); `src/app.ts` (helmet, CORS, cookies, raw Stripe webhook route, JSON limits, rate limiter, mounts all routes under `/api/v1`).
- **Routing:** `src/app/routes/index.ts` maps paths to feature routers (`/auth`, `/user`, `/users`, `/event`, `/review`→`/reviews`, `/bookings`, `/payments`, `/admin`, `/meta`).
- **Modules:** `src/app/module/<feature>/` with `*.route.ts`, `*.controller.ts`, `*.service.ts`, `*.validation.ts`, `*.interface.ts`. Controllers never call Prisma; services never touch `req`/`res`.
- **Cross-cutting:** `config/index.ts` (only `process.env` reader, Zod-validated), `lib/{prisma,stripe,redis}`, `middleware/{auth,globalErrorHandler,notFound,rateLimiter,validateRequest}`, `utils/*`, `serializers/user.ts`.

## Conventions
- **Errors:** throw `ApiError(status, message)`; wrap handlers with `catchAsync`.
- **Responses:** always `sendResponse(res, {...})` → `{ success, message, meta, data }` (top-level `meta`, array `data` for lists).
- **Validation:** Zod schemas via `validateRequest` or inline `.parse(...)`; whitelist fields — never spread `req.body` into Prisma.
- **Auth:** `auth(...roles)` accepts `Bearer` header or cookie and re-checks `status`/`deletedAt`.
- **Audit:** call `writeAuditLog(...)` for privileged mutations.
- **Prisma:** generated client lives in `src/generated/prisma` (run `pnpm exec prisma generate` after schema edits); schema is split across `prisma/*.prisma`.

## Workflows
- Dev: `pnpm dev` (`tsx watch`). Build/typecheck: `pnpm build` (`tsc`). Tests: `pnpm test` (Vitest). Lint/format: `pnpm lint:check` / `pnpm format:check` (Biome).
- Migrations: `pnpm exec prisma migrate dev` locally, `migrate deploy` in CI/prod. Prefer additive migrations; never edit applied migrations.
