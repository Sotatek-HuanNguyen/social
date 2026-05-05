# Deployment Guide

## Prerequisites

- Node.js 20+
- Neon PostgreSQL account (free tier)
- Vercel account (free Hobby or Pro)
- CurrentsAPI key (free, 600 req/day)

## Local Development Setup

### 1. Clone and install
```bash
git clone <repo-url>
cd social
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```

Edit `.env.local`:
| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon pooled URL |
| `DIRECT_URL` | Neon direct URL |
| `CURRENTS_API_KEY` | From currentsapi.services |
| `CRON_SECRET` | Any random string |

### 3. Setup database
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Run dev server
```bash
npm run dev
# Open http://localhost:3000
```

### 5. Test ingestion manually
```bash
curl "http://localhost:3000/api/ingest?secret=<CRON_SECRET>"
# or
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/ingest
```

## Vercel Deployment

### 1. Deploy
```bash
npm i -g vercel
vercel --prod
```

### 2. Add environment variables
```bash
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add CURRENTS_API_KEY production
vercel env add CRON_SECRET production
```

### 3. Run migration on Neon
```bash
DATABASE_URL="<neon-direct-url>" npx prisma migrate deploy
```

### 4. Cron configuration

`vercel.json`:
```json
{
  "crons": [
    { "path": "/api/ingest?secret=CRON_SECRET", "schedule": "0 8 * * *" }
  ]
}
```

- **Hobby plan**: Daily at 8am UTC (`0 8 * * *`)
- **Pro plan**: Up to every 15min (`*/15 * * * *`)

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon pooled connection string |
| `DIRECT_URL` | Yes | Neon direct connection (migrations) |
| `CURRENTS_API_KEY` | Yes | CurrentsAPI free tier key |
| `CRON_SECRET` | Yes | Secret protecting ingest endpoint |

## Production URL

https://social-eosin-zeta.vercel.app

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm test` | Run unit tests (vitest) |
| `npm run lint` | Run ESLint |
| `npx prisma studio` | Open Prisma Studio (local) |
| `npx prisma migrate dev` | Create and apply migrations (dev) |
| `npx prisma migrate deploy` | Apply migrations (production) |
