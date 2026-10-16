# MuggedMoments

MuggedMoments is a deterministic, high-trust event planning and vendor marketplace engineered for the Indian event services industry (weddings, birthdays, corporate celebrations, milestone gatherings).

## 📖 Master Testing & QA Documentation
For complete architecture documentation, state machines, business invariants, and exhaustive test suites written to 30+ year principal engineering standards:
👉 **[Read the Master QA & Testing Playbook](./QA_TESTING_PLAYBOOK.md)**

---

## 🛠️ Tech Stack
- **Framework:** Next.js 16 (App Router, Server Components)
- **UI & State:** React 19, Tailwind CSS v4, Zod
- **Database & ORM:** PostgreSQL (Neon), Prisma 6
- **Test Automation:** Vitest (Unit), Playwright (E2E)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20+
- PostgreSQL database

### 2. Environment Setup
Configure your `.env` file:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/muggedmoments?schema=public"
DATABASE_URL_UNPOOLED="postgresql://user:password@localhost:5432/muggedmoments?schema=public"
```

### 3. Database Migration & Seeding
```bash
# Generate Prisma Client
npx prisma generate

# Apply Migrations
npx prisma migrate deploy

# Seed Development Catalog and Test Personas
npx prisma db seed
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Testing Suites

```bash
# Run 23 Vitest Unit Suites (200+ tests)
npm run test

# Run Integration Tests with real dev server & DB
npm run test:integration

# Run Playwright E2E User Journey Tests
npm run test:e2e

# Run Typecheck
npx tsc --noEmit
```
> ⚠️ **Note:** Avoid running `npm run build` concurrently while `npm run dev` is active in another shell to prevent `.next` cache collision.

