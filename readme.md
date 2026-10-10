# Go Together — Backend

REST API for the **Go Together** events & activities platform: users browse and book events, hosts create and run them, admins keep the platform running.

**Stack:** Node.js · Express 5 · TypeScript (ESM) · Prisma 7 (driver adapters) · PostgreSQL · Zod 4 · JWT (dual Bearer + cookie) · Stripe · Cloudinary · Redis.

---

## Requirements

| Tool | Version |
| --- | --- |
| Node.js | >= 20.9 |
| PostgreSQL | 14+ |
| pnpm | 10+ (npm/yarn also work) |

---

## Getting started

```bash
pnpm install                 # also runs `prisma generate` (postinstall)
cp .env.example .env         # then fill in the values (see table below)
pnpm exec prisma migrate dev # create + apply migrations (local dev)
pnpm dev                     # starts with auto-reload (tsx watch)
```

Server listens on `http://localhost:${PORT}` (default `5000`).

---

## Demo accounts

```bash
pnpm run seed    # upserts three demo users, password: Demo@1234
```

| Role | Email |
| --- | --- |
| Admin | `admin@gotogether.dev` |
| Host | `host@gotogether.dev` (approved application) |
| User | `user@gotogether.dev` |

These power the frontend's one-click demo login buttons.

---

## Environment variables

`src/config/index.ts` is the **only** file that reads `process.env`; everything else imports `config` from there. Values are Zod-validated at boot — the process exits if a required var is missing.

| Variable | Required | Default | Purpose |
| --- | :---: | --- | --- |
| `NODE_ENV` | – | `development` | `development` \| `production` \| `test` |
| `PORT` | – | `5000` | HTTP port |
| `DATABASE_URL` | ✅ | – | Postgres connection string |
| `JWT_SECRET` | ✅ | – | Access-token signing key |
| `JWT_SECRET_EXPIRES_IN` | – | `1h` | Access-token lifetime |
| `REFRESH_TOKEN_SECRET` | ✅ | – | Refresh-token signing key |
| `REFRESH_TOKEN_EXPIRES_IN` | – | `90d` | Refresh-token lifetime |
| `SALT_ROUND` | – | `10` | bcrypt cost factor |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | – | `""` | Event image uploads |
| `STRIPE_SECRET_KEY` | – | `""` | Stripe API key (Payments) |
| `WEBHOOK_SECRET_KEY` | – | `""` | Stripe webhook signing secret |
| `CORS_ORIGINS` | – | localhost + Vercel | Comma-separated allowlist |
| `COOKIE_SECRET` | – | dev value | cookie-parser secret (rotate) |
| `DEMO_MODE` | – | `false` | Auto-approve demo payments (**development only**) |
| `FRONTEND_URL` | – | `http://localhost:3000` | Used in password-reset links |
| `RESET_TOKEN_TTL_MINUTES` | – | `10` | Password-reset token TTL |
| `REDIS_URL` | – | `""` | Redis connection (falls back to in-memory) |
| `GOOGLE_CLIENT_ID` | – | `""` | Google sign-in audience |
| `SMTP_HOST` / `_PORT` / `_USER` / `_PASS` / `_FROM` | – | – | Outgoing email (password reset) |

> Rotate `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and `COOKIE_SECRET` before any shared/production use:
> `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | `tsx watch src/server.ts` |
| `pnpm build` | `tsc` type-check + emit to `dist/` |
| `pnpm start` | run the compiled server (`node dist/src/server.js`) |
| `pnpm test` | `vitest run` |
| `pnpm format:check` / `format:fix` | Biome format (`src`, `tests`, `prisma`) |
| `pnpm lint:check` / `lint:fix` | Biome lint (`src`, `tests`) |
| `pnpm exec prisma <cmd>` | `generate`, `migrate dev`, `migrate deploy`, `studio` |

---

## Architecture

