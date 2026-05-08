# AI News Analysis Bot — Multi-Agent Teams

## Overview
- **Goal**: AI bot phân tích tin tức sau mỗi lần ingest, gửi push notification với insights
- **AI Provider**: Google Gemini Flash 2.0 (free tier: 15 RPM, 1M tokens/day)
- **Trigger**: Chạy ngay sau ingest pipeline
- **Architecture**: Multi-agent teams — mỗi team có prompt chuyên biệt
- **Status**: Planning

## Agent Teams

```
[Cron ingest] → [Save articles] → [AI Analysis Pipeline]
                                          ↓
                              ┌───────────┴───────────┐
                              │   Orchestrator         │
                              │   (batch articles)     │
                              └───────────┬───────────┘
                    ┌─────────┬───────────┼───────────┬──────────┐
                    ▼         ▼           ▼           ▼          │
              ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
              │ Analyst  │ │ Research │ │ Trading  │ │  Risk  │ │
              │  Team    │ │  Team    │ │  Team    │ │ Mgmt   │ │
              └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ │
                   └─────────┬──┴────────────┴────────────┘      │
                             ▼                                    │
                   ┌──────────────────┐                          │
                   │ Merge & Rank     │◀─────────────────────────┘
                   │ (combine results)│
                   └────────┬─────────┘
                            ▼
                   ┌──────────────────┐
                   │ Save to DB       │
                   │ + Push if urgent │
                   └──────────────────┘
```

### Team Definitions (inspired by TauricResearch/TradingAgents)

| Team | Role (simplified) | Output |
|------|-------------------|--------|
| **Analyst Team** | Tóm tắt tin, phân tích tác động kinh tế/chính trị, sentiment scoring | `summary`, `impact`, `sentiment` (bullish/bearish/neutral) |
| **Research Team** | Debate bullish vs bearish perspective, tìm bối cảnh + xu hướng | `bullishCase`, `bearishCase`, `trends`, `relatedEvents` |
| **Trading Team** | Đánh giá sectors bị ảnh hưởng, gợi ý hành động (mua/bán/giữ) | `affectedSectors`, `recommendation`, `confidence` |
| **Risk Management** | Đánh giá rủi ro, cảnh báo sớm, quyết định có alert user không | `riskLevel`, `warnings`, `shouldAlert` |

### So sánh với TradingAgents gốc

| Aspect | TradingAgents (gốc) | Phiên bản đơn giản |
|--------|---------------------|-------------------|
| Framework | LangGraph (Python) | Single Gemini prompt (TypeScript) |
| LLM | Multi-provider | Gemini Flash 2.0 only |
| Agents | Separate LLM calls per agent | 1 structured prompt, 4 sections |
| Data | Real-time market data + news | Vietnamese RSS + CurrentsAPI |
| Output | Trade execution | Push notification + UI insights |
| Persistence | SQLite checkpoints | PostgreSQL (Prisma) |
| Debate | Multi-turn agent debate | Single-pass bullish/bearish in prompt |

### Execution Strategy

**Option A — Sequential prompts (KISS, recommended):**
- 1 Gemini call với system prompt chứa tất cả 4 team roles
- Gemini trả về JSON với 4 sections
- Ưu: 1 API call, nhanh, tiết kiệm quota
- Nhược: Nếu 1 section fail → toàn bộ fail

**Option B — Parallel prompts:**
- 4 Gemini calls song song (1 per team)
- Merge results sau
- Ưu: Mỗi team có prompt chuyên sâu hơn
- Nhược: 4x API calls, dễ hit rate limit

→ **Chọn Option A** (KISS principle, free tier friendly)

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | Gemini integration + multi-team prompts | Pending | 3h |
| 2 | Hook vào ingest + store results | Pending | 2h |
| 3 | Enhanced push with AI insights | Pending | 1h |
| 4 | UI hiển thị multi-team analysis | Pending | 2h |

## Key Decisions
- Gemini Flash 2.0 — 1 API call per ingest batch, prompt chứa 4 team roles
- Store analysis per article trong `ArticleAnalysis` model (JSON fields per team)
- Push notification khi Risk Management team đánh giá `riskLevel: "high"` hoặc `"critical"`
- Trend detection: Research Team so sánh với articles 7 ngày gần nhất
- Trading Team sentiment: bullish / bearish / neutral
