# Finance Data Processing & Access Control Backend

A production-ready REST API designed specifically for financial data processing with robust Role-Based Access Control (RBAC). Built with Node.js, TypeScript, Express, Prisma, and PostgreSQL.

This repository fulfills the core requirements of the Backend Architecture Assessment, prioritizing logical separation of concerns, strict access controls, and data integrity over unnecessary complexity.

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

| Action                     | VIEWER | ANALYST | ADMIN |
|----------------------------|--------|---------|-------|
| Self-register              | ✅      | —       | —     |
| Login / View own profile   | ✅      | ✅       | ✅     |
| List / view records        | ✅ (own)| ✅ (own) | ✅ (all)|
| Create / update records    | ❌      | ✅ (own) | ✅ (all)|
| Delete records             | ❌      | ❌       | ✅     |
| View dashboard analytics   | ❌      | ✅ (own) | ✅ (all)|
| Manage users               | ❌      | ❌       | ✅     |
| View single user profile   | ❌      | ✅       | ✅     |

---