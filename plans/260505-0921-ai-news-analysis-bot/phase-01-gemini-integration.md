# Phase 01 — Gemini Integration + Multi-Team Analysis Service

## Overview
- **Priority**: High
- **Status**: Pending
- **Effort**: 3h
- **Depends on**: Existing ingest pipeline

## Architecture

```
lib/ai/
├── gemini-client.ts       # Gemini API client singleton
├── news-analyzer.ts       # Orchestrator: gọi Gemini, parse results
└── prompts.ts             # Multi-team structured prompt
```

## Multi-Team Prompt Strategy

1 Gemini call, prompt chứa 4 team roles, output structured JSON:

```json
{
  "analyst": { "summary": "...", "impact": "...", "sentiment": "bullish|bearish|neutral" },
  "research": { "bullishCase": "...", "bearishCase": "...", "trends": [], "relatedEvents": [] },
  "trading": { "affectedSectors": [], "recommendation": "buy|sell|hold", "confidence": 0.8 },
  "risk": { "riskLevel": "low|medium|high|critical", "warnings": [], "shouldAlert": true }
}
```

## Implementation Steps

### 1. Install SDK
```bash
npm install @google/generative-ai
```

### 2. `lib/ai/gemini-client.ts`
```ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
export const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
```

### 3. `lib/ai/prompts.ts`
```ts
export function buildMultiTeamPrompt(articles: { title: string; summary: string; source: string; category: string }[]) {
  return `Bạn là hệ thống phân tích tin tức tài chính gồm 4 team chuyên gia.

## Articles
${articles.map((a, i) => `[${i}] ${a.title} (${a.source}, ${a.category})\n${a.summary || "N/A"}`).join("\n\n")}

## Yêu cầu
Phân tích MỖI bài viết theo 4 góc nhìn. Trả về JSON array:

[{
  "index": 0,
  "analyst": {
    "summary": "Tóm tắt 2-3 câu tiếng Việt",
    "impact": "Tác động kinh tế/chính trị",
    "sentiment": "bullish" | "bearish" | "neutral"
  },
  "research": {
    "bullishCase": "Lý do lạc quan",
    "bearishCase": "Lý do bi quan",
    "trends": ["keyword xu hướng"],
    "relatedEvents": ["sự kiện liên quan"]
  },
  "trading": {
    "affectedSectors": ["ngành bị ảnh hưởng"],
    "recommendation": "buy" | "sell" | "hold",
    "confidence": 0.0-1.0
  },
  "risk": {
    "riskLevel": "low" | "medium" | "high" | "critical",
    "warnings": ["cảnh báo nếu có"],
    "shouldAlert": false
  }
}]

CHỈ trả JSON, không giải thích.`;
}
```

### 4. `lib/ai/news-analyzer.ts`
```ts
import { geminiModel } from "./gemini-client";
import { buildMultiTeamPrompt } from "./prompts";

export interface TeamAnalysis {
  index: number;
  analyst: { summary: string; impact: string; sentiment: "bullish" | "bearish" | "neutral" };
  research: { bullishCase: string; bearishCase: string; trends: string[]; relatedEvents: string[] };
  trading: { affectedSectors: string[]; recommendation: "buy" | "sell" | "hold"; confidence: number };
  risk: { riskLevel: "low" | "medium" | "high" | "critical"; warnings: string[]; shouldAlert: boolean };
}

export async function analyzeArticles(articles: { id: string; title: string; summary: string | null; source: string; category: string }[]): Promise<TeamAnalysis[]> {
  if (articles.length === 0) return [];

  const prompt = buildMultiTeamPrompt(articles.map((a) => ({
    title: a.title, summary: a.summary || "", source: a.source, category: a.category,
  })));

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text().replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(text) as TeamAnalysis[];
  } catch (error) {
    console.error("AI multi-team analysis failed:", error);
    return [];
  }
}
```

## Env
```
GEMINI_API_KEY=your_key_from_aistudio.google.com
```

## Todo
- [ ] Install `@google/generative-ai`
- [ ] Create `lib/ai/gemini-client.ts`
- [ ] Create `lib/ai/prompts.ts` (multi-team prompt)
- [ ] Create `lib/ai/news-analyzer.ts`
- [ ] Add `GEMINI_API_KEY` to `.env` + `.env.example`
- [ ] Test with sample articles

## Risks
| Risk | Mitigation |
|------|-----------|
| Rate limit 15 RPM | 1 call per ingest batch (max 20 articles) |
| JSON parse fail | try/catch, return [] |
| Token limit | Truncate summary 200 chars, batch max 20 |
| Response quality | Gemini 2.0 Flash handles Vietnamese well |
