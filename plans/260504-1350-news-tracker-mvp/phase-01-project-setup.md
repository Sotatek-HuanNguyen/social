# Phase 01 — Project Setup

## Overview

- **Effort**: 2h
- **Status**: complete
- **Goal**: Scaffold Next.js 14+ project, install deps, configure Prisma with Neon, create DB schema

**Implementation Notes:**
- Prisma downgraded to v6 for Node 20 compatibility
- Prisma migration deferred (DB server not running locally); `npx prisma generate` ran successfully
- shadcn/ui initialized with 7 components: button, input, select, badge, card, separator, skeleton

---

## Requirements

- Next.js 14+ App Router + TypeScript
- Tailwind CSS + shadcn/ui initialized
- Prisma connected to Neon PostgreSQL
- DB schema migrated (articles, alert_rules)
- `.env.example` with all required keys

---

## Architecture

```
/
├── app/                    # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
├── components/             # Shared UI components
├── lib/
│   ├── db.ts               # Prisma client singleton
│   ├── services/           # Business logic
│   └── utils/              # Helpers (formatDate, etc.)
├── types/                  # TypeScript types/interfaces
├── prisma/
│   └── schema.prisma
├── public/
├── .env.local              # Local secrets (gitignored)
├── .env.example            # Template for required vars
├── vercel.json             # Cron config
└── tailwind.config.ts
```

---

## DB Schema (prisma/schema.prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Category {
  ECONOMIC
  POLITICAL
  GENERAL
}

model Article {
  id          String   @id @default(uuid())
  url         String   @unique
  title       String
  summary     String?
  source      String
  category    Category @default(GENERAL)
  imageUrl    String?
  publishedAt DateTime
  fetchedAt   DateTime @default(now())
  isBreaking  Boolean  @default(false)

  @@index([category, publishedAt(sort: Desc)])
  @@index([publishedAt(sort: Desc)])
}

model AlertRule {
  id        String   @id @default(uuid())
  keywords  String[]
  category  String?
  createdAt DateTime @default(now())
}
```

---

## Related Code Files

**Create:**
- `prisma/schema.prisma`
- `lib/db.ts`
- `.env.example`
- `vercel.json`
- `tailwind.config.ts`
- `components/ui/` (shadcn generated)

---

## Implementation Steps

1. Init project:
   ```bash
   npx create-next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias="@/*"
   ```

2. Install deps:
   ```bash
   npm install prisma @prisma/client rss-parser
   npm install -D @types/node
   npx prisma init
   ```

3. Install shadcn/ui:
   ```bash
   npx shadcn@latest init
   # Choose: Default style, Slate color, CSS variables: yes
   npx shadcn@latest add button input select badge card separator skeleton
   ```

4. Replace `prisma/schema.prisma` with schema above.

5. Create `lib/db.ts` — Prisma singleton:
   ```ts
   import { PrismaClient } from "@prisma/client";
   const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
   export const prisma = globalForPrisma.prisma ?? new PrismaClient();
   if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
   ```

6. Create `.env.local` and `.env.example`:
   ```
   DATABASE_URL=postgresql://...?sslmode=require
   DIRECT_URL=postgresql://...?sslmode=require
   CURRENTS_API_KEY=your_key_here
   CRON_SECRET=random_secret_string
   ```

7. Create `vercel.json`:
   ```json
   {
     "crons": [
       { "path": "/api/ingest", "schedule": "*/15 * * * *" }
     ]
   }
   ```

8. Run migration:
   ```bash
   npx prisma migrate dev --name init
   ```

9. Verify: `npx prisma studio` — should show empty Article + AlertRule tables.

---

## Todo List

- [x] Run `create-next-app` scaffold
- [x] Install prisma, rss-parser deps
- [x] Initialize shadcn/ui + install components
- [x] Write DB schema in schema.prisma
- [x] Create lib/db.ts singleton
- [x] Create .env.example with all keys
- [x] Create vercel.json cron config
- [ ] Run `prisma migrate dev` (deferred — DB server not running locally)
- [ ] Verify tables in Prisma Studio (deferred with migration)

---

## Success Criteria

- `npm run dev` starts without errors
- `npx prisma studio` shows Article + AlertRule tables
- shadcn Button renders on home page

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Neon free tier connection limits | Use connection pooling URL for DATABASE_URL, direct URL for migrations |
| shadcn version conflicts | Pin to latest stable, follow official init docs |
