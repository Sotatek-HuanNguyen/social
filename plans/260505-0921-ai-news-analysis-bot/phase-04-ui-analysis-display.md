# Phase 04 — UI Hiển Thị Multi-Team Analysis

## Overview
- **Priority**: Medium
- **Status**: Pending
- **Effort**: 2h
- **Depends on**: Phase 02

## UI Components

### Article Card (update existing)
- Sentiment badge: 🟢 bullish / 🔴 bearish / ⚪ neutral
- Risk badge: low/medium/high/critical (color-coded)
- AI summary dưới title (1 dòng, truncated)

### Article Detail Page (new: `app/articles/[id]/page.tsx`)

```
┌─────────────────────────────────────┐
│ Title                    [Source]    │
│ Published: ...           Category   │
├─────────────────────────────────────┤
│ 📊 Analyst Team                     │
│ Summary: ...                        │
│ Impact: ...                         │
│ Sentiment: 🟢 Bullish              │
├─────────────────────────────────────┤
│ 🔬 Research Team                    │
│ Bull case: ...                      │
│ Bear case: ...                      │
│ Trends: [tag] [tag]                │
│ Related: [event] [event]           │
├─────────────────────────────────────┤
│ 💹 Trading Team                     │
│ Recommendation: BUY (80%)          │
│ Affected: [sector] [sector]        │
├─────────────────────────────────────┤
│ ⚠️ Risk Management                  │
│ Risk: HIGH                          │
│ Warnings: ...                       │
└─────────────────────────────────────┘
```

### Filter additions
- Sentiment filter: all / bullish / bearish / neutral
- Risk filter: all / low / medium / high / critical

## Files

**Create:**
- `app/articles/[id]/page.tsx` — detail page with full analysis
- `components/sentiment-badge.tsx` — colored sentiment indicator
- `components/risk-badge.tsx` — risk level badge
- `components/team-analysis-card.tsx` — reusable card per team section

**Modify:**
- `app/api/articles/route.ts` — include analysis relation
- `app/api/articles/[id]/route.ts` — include analysis
- `components/article-card.tsx` — add badges + summary
- `components/filter-bar.tsx` — add sentiment/risk filters

## Todo
- [ ] Update articles API to include analysis
- [ ] Create `sentiment-badge.tsx`
- [ ] Create `risk-badge.tsx`
- [ ] Create `team-analysis-card.tsx`
- [ ] Create `app/articles/[id]/page.tsx`
- [ ] Update `article-card.tsx` — badges + AI summary
- [ ] Update `filter-bar.tsx` — sentiment + risk filters
- [ ] Test UI with real analysis data
