# Finance Data Processing & Access Control Backend

A production-ready REST API for financial data processing with role-based access control (RBAC), built with Node.js, TypeScript, Express, Prisma, and PostgreSQL.

## Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Runtime        | Node.js                             |
| Language       | TypeScript (strict mode)            |
| Framework      | Express 5                           |
| Database       | PostgreSQL                          |
| ORM            | Prisma 7 (schema-first, migrations)|
| Auth           | JWT (`jsonwebtoken`) + Argon2       |
| Validation     | Zod (schema-first, `z.infer<>`)     |
| Rate Limiting  | `express-rate-limit`                |
| Package Manager| pnpm                                |

## Prerequisites

- **Node.js** >= 18.x
- **pnpm** >= 8.x
- **PostgreSQL** (local or hosted, e.g., Neon)

## Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd rbac

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your database URL and JWT secret

# 4. Run database migrations
pnpm exec prisma migrate dev

# 5. Generate Prisma client
pnpm exec prisma generate

# 6. Start the dev server
pnpm run dev
```

## Scripts

| Command              | Description                      |
|----------------------|----------------------------------|
| `pnpm run dev`       | Start dev server with hot reload |
| `pnpm run build`     | Compile TypeScript to `dist/`    |
| `pnpm run start`     | Run compiled production build    |
| `pnpm run db:migrate`| Run Prisma migrations            |
| `pnpm run db:generate`| Generate Prisma client          |
| `pnpm run db:studio` | Open Prisma Studio               |

## API Endpoints

### Auth (`/api/auth`)

| Method | Path        | Access          | Description             |
|--------|-------------|-----------------|-------------------------|
| POST   | `/register` | Public          | Self-register as VIEWER |
| POST   | `/login`    | Public          | Returns JWT token       |
| GET    | `/me`       | Authenticated   | Get own profile         |

### Users (`/api/users`)

| Method | Path    | Access         | Description                    |
|--------|---------|----------------|--------------------------------|
| POST   | `/`     | ADMIN          | Create user with any role      |
| GET    | `/`     | ADMIN          | List all users (paginated)     |
| GET    | `/:id`  | ADMIN, ANALYST | Get single user profile        |
| PATCH  | `/:id`  | ADMIN          | Update role or isActive        |
| DELETE | `/:id`  | ADMIN          | Soft-delete user               |

### Records (`/api/records`)

| Method | Path    | Access         | Description                    |
|--------|---------|----------------|--------------------------------|
| GET    | `/`     | Authenticated  | List records (filtered, paged) |
| GET    | `/:id`  | Authenticated  | Get single record              |
| POST   | `/`     | ANALYST, ADMIN | Create financial record        |
| PATCH  | `/:id`  | ANALYST, ADMIN | Update record                  |
| DELETE | `/:id`  | ADMIN          | Soft-delete record             |

### Dashboard (`/api/dashboard`)

| Method | Path           | Access         | Description                |
|--------|----------------|----------------|----------------------------|
| GET    | `/summary`     | ANALYST, ADMIN | Income, expense, balance   |
| GET    | `/by-category` | ANALYST, ADMIN | Totals grouped by category |
| GET    | `/trends`      | ANALYST, ADMIN | Monthly breakdown (12 mo)  |
| GET    | `/recent`      | ANALYST, ADMIN | Last 10 transactions       |

### Health

| Method | Path           | Access | Description    |
|--------|----------------|--------|----------------|
| GET    | `/api/health`  | Public | Health check   |

## Role Permission Matrix

| Action                     | VIEWER | ANALYST | ADMIN |
|----------------------------|--------|---------|-------|
| Self-register              | ✅      | —       | —     |
| Login / View own profile   | ✅      | ✅       | ✅     |
| List / view records        | ✅ (own)| ✅ (own) | ✅ (all)|
| Create / update records    | ❌      | ✅ (own) | ✅ (all)|
| Delete records             | ❌      | ❌       | ✅     |
| View dashboard             | ❌      | ✅ (own) | ✅ (all)|
| Manage users               | ❌      | ❌       | ✅     |
| View single user profile   | ❌      | ✅       | ✅     |

## Design Decisions & Assumptions

### Authentication & Roles
- **Self-registration** always produces a `VIEWER` role.
- **Admin can create users** via `POST /api/users` with any role (VIEWER, ANALYST, ADMIN).
- **Admin can promote/demote** any other user, including other admins.
- **Admin cannot modify or delete their own account** — self-guard returns `403`.
- **Role changes take effect only after re-login** — JWT limitation. The role in the token is immutable until a new token is issued.
- **`isActive: false` users are blocked at login**, not just at route level. Disabled users cannot authenticate even with a valid password.

### Data Access & Ownership
- **Non-admin users can only access their own records** — enforced at the service layer across list, get, update, and delete operations.
- **Admin users can access all records** — the ownership filter is bypassed for the ADMIN role.
- **Dashboard data is scoped by user** — non-admin users see aggregates of their own data only.

### Soft Deletes
- **No hard-delete endpoints exist** — all deletions set `deletedAt` to the current timestamp.
- All queries check for soft-deleted records and either filter them out or return appropriate errors.

### Security
- **Passwords are never returned** in any API response — enforced via Prisma `select` fields.
- **JWT payload is validated with Zod** after decoding — prevents accepting tokens with tampered or missing fields.
- **Rate limiting** is applied globally (100 req/15min) and more strictly on auth endpoints (10 req/15min).
- **Environment variables are validated at startup** — the app refuses to start if any required config is missing or invalid.

### Validation
- All input is validated using **Zod schemas** at the middleware level before reaching controllers.
- Update schemas enforce **at least one field** to prevent empty Prisma updates.
- Types are inferred from schemas using `z.infer<>` — no duplicate interface declarations.

## Environment Variables

| Variable              | Required | Default   | Description                    |
|-----------------------|----------|-----------|--------------------------------|
| `PORT`                | No       | `3000`    | Server port                    |
| `NODE_ENV`            | No       | `development` | Environment mode           |
| `DATABASE_URL`        | Yes      | —         | PostgreSQL connection string   |
| `JWT_SECRET`          | Yes      | —         | JWT signing key (min 32 chars) |
| `JWT_EXPIRY`          | No       | `7d`      | Token expiration duration      |
| `RATE_LIMIT_WINDOW_MS`| No      | `900000`  | Rate limit window (ms)         |
| `RATE_LIMIT_MAX`      | No       | `100`     | Max requests per window        |
| `AUTH_RATE_LIMIT_MAX` | No       | `10`      | Max auth requests per window   |