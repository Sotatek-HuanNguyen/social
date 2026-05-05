---
title: "News Tracker MVP"
description: "Near real-time economic-political news tracking with alerts"
status: in_progress
priority: P1
effort: 16h
tags: [feature, frontend, backend, api]
created: 2026-05-04
updated: 2026-05-04
---

# News Tracker MVP

Near real-time economic-political news tracking and alerting (Theo dõi và cảnh báo tin tức kinh tế – chính trị).

## Stack

- **Frontend/Backend**: Next.js 14+ App Router, TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL via Prisma (Neon free tier)
- **Real-time**: SSE (Server-Sent Events)
- **Deployment**: Vercel (free tier, cron jobs)
- **News sources**: Vietnamese RSS feeds + CurrentsAPI (international)

## Phases

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | Project Setup | 2h | complete | [phase-01](./phase-01-project-setup.md) |
| 2 | News Ingestion | 4h | complete | [phase-02](./phase-02-news-ingestion.md) |
| 3 | API Endpoints | 2h | complete | [phase-03](./phase-03-api-endpoints.md) |
| 4 | Frontend UI | 6h | complete | [phase-04](./phase-04-frontend-ui.md) |
| 5 | Testing & Deploy | 2h | in_progress | [phase-05](./phase-05-testing-and-deploy.md) |

## Key Dependencies

- Neon PostgreSQL account (free tier)
- Vercel account (free tier)
- CurrentsAPI key (free, 600 req/day)
- Node.js 18+

## Architecture Overview

```
Vercel Cron (15min)
    → /api/ingest
        → RSS Parser (VnExpress, CafeF, VietnamNet, TuoiTre, ThanhNien)
        → CurrentsAPI (international, hourly)
        → Normalize → Deduplicate → Classify → Save to Neon DB

Browser
    → Next.js App Router (SSR + ISR)
        → /api/articles (paginated feed)
        → /api/alerts/sse (SSE stream for breaking news)
```

## Environment Variables

See `.env.example` created in Phase 1.

## No Auth

Public app. No login. Alert rules are global (shared by all visitors).
