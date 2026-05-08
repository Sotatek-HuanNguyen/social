# X/Twitter API v2 Research Report

**Date:** 2026-05-07
**Researcher:** Claude
**Status:** Complete

---

## Executive Summary

X/Twitter API v2 has significant restrictions on free tier access. The project currently uses **Nitter RSS** (free, no auth required) as a workaround. This report compares official API v2 vs. current Nitter approach and provides implementation guidance for both paths.

**Key Finding:** Free tier API v2 access is severely limited. Nitter RSS is the practical free alternative currently deployed.

---

## 1. Free Tier Limits (Official X API v2)

### What's Available on Free Tier
- **Read-only access** to basic endpoints
- **No search available** on free tier (search requires paid tier)
- **User timeline endpoint** (`GET /2/users/:id/tweets`) — available but heavily rate-limited
- **User lookup** (`GET /2/users/by/username/:username`) — available

### Rate Limits (Free Tier)
- **User timeline** (`GET /2/users/:id/tweets`): **15 requests per 15 minutes** (1 req/min average)
- **User lookup**: **15 requests per 15 minutes**
- **Monthly reads**: Effectively unlimited by count, but rate-limited by time
- **Search tweets**: **NOT available on free tier**

### Practical Impact
For 5 crypto accounts fetched every 15 minutes:
- Need 5 requests per 15 min (1 per account)
- Free tier allows 15 requests per 15 min
- **Feasible but tight** — leaves only 10 requests for other operations

---

## 2. Basic Tier ($100/month)

### What's Available
- All free tier endpoints
- **Search tweets** (`GET /2/tweets/search/recent`) — **AVAILABLE**
- Higher rate limits
- 2 million tweets/month read quota

### Rate Limits (Basic Tier)
- **User timeline**: **300 requests per 15 minutes** (20x free tier)
- **Search tweets**: **300 requests per 15 minutes**
- **User lookup**: **300 requests per 15 minutes**
- **Monthly quota**: 2 million tweets read

### Practical Impact
- Comfortable for 5 accounts every 15 min
- Can add search functionality
- Suitable for production use

---

## 3. Authentication: Bearer Token (App-Only Auth)

### Setup Steps

1. **Create X Developer Account**
   - Go to developer.x.com
   - Create app in Developer Portal
   - Generate API keys

2. **Generate Bearer Token**
   ```
   POST https://api.twitter.com/2/oauth2/token

   Body (form-encoded):
   - grant_type: client_credentials
   - client_id: <YOUR_CLIENT_ID>
   - client_secret: <YOUR_CLIENT_SECRET>

   Response:
   {
     "token_type": "Bearer",
     "expires_in": 7200,
     "access_token": "ey..."
   }
   ```

3. **Use Bearer Token**
   ```
   Authorization: Bearer <access_token>
   ```

### Why App-Only Auth?
- **Simplest for read-only access** (no user context needed)
- No user login required
- Token expires in 2 hours (refresh automatically)
- Perfect for server-side ingestion

### Alternative: OAuth 2.0 User Context
- More complex (requires user login flow)
- Not needed for reading public tweets
- Skip this for your use case

---

## 4. Key Endpoints for Your Use Case

### Endpoint 1: User Timeline (Recommended)
```
GET /2/users/:id/tweets
```

**Parameters:**
- `user_id` (required): Numeric user ID (not @handle)
- `max_results`: 10-100 (default 10)
- `tweet.fields`: text, created_at, public_metrics, author_id
- `expansions`: author_id, attachments.media_keys
- `media.fields`: url, type, preview_image_url

**Response Example:**
```json
{
  "data": [
    {
      "id": "1234567890",
      "text": "Bitcoin hits new ATH",
      "created_at": "2026-05-07T10:30:00Z",
      "public_metrics": {
        "retweet_count": 150,
        "reply_count": 20,
        "like_count": 500
      }
    }
  ],
  "includes": {
    "media": [
      {
        "media_key": "3_1234567890",
        "type": "photo",
        "url": "https://..."
      }
    ]
  }
}
```

**Free Tier:** ✅ Available (15 req/15min)
**Basic Tier:** ✅ Available (300 req/15min)

### Endpoint 2: Search Recent Tweets
```
GET /2/tweets/search/recent
```

