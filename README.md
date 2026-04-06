# Finance Data Processing & Access Control Backend

A production-ready REST API designed specifically for financial data processing with robust Role-Based Access Control (RBAC). Built with Node.js, TypeScript, Express, Prisma, and PostgreSQL.

This repository fulfills the core requirements of the Backend Architecture Assessment, prioritizing logical separation of concerns, strict access controls, and data integrity over unnecessary complexity.

---

## 🔗 Deployment Links

- **Frontend**: https://rbac-frontend-09a4.onrender.com
- **Backend API**: https://rbac-segw.onrender.com

---

## 🎯 Assessment Alignments

### 1. User and Role Management

- Granular control over users with three robust roles: **VIEWER**, **ANALYST**, and **ADMIN**.
- Secure authentication system powered by Argon2 hashing and JWT token verification.
- Account toggling mechanisms (`isActive` status handling) to instantly revoke access without destructive deletes.
- The default self-registration route dynamically scopes all incoming public users to the highly restrictive `VIEWER` role.

### 2. Financial Records Management

- Complete CRUD API routing under `/api/records`.
- Full structural typings handling explicit fields: `Amount (Decimal)`, `Type (INCOME/EXPENSE)`, `Category`, `Date`, and `Notes`.
- Out-of-the-box backend support for filtering via date ranges, categories, types, and robust text-based search queries across notes.
- Paginating middleware is globally attached to avoid returning enormous database dumps over REST.

### 3. Dashboard Summary APIs

Instead of relying strictly on localized frontend loops, backend aggregation endpoints expose high-performance insights using Prisma SQL translations:

- **`GET /api/dashboard/summary`**: Calculates absolute `Total Income`, `Total Expenses`, and `Net Balance`.
- **`GET /api/dashboard/by-category`**: Performs structured data mapping utilizing `GROUP BY` logic to deliver category-wise distributions.
- **`GET /api/dashboard/trends`**: A highly optimized raw SQL (`$queryRaw`) query grouping massive datasets natively inside PostgreSQL via `TO_CHAR(date, 'YYYY-MM')` without bloating Node.js memory.

### 4. Access Control Logic & Security

Deep access control logic prevents unauthorized mutation or data leaks:

- Record isolation: Non-admins can strictly only fetch/modify their own transactional instances (`userId` matching).
- **IDOR Protection:** The backend purposefully returns `404 Not Found` (rather than `403 Forbidden`) when users request unowned resources to prevent malicious ID enumeration vulnerabilities!
- Endpoints are shielded at the router level by specialized authentication decoders parsing incoming Bearer headers.

### 5. Validation and Error Handling

- Entire payload bodies are validated by **Zod (`z.infer<>`)** schemas.
- Invalid requests instantly abort the cycle, emitting clear, mapped error matrices containing exactly which API field violated expectations.
- Global express error middleware structurally prevents any native server crashes from polluting the JSON interface.

### 6. Data Persistence & Audit Logs

- Built on top of **PostgreSQL** configured cleanly via Prisma ORM schemas.
- **Atomic Auditing**: When `ANALYST` or `ADMIN` users act destructively (such as Updating or Deleting user roles and records), their actions are serialized and logged in an immutable `AuditLog` table. This is executed using bulletproof `prisma.$transaction([])` commits. If the audit log fails, the initial modification rolls back natively to absolute zero.

## ✨ "Additional Thoughtfulness" Included

- **Soft Deletions Architecture**: Prevents cascading hard-deletes. The `$transaction` updates `deletedAt` timestamps, preserving forensic financial timelines.
- **Aggressive Rate Limiting**: General endpoints are shielded to 100 reqs/15m, while specialized `/api/auth` surfaces restrict password bruteforcing locally to 10 reqs/15m.

---

## 🚀 Setup & Execution

### Prerequisites

- Node.js >= 18.x
- pnpm >= 8.x
- PostgreSQL Database URL

### Backend Bootstrapping

```bash
# Install packages
pnpm install

# Configure environment variables
cp .env.example .env
# Important: Define DATABASE_URL, JWT_SECRET, and ALLOWED_ORIGIN in your .env!
# ALLOWED_ORIGIN supports comma-separated values, e.g. http://localhost:3000,https://app.example.com

# Sync Postgres with Prisma Schema & Generate Prisma Client
pnpm exec prisma migrate dev
pnpm exec prisma generate

# Optionally seed the database with 300 test records for UI charting
pnpm exec tsx scripts/seed.ts

# Start the dev server!
pnpm run dev
```

---

## 🔒 Role Permission Matrix

| Action                   | VIEWER   | ANALYST  | ADMIN    |
| ------------------------ | -------- | -------- | -------- |
| Self-register            | ✅       | —        | —        |
| Login / View own profile | ✅       | ✅       | ✅       |
| List / view records      | ✅ (own) | ✅ (own) | ✅ (all) |
| Create / update records  | ❌       | ✅ (own) | ✅ (all) |
| Delete records           | ❌       | ❌       | ✅       |
| View dashboard analytics | ❌       | ✅ (own) | ✅ (all) |
| Manage users             | ❌       | ❌       | ✅       |
| View single user profile | ❌       | ✅       | ✅       |

