# News APIs Research Report
Date: 2026-05-04 | Task: Economic-political news tracking app (Vietnamese + international)

---

## 1. API Comparison

### NewsAPI.org
- **Free tier**: 100 req/day, developer plan only (no production use), 1-month historical data
- **Content**: Headlines + description + URL. Full article text NOT provided — returns truncated content (~200 chars). Must scrape source URL for full text.
- **Vietnamese support**: Limited. No `vi` language filter. Can search Vietnamese keywords but sources are mostly English.
- **Paid**: $449/mo (Business), $149/mo (Startup) — expensive for MVP
- **Verdict**: Good for international news discovery, poor for Vietnamese, no full text

### GNews API
- **Free tier**: 100 req/day, 10 articles/request, 1-month historical
- **Content**: Title, description, URL, source. Full content field exists but often truncated by source.
- **Vietnamese support**: Supports `lang=vi` and `country=vn` filters — best Vietnamese support among paid APIs
- **Paid**: $9.99/mo (Basic, 1000 req/day), $49.99/mo (Standard, 10k req/day)
- **Verdict**: Best option for Vietnamese language filtering, affordable paid tier

### NewsData.io
- **Free tier**: 200 credits/day (1 credit = 1 article), 10 articles/request
- **Content**: Full article content available (not just snippet) — standout feature
- **Vietnamese support**: `language=vi` supported, Vietnamese sources indexed
- **Paid**: $149/mo (Professional), $49/mo (Standard)
- **Verdict**: Best for full article content; Vietnamese support decent

### TheNewsAPI (thenewsapi.com)
- **Free tier**: 100 req/day, 3 articles/request on free
- **Content**: Snippet only, no full text
- **Vietnamese support**: Limited, mostly English sources
- **Paid**: $9/mo (Starter), $49/mo (Standard)
- **Verdict**: Weak Vietnamese support, limited free tier

### CurrentsAPI
- **Free tier**: 600 req/day — most generous free tier
- **Content**: Title, description, URL. No full text.
- **Vietnamese support**: `language=vi` filter available, moderate Vietnamese source coverage
- **Paid**: $9/mo (Basic), $29/mo (Pro)
- **Verdict**: Good free tier volume, affordable, but no full text

### MediaStack
- **Free tier**: 500 req/mo (very limited), 25 results/request
- **Content**: Title, description, URL. No full text.
- **Vietnamese support**: `languages=vi` supported, limited Vietnamese sources
- **Paid**: $9.99/mo (Basic, 10k req/mo), $49.99/mo (Standard)
- **Verdict**: Free tier too restrictive for real use

---

## 2. Pricing Comparison Table

| API           | Free Req/Day | Full Text | Vietnamese | Cheapest Paid |
|---------------|-------------|-----------|------------|---------------|
| NewsAPI.org   | 100         | No        | Poor       | $149/mo       |
| GNews         | 100         | Partial   | Good       | $9.99/mo      |
| NewsData.io   | ~200 credits| Yes       | Good       | $49/mo        |
| TheNewsAPI    | 100         | No        | Poor       | $9/mo         |
| CurrentsAPI   | 600         | No        | Moderate   | $9/mo         |
| MediaStack    | ~17/day     | No        | Moderate   | $9.99/mo      |

---

## 3. RSS-Based Approach (Recommended for Vietnamese)

Major Vietnamese economic/political news sites with RSS feeds:

| Source        | RSS URL                                      | Coverage          |
|---------------|----------------------------------------------|-------------------|
| VnExpress     | `https://vnexpress.net/rss/kinh-doanh.rss`  | Economy, politics |
| CafeF         | `https://cafef.vn/rss/thi-truong-chung-khoan.rss` | Finance, stocks |
| VietnamNet    | `https://vietnamnet.vn/rss/kinh-te.rss`     | Economy           |
| Tuoi Tre      | `https://tuoitre.vn/rss/kinh-te.rss`        | Economy, politics |
| Thanh Nien    | `https://thanhnien.vn/rss/kinh-te.rss`      | Economy           |
| Dau Tu        | `https://baodautu.vn/rss/`                  | Investment focus  |

RSS advantages:
- Free, no rate limits (be respectful: poll every 15-30 min)
- Full article content accessible via URL fetch
- Real-time (updated every 5-15 min by sources)
- No API key required

RSS limitations:
- Need to parse/normalize XML across different schemas
- Full text requires fetching article URL (scraping)
- No search/filter API — must process all items

---

## 4. Web Scraping Considerations

**Legal/ethical**:
- Vietnamese news sites (VnExpress, CafeF, etc.) generally allow RSS consumption
- Full-page scraping may violate ToS — check each site's robots.txt
- For MVP: use RSS + fetch article URL for content extraction (gray area but common)
- Recommended: use `newspaper3k` (Python) or `readability-lxml` for article extraction

**Rate limiting**:
- Respect crawl-delay in robots.txt
- Add 2-5s delay between requests per domain
- Cache aggressively — don't re-fetch unchanged articles

---

## 5. Recommended MVP Approach

**Tier 1 (Free, launch immediately)**:
- RSS feeds from VnExpress, CafeF, VietnamNet, Tuoi Tre for Vietnamese content
- CurrentsAPI free tier (600 req/day) for international news discovery
- Article content: fetch source URLs + readability extraction

**Tier 2 (Paid, scale up ~$20-60/mo)**:
- GNews paid ($9.99/mo) for structured Vietnamese + international API
- NewsData.io Standard ($49/mo) if full-text API access needed without scraping

**Architecture**:
```
RSS Poller (every 15min) → Article URL Queue → Content Fetcher → DB
CurrentsAPI (hourly)     ↗
GNews API (on-demand)   ↗
```

---

## 6. Key Risks

- NewsAPI.org free tier blocks production use (ToS) — avoid for deployed app
- Full article text via API only available on NewsData.io; others require scraping
- Vietnamese RSS feeds may change URLs without notice — need monitoring
- CafeF and some sites use JavaScript rendering — static fetch may miss content
- GNews `lang=vi` coverage is improving but still misses smaller Vietnamese outlets

---

## Unresolved Questions
- Does the app need real-time push (WebSocket) or polling is acceptable?
- Is full article body required in DB, or just summary + link-out?
- Budget ceiling for news data infrastructure per month?
- Need for historical article archive (affects API tier selection significantly)?