**Parameters:**
- `query` (required): Search string (e.g., "crypto OR bitcoin")
- `max_results`: 10-100
- `tweet.fields`: text, created_at, public_metrics
- `expansions`: author_id

**Free Tier:** ❌ NOT available
**Basic Tier:** ✅ Available (300 req/15min)

---

## 5. Response Format & Fields

### Standard Tweet Fields
```typescript
interface Tweet {
  id: string;                    // Tweet ID
  text: string;                  // Tweet content (280 chars max)
  created_at: string;            // ISO 8601 timestamp
  author_id: string;             // User ID who posted
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
  attachments?: {
    media_keys: string[];        // References to media array
    poll_ids?: string[];
  };
}
```

### Media Fields
```typescript
interface Media {
  media_key: string;
  type: "photo" | "video" | "animated_gif";
  url?: string;                  // Photo URL
  preview_image_url?: string;    // Video thumbnail
  duration_ms?: number;          // Video duration
}
```

### How to Get URLs
- **Tweet URL**: `https://x.com/{username}/status/{tweet_id}`
- **Media URLs**: In `includes.media[].url` (requires `media.fields=url`)
- **Author URL**: `https://x.com/{username}` (need to expand author)

---

## 6. User ID Lookup: @Handle → User ID

### Endpoint
```
GET /2/users/by/username/:username
```

**Example:**
```
GET /2/users/by/username/CryptoCred
```

**Response:**
```json
{
  "data": {
    "id": "123456789",
    "name": "CryptoCred",
    "username": "CryptoCred"
  }
}
```

### Implementation Pattern
```typescript
// 1. Lookup user ID once
const user = await lookupUser("CryptoCred");
const userId = user.id;

// 2. Cache the ID
// 3. Use cached ID for timeline fetches
const tweets = await getUserTimeline(userId);
```

**Rate Limit:** 15 req/15min (free), 300 req/15min (basic)

---

## 7. Rate Limits Summary

| Endpoint | Free Tier | Basic Tier | Notes |
|----------|-----------|-----------|-------|
| User Timeline | 15/15min | 300/15min | Primary endpoint |
| User Lookup | 15/15min | 300/15min | Cache results |
| Search Recent | ❌ | 300/15min | Not free |
| Tweet Lookup | 15/15min | 300/15min | By tweet ID |

**For 5 accounts every 15 min:**
- Free tier: 5 requests fits within 15 limit ✅
- Basic tier: 5 requests fits within 300 limit ✅

---

## 8. npm Packages

### Official SDK
- **Package:** `twitter-api-v2` (npm)
- **Maintainer:** PLhery (community-maintained, not official)
- **Latest:** v1.28.0 (Nov 2025)
- **Size:** ~23kb gzipped
- **Dependencies:** Zero external dependencies
- **TypeScript:** Full type support

### Installation
```bash
npm install twitter-api-v2
```

### Basic Usage
```typescript
import { TwitterApi } from 'twitter-api-v2';

const client = new TwitterApi({
  bearerToken: process.env.TWITTER_BEARER_TOKEN,
});

const roClient = client.readOnly;

// Get user timeline
const tweets = await roClient.v2.userTimeline(userId, {
  max_results: 100,
  'tweet.fields': ['created_at', 'public_metrics'],
  'expansions': ['author_id'],
  'media.fields': ['url', 'type'],
});

// Get user by username
const user = await roClient.v2.userByUsername('CryptoCred');
```

### Alternative: Direct HTTP
```typescript
const response = await fetch(
  'https://api.twitter.com/2/users/by/username/CryptoCred',
  {
    headers: {
      'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
    },
  }
);
```

---

## 9. Current Implementation: Nitter RSS

### Why Nitter?
- **Free** — no API key required
- **No rate limits** — can fetch frequently
- **No authentication** — just HTTP GET
- **Reliable** — multiple public instances available