---

## 📚 API Endpoints Overview

### Authentication

- `POST /api/auth/register` - Create a new user account
- `POST /api/auth/login` - Login and receive JWT token
- `GET /api/auth/profile` - Get current user profile

### Records Management (Protected)

- `GET /api/records` - List records with filtering & pagination
- `GET /api/records/:id` - View single record details
- `POST /api/records` - Create new financial record (ANALYST, ADMIN only)
- `PUT /api/records/:id` - Update existing record (ANALYST, ADMIN only)
- `DELETE /api/records/:id` - Delete record (ADMIN only)

### Dashboard Analytics (Protected)

- `GET /api/dashboard/summary` - Get total income, expenses, net balance
- `GET /api/dashboard/by-category` - Category-wise financial breakdown
- `GET /api/dashboard/trends` - Monthly/weekly financial trends

### User Management (ADMIN only)

- `GET /api/users` - List all users with pagination
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user role and status
- `DELETE /api/users/:id` - Soft delete user

---

## 🏗️ Project Structure

```
src/
├── middleware/          # Authentication, error handling, rate limiting
├── routes/             # API endpoint definitions
├── controllers/        # Business logic & request handlers
├── services/          # Data access & business operations
├── models/            # TypeScript types & interfaces
├── validators/        # Zod validation schemas
└── app.ts            # Express app initialization

prisma/
├── schema.prisma      # Database schema definition
└── migrations/        # Database migration history

scripts/
└── seed.ts           # Database seeding with test data
```

---

## 🧪 Test Credentials

For testing the API locally or on the deployed instance, use these credentials:

| Role    | Email            | Password    |
| ------- | ---------------- | ----------- |
| VIEWER  | viewer@test.com  | password123 |
| ANALYST | analyst@test.com | password123 |
| ADMIN   | admin@test.com   | password123 |

Or create a new account via the `/api/auth/register` endpoint (defaults to VIEWER role).

---

## 🔑 Environment Variables

```env
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/rbac_db
JWT_SECRET=your_secret_key_here
NODE_ENV=development
ALLOWED_ORIGIN=http://localhost:3000,https://rbac-frontend-09a4.onrender.com

# Optional
PORT=3000
```

---

## ⚙️ Key Implementation Details

### Authentication & Security

- JWT-based stateless authentication with Bearer tokens
- Argon2 password hashing for strong security
- Rate limiting to prevent brute force attacks
- CORS configured for specified origins only

### Data Isolation

- Users can only access their own financial records (except ADMIN)
- IDOR (Insecure Direct Object Reference) protection via 404 responses
- Role-based middleware enforces permissions at every endpoint

### Database Features

- **Atomic Transactions**: Audit logging uses `prisma.$transaction()` to ensure data consistency
- **Soft Deletes**: Records marked as deleted without permanent removal for compliance
- **Pagination**: All list endpoints support skip/take for efficient data retrieval
- **Filtering**: Records can be filtered by date range, category, type, and search text

### Error Handling

- Comprehensive input validation using Zod schemas
- Structured JSON error responses with field-level details
- Appropriate HTTP status codes (400, 401, 403, 404, 500)
- Global error middleware prevents unhandled exceptions

---

## 🚀 Deployment

The application is deployed on Render:

- **Frontend**: https://rbac-frontend-09a4.onrender.com
- **Backend API**: https://rbac-segw.onrender.com

The backend is configured to accept requests from the deployed frontend with appropriate CORS settings.

---

## 📋 Assessment Fulfillment Summary

✅ **User and Role Management** - Three-tier RBAC system with user status management
✅ **Financial Records Management** - Complete CRUD with filtering and search capabilities
✅ **Dashboard Summary APIs** - Aggregated data endpoints with efficient SQL queries
✅ **Access Control Logic** - Middleware-based permission enforcement with IDOR protection
✅ **Validation and Error Handling** - Zod-powered input validation and comprehensive error responses
✅ **Data Persistence** - PostgreSQL with Prisma ORM for type-safe database operations
✅ **Additional Enhancements** - Rate limiting, soft deletes, pagination, audit logging, and proper separation of concerns

---

## 📖 Design Philosophy

This backend prioritizes **clarity and maintainability** over unnecessary complexity. Every design decision serves a functional purpose:

- **Services Layer**: Centralizes business logic, making it testable and reusable
- **Middleware Pattern**: Authentication and error handling are orthogonal to route definitions
- **Type Safety**: TypeScript and Zod ensure data integrity at compile and runtime
- **Database Transactions**: Consistency is enforced at the database level, not in application memory
- **Sensible Defaults**: Self-registration defaults users to VIEWER role for security

The goal is a backend that is easy to understand, maintain, and extend—reflecting professional engineering practices without over-engineering.

---

## 📝 Notes & Assumptions

- JWT tokens expire after 24 hours (configurable via environment variables)
- Soft-deleted records are excluded from queries by default
- Dashboard aggregations only include non-deleted records
- All timestamps use ISO 8601 format with UTC timezone
- Pagination defaults to 10 items per page with max limit of 100