```
src/
├─ server.ts                 # listen + graceful shutdown + hourly PENDING-booking sweeper (node-cron)
├─ app.ts                    # helmet, CORS, cookies, raw Stripe webhook route, JSON, rate limit, /api/v1
└─ app/
   ├─ config/index.ts        # the only env reader (Zod-validated)
   ├─ lib/{prisma,stripe,redis,...}.ts
   ├─ middleware/{auth,globalErrorHandler,notFound,rateLimiter,validateRequest}.ts
   ├─ serializers/user.ts    # password-free projections
   ├─ utils/{catchAsync,sendResponse,pagination,pick,jwt,ApiError,audit,multipartJson,fileUploader,...}.ts
   └─ module/<feature>/      # auth, user, event, booking, payment, review, admin, meta
```

**Module contract** — each feature has `<name>.route.ts` · `.controller.ts` · `.service.ts` · `.validation.ts` · `.interface.ts`:
- Routes wire `auth(...roles)`, rate limiters, and `validateRequest(...)`.
- Controllers read `req`/`req.user`, call the service, and reply via `sendResponse`.
- Services hold all business logic and every Prisma call. **Controllers never touch Prisma; services never touch `req`/`res`.**
- Never spread `req.body` into Prisma — validated fields are destructured explicitly.

**Response envelope** — success: `{ success, message, meta, data }` (list responses put `meta` at the **top level** and `data` is an array); errors: `{ success: false, message, errors: [] }`.

**Auth model** — every login/registration issues an access JWT (≈1h) and a **session-backed** refresh token (90d, hash-only storage). Tokens are delivered **both** as `accessToken`/`refreshToken` cookies and in the JSON body. `auth(...roles)` accepts `Authorization: Bearer <token>` **or** the cookie, and re-checks the user's `status`/`deletedAt` on every request. Refresh rotates with a 30s grace; `/auth/logout` revokes the session.

---

## API summary (all under `/api/v1`)

| Area | Endpoints |
| --- | --- |
| **Auth** | `POST /auth/register`, `/auth/login`, `/auth/google`, `/auth/refresh-token`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/change-password`, `POST /auth/apply-host`, `GET /auth/me` |
| **Users** | `POST /user/create-user` (multipart), `PATCH /user/update-my-profile` (multipart), `GET /users/:id` (public) |
| **Events** | `GET /event`, `GET /event/recent-events`, `GET /event/my-events`, `GET /event/my-hosted-events`, `GET /event/:id`, `GET /event/:id/participants`, `POST /event/create-event`, `PATCH /event/:id`, `PATCH /event/:id/complete`, `DELETE /event/:id` (soft) |
| **Bookings** | `POST /bookings`, `GET /bookings/my-bookings`, `GET /bookings/:id`, `PATCH /bookings/:id/cancel` (+ `DELETE` alias) |
| **Payments** | `POST /payments/create-intent`, `POST /payments/confirm`, `GET /payments/history`, `POST /payments/webhook` (raw, Stripe-signed) |
| **Reviews** | `POST /reviews`, `GET /reviews/event/:eventId`, `/reviews/host/:hostId`, `/reviews/my-review/:eventId`, `/reviews/public-testimonials` |
| **Admin** | `GET /admin/users`, `/admin/hosts`, `/admin/host-applications`, `PATCH /admin/host-applications/:id/approve\|reject`, `PATCH /admin/users/:id/block\|unblock`, `DELETE /admin/users/:id` (soft) |
| **Meta** | `GET /meta` (role-scoped), `GET /meta/landing-page` (public) |

Multipart endpoints (`create-user`, `update-my-profile`, `create-event`, `update-event`) expect `data` = JSON string + optional `file`.

---

## Testing

`pnpm test` runs Vitest. Unit tests live in `tests/unit/`. Integration suites (booking concurrency, refunds, the Stripe webhook) need a dedicated test database via `DATABASE_URL_TEST`.

---

## Deployment

`pnpm install` → `pnpm exec prisma migrate deploy` → `pnpm build` → `pnpm start`. Set every required env var on the host. Point a Stripe webhook at `https://<host>/api/v1/payments/webhook` (event `payment_intent.succeeded`) and copy its signing secret into `WEBHOOK_SECRET_KEY`.