### How It Works (Current Code)
```typescript
// lib/services/x-fetcher.ts
const NITTER_INSTANCES = [
  "nitter.uest.cc",
  "nitter.poast.org",
  "nitter.net",
];

// Fetch RSS: https://nitter.uest.cc/CryptoCred/rss
const url = `https://${instance}/${handle}/rss`;
const parsed = await parser.parseURL(url);
```

### Limitations
- **Nitter instances may go down** (public instances are unreliable)
- **Requires fallback logic** (current code tries 3 instances)
- **Limited metadata** — RSS has fewer fields than API
- **No search** — only user timelines
- **Unofficial** — could break if Nitter changes

### Reliability Issues
- Public Nitter instances are community-run
- Some instances block requests or go offline
- No SLA or guaranteed uptime
- Current code handles this with fallback instances

---

## 10. Comparison: Official API vs. Nitter

| Factor | Official API (Free) | Official API (Basic) | Nitter RSS |
|--------|-------------------|-------------------|-----------|
| **Cost** | Free | $100/month | Free |
| **Auth Required** | Yes (Bearer Token) | Yes | No |
| **Rate Limits** | 15/15min | 300/15min | None |
| **Search** | ❌ | ✅ | ❌ |
| **Reliability** | High (X infrastructure) | High | Low (public instances) |
| **Setup Time** | 30 min | 30 min | 5 min |
| **Metadata** | Rich (metrics, media) | Rich | Limited (RSS fields) |
| **Maintenance** | Official support | Official support | Community |

---

## 11. Recommendation for Your Use Case

### Current Approach (Nitter RSS)
**Pros:**
- Already implemented and working
- Zero cost
- No authentication overhead
- Sufficient for 5 accounts every 15 min

**Cons:**
- Instance reliability issues
- Limited metadata (no engagement metrics)
- No search capability

### When to Switch to Official API

**Switch to Free Tier if:**
- You need engagement metrics (likes, retweets)
- You want official reliability
- You can handle 15 req/15min limit

**Switch to Basic Tier ($100/mo) if:**
- You need search functionality
- You want higher rate limits
- You're adding more accounts (>5)
- You need guaranteed uptime

### Hybrid Approach
```typescript
// Try Nitter first (fast, free)
// Fall back to API if Nitter fails
// Use API for search/metrics when needed
```

---

## 12. Implementation Checklist

### For Official API v2 (Free Tier)
- [ ] Create X Developer account
- [ ] Create app in Developer Portal
- [ ] Generate API keys (API Key, API Secret)
- [ ] Generate Bearer Token
- [ ] Install `twitter-api-v2` npm package
- [ ] Cache user IDs (lookup once, reuse)
- [ ] Implement error handling for rate limits
- [ ] Add retry logic with exponential backoff
- [ ] Monitor rate limit headers

### For Official API v2 (Basic Tier)
- [ ] All above steps
- [ ] Set up billing ($100/month)
- [ ] Add search endpoint integration
- [ ] Implement search query builder

### For Nitter RSS (Current)
- [ ] Add more fallback instances
- [ ] Implement health checks
- [ ] Add circuit breaker pattern
- [ ] Monitor instance availability

---

## Unresolved Questions

1. **X API v2 official documentation** — docs.x.com currently returns 404 errors. Recommend checking developer.x.com directly when available.

2. **Nitter instance stability** — Public instances are unreliable. Consider self-hosting Nitter if reliability is critical (requires real X account for session tokens).

3. **Cost-benefit analysis** — Is $100/month worth it for your use case? Depends on:
   - Need for search functionality
   - Need for engagement metrics
   - Tolerance for Nitter downtime
   - Number of accounts to monitor

4. **Rate limit handling** — How should the app behave when rate limits are hit? Queue requests? Notify user? Degrade gracefully?

---

## Next Steps

1. **Immediate:** Keep current Nitter RSS approach (working)
2. **Short-term:** Add more Nitter instances + health checks
3. **Medium-term:** Evaluate if search/metrics needed
4. **Long-term:** Consider Basic tier if scaling to 20+ accounts

---

## References

- **Nitter GitHub:** https://github.com/zedeus/nitter
- **twitter-api-v2 npm:** https://www.npmjs.com/package/twitter-api-v2
- **twitter-api-v2 GitHub:** https://github.com/PLhery/node-twitter-api-v2
- **Current Implementation:** `/Users/huannguyen/Desktop/Demo/social/lib/services/x-fetcher.ts`
- **Project Package.json:** `/Users/huannguyen/Desktop/Demo/social/package.json`
