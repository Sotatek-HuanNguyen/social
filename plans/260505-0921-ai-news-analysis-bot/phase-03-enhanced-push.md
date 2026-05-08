# Phase 03 — Enhanced Push with AI Team Insights

## Overview
- **Priority**: Medium
- **Status**: Pending
- **Effort**: 1h
- **Depends on**: Phase 02

## Changes

### Push payload includes team insights
```ts
await sendPushToAll({
  title: `⚡ ${riskLevel}: ${article.source}`,
  body: `${analyst.summary}\n📊 ${trading.recommendation.toUpperCase()} (${Math.round(trading.confidence * 100)}%)`,
  url: article.url,
  tag: "ai-alert",
});
```

### SW notification styling by risk level
- `critical` → requireInteraction: true (won't auto-dismiss)
- `high` → normal notification
- `medium/low` → silent (no sound)

### Notification grouping
- `tag: "ai-alert"` → replaces previous AI alert
- `tag: "breaking"` → separate from AI alerts

## Todo
- [ ] Update push payload format in ingest
- [ ] Update `sw.js` — handle risk-based notification options
- [ ] Test: ingest → AI detect critical → push with team summary
