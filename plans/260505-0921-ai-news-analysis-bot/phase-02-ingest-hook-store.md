# Phase 02 — Hook vào Ingest + Store Multi-Team Results

## Overview
- **Priority**: High
- **Status**: Pending
- **Effort**: 2h
- **Depends on**: Phase 01

## Database Schema

```prisma
model ArticleAnalysis {
  id        String   @id @default(cuid())
  articleId String   @unique
  article   Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)

  // Analyst Team
  summary   String
  impact    String
  sentiment String   // bullish | bearish | neutral

  // Research Team
  bullishCase    String?
  bearishCase    String?
  trends         String[]
  relatedEvents  String[]

  // Trading Team
  affectedSectors  String[]
  recommendation   String   // buy | sell | hold
  confidence       Float    @default(0)

  // Risk Management
  riskLevel    String   // low | medium | high | critical
  warnings     String[]
  shouldAlert  Boolean  @default(false)

  createdAt DateTime @default(now())
}
```

Update `Article` model: add `analysis ArticleAnalysis?`

## Implementation Steps

### 1. Update Prisma schema + migrate
### 2. Modify `app/api/ingest/route.ts`

After saving articles:
```ts
import { analyzeArticles } from "@/lib/ai/news-analyzer";

// Collect newly created articles (not duplicates)
const newArticles = [...];

if (newArticles.length > 0 && process.env.GEMINI_API_KEY) {
  try {
    const analyses = await analyzeArticles(newArticles);
    for (const analysis of analyses) {
      const article = newArticles[analysis.index];
      if (!article) continue;
      await prisma.articleAnalysis.upsert({
        where: { articleId: article.id },
        update: { ...flattenAnalysis(analysis) },
        create: { articleId: article.id, ...flattenAnalysis(analysis) },
      });
    }

    // Push if Risk Management says shouldAlert
    const urgent = analyses.find((a) => a.risk.shouldAlert);
    if (urgent) {
      const article = newArticles[urgent.index];
      await sendPushToAll({
        title: `⚡ ${urgent.risk.riskLevel.toUpperCase()}: ${article.source}`,
        body: urgent.analyst.summary,
        url: article.url,
        tag: "ai-alert",
      });
    }
  } catch { /* AI failure never blocks ingest */ }
}
```

### 3. Helper `flattenAnalysis()`
```ts
function flattenAnalysis(a: TeamAnalysis) {
  return {
    summary: a.analyst.summary,
    impact: a.analyst.impact,
    sentiment: a.analyst.sentiment,
    bullishCase: a.research.bullishCase,
    bearishCase: a.research.bearishCase,
    trends: a.research.trends,
    relatedEvents: a.research.relatedEvents,
    affectedSectors: a.trading.affectedSectors,
    recommendation: a.trading.recommendation,
    confidence: a.trading.confidence,
    riskLevel: a.risk.riskLevel,
    warnings: a.risk.warnings,
    shouldAlert: a.risk.shouldAlert,
  };
}
```

## Todo
- [ ] Add `ArticleAnalysis` model + relation to Prisma
- [ ] Run migration
- [ ] Track newly created articles in ingest
- [ ] Call `analyzeArticles()` after ingest
- [ ] Save flattened results to DB
- [ ] Push notification when `shouldAlert = true`
- [ ] Add `GEMINI_API_KEY` to Vercel env

## Risks
| Risk | Mitigation |
|------|-----------|
| Vercel 10s timeout (Hobby) | Gemini Flash ~3-5s for 20 articles; OK for now |
| Index mismatch | Validate `analysis.index < newArticles.length` |
| Duplicate analysis | `articleId @unique` + upsert |
