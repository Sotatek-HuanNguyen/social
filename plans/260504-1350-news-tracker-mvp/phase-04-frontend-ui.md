# Phase 04 — Frontend UI

## Overview

- **Effort**: 6h
- **Status**: complete
- **Depends on**: Phase 01, 03 complete (API must be working)
- **Goal**: Build responsive news feed UI with filters, alert management, and breaking news banner

---

## Requirements

- Article feed with category/source/search filters
- Article card: title, source badge, category tag, time-ago, link
- Alert management page: create/list/delete alert rules
- Breaking news banner connected to SSE (with polling fallback)
- Mobile-first responsive layout
- Dark mode via shadcn/ui theme
- Loading, empty, and error states

---

## Architecture

```
app/
├── layout.tsx              # Root layout: header + main
├── page.tsx                # Home: article feed + filter bar
├── alerts/
│   └── page.tsx            # Alert management
components/
├── article-card.tsx        # Article display card
├── article-feed.tsx        # Feed list with pagination
├── filter-bar.tsx          # Category + source + search filters
├── breaking-news-banner.tsx # SSE-connected alert banner
├── alert-rule-form.tsx     # Create alert rule form
└── alert-rule-list.tsx     # List + delete alert rules
```

---

## Related Code Files

**Create:**
- `app/layout.tsx`
- `app/page.tsx`
- `app/alerts/page.tsx`
- `components/article-card.tsx`
- `components/article-feed.tsx`
- `components/filter-bar.tsx`
- `components/breaking-news-banner.tsx`
- `components/alert-rule-form.tsx`
- `components/alert-rule-list.tsx`
- `lib/utils/format-date.ts` — time-ago helper

---

## Key Component Details

### app/layout.tsx
```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <header className="border-b px-6 py-3 flex items-center justify-between">
          <h1 className="font-bold text-lg">Theo Dõi Tin Tức</h1>
          <nav><a href="/alerts">Cảnh báo</a></nav>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
```

### app/page.tsx
- Server Component: fetch initial articles via `fetch('/api/articles', { next: { revalidate: 60 } })`
- Render `<BreakingNewsBanner />` (Client Component) + `<FilterBar />` + `<ArticleFeed />`

### components/article-card.tsx
```tsx
// Props: { title, url, source, category, summary, publishedAt, imageUrl }
// Render: Card with external link, Badge for source, Badge for category, timeAgo(publishedAt)
```

### components/filter-bar.tsx
- Client Component, uses `useRouter` + `useSearchParams`
- Dropdowns for category, source; text input for search
- On change: push new URL params → page re-fetches

### components/breaking-news-banner.tsx
```tsx
"use client";
// Connect to /api/alerts/sse via EventSource
// On message: show dismissable banner at top
// Fallback: poll /api/articles?isBreaking=true every 60s if SSE fails
// Dismiss button clears banner
```

### lib/utils/format-date.ts
```ts
export function timeAgo(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
}
```

---

## Implementation Steps

1. Create `lib/utils/format-date.ts` — `timeAgo()` + `formatDate()` helpers.

2. Create `components/article-card.tsx`:
   - shadcn `Card` wrapper
   - Title as `<a href={url} target="_blank">` (external link)
   - Row of badges: source (outline), category (colored: green=ECONOMIC, blue=POLITICAL)
   - `timeAgo(publishedAt)` in muted text
   - Optional image thumbnail if `imageUrl` present

3. Create `components/filter-bar.tsx`:
   - shadcn `Select` for category, source
   - shadcn `Input` for search with debounce (300ms)
   - "Clear filters" button when any filter active

4. Create `components/article-feed.tsx`:
   - Accept `articles` prop, map to `<ArticleCard />`
   - Pagination: "Load more" button → fetch next page
   - Empty state: "Không có bài viết nào" with icon

5. Create `components/breaking-news-banner.tsx` as Client Component with SSE + fallback.

6. Create `app/page.tsx` — Server Component fetching initial articles, composing layout.

7. Create `components/alert-rule-form.tsx`:
   - Input for comma-separated keywords
   - Optional category select
   - Submit → POST /api/alerts → show success toast (shadcn `toast`)

8. Create `components/alert-rule-list.tsx`:
   - Fetch GET /api/alerts
   - Show each rule with keywords + category
   - Delete button → DELETE /api/alerts/:id → optimistic removal

9. Create `app/alerts/page.tsx` — compose form + list.

10. Add dark mode toggle in header (shadcn `ThemeProvider` + toggle button).

11. Test on mobile viewport (375px) and desktop.

---

## Todo List

- [x] `lib/utils/format-date.ts`
- [x] `components/article-card.tsx`
- [x] `components/filter-bar.tsx`
- [x] `components/article-feed.tsx`
- [x] `components/breaking-news-banner.tsx`
- [x] `app/page.tsx`
- [x] `components/alert-rule-form.tsx`
- [x] `components/alert-rule-list.tsx`
- [x] `app/alerts/page.tsx`
- [x] `app/layout.tsx` with header nav
- [x] Dark mode toggle
- [x] Test mobile responsiveness
- [x] Test empty + error states

---

## Addendum: Font Roboto

### Mục tiêu
Thay Geist bằng Roboto làm font chính (body text). Giữ Geist Mono cho code blocks nếu cần.

### Implementation

**File:** `app/layout.tsx`

```tsx
import { Roboto, Geist_Mono } from "next/font/google";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
});

// Trong <html>:
className={`${roboto.variable} ${geistMono.variable} h-full antialiased`}
```

**File:** `app/globals.css` — update font-family:
```css
body {
  font-family: var(--font-roboto), sans-serif;
}
```

### Todo
- [ ] Thay Geist Sans → Roboto trong `layout.tsx`
- [ ] Thêm subset `vietnamese` cho hiển thị tiếng Việt tốt
- [ ] Update CSS variable reference trong `globals.css`

---

## Addendum: PWA + Push Notifications (Online & Offline)

### Mục tiêu
Bắn notification đến user cả khi online lẫn offline thông qua PWA + Web Push API.

### Flow tổng quan

```
[Cron ingest 15min]
    ↓
[Detect breaking / alert-rule match]
    ↓
[Gọi lib/push/send-push.ts → gửi đến tất cả subscriptions]
    ↓
[Browser Push Service (FCM/APNs) → deliver đến device]
    ↓
[Service Worker nhận push event → showNotification()]
    ↓
[User click → mở article URL]
```

**Online:** User thấy cả in-app toast (SSE, đã có) + OS notification.
**Offline/tab đóng:** Service Worker vẫn nhận push → hiển thị OS notification.

---

### Architecture — Files cần tạo/sửa

```
public/
├── sw.js                          # Service Worker (push + notificationclick)
├── manifest.json                  # PWA manifest
├── icon-192.png                   # App icon
├── icon-512.png                   # App icon large
└── badge-72.png                   # Notification badge

lib/push/
├── register-push.ts               # Client: đăng ký subscription
├── send-push.ts                   # Server: gửi push đến all subscribers
└── vapid.ts                       # VAPID config (server-side)

app/api/push/
├── subscribe/route.ts             # POST: lưu subscription
└── send/route.ts                  # POST: trigger push (internal, protected)

components/
└── notification-permission-button.tsx  # UI button bật/tắt notification

prisma/schema.prisma               # Thêm model PushSubscription
app/api/ingest/route.ts            # Sửa: gọi send-push sau khi ingest
app/layout.tsx                     # Sửa: thêm manifest link + SW register
```

---

### Implementation Steps (theo thứ tự)

#### Step 1: Prisma schema — thêm PushSubscription

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  endpoint  String   @unique
  keys      Json     // { p256dh: string, auth: string }
  createdAt DateTime @default(now())
}
```

Chạy: `npx prisma migrate dev --name add-push-subscription`

#### Step 2: Install dependency

```bash
npm install web-push
npm install -D @types/web-push
```

#### Step 3: Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

Thêm vào `.env.local`:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public_key>
VAPID_PRIVATE_KEY=<private_key>
VAPID_EMAIL=mailto:your@email.com
```

#### Step 4: `lib/push/vapid.ts` — Server config

```ts
import webPush from "web-push";

webPush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export { webPush };
```

#### Step 5: `public/sw.js` — Service Worker

```js
// Push event: hiển thị notification kể cả khi offline/tab đóng
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Tin mới", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      tag: data.tag || "news",           // group cùng tag → replace
      data: { url: data.url || "/" },
    })
  );
});

// Click notification → mở URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((list) => {
      // Focus existing tab nếu có, không thì mở mới
      for (const client of list) {
        if (client.url === event.notification.data.url && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(event.notification.data.url);
    })
  );
});
```

#### Step 6: `public/manifest.json` — PWA manifest

```json
{
  "name": "Theo Dõi Tin Tức",
  "short_name": "Tin Tức",
  "description": "Cảnh báo tin tức kinh tế – chính trị",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0a0a0a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

#### Step 7: `lib/push/register-push.ts` — Client subscription

```ts
export async function registerPush(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });

  await fetch("/api/push/subscribe", {
    method: "POST",
    body: JSON.stringify(sub),
    headers: { "Content-Type": "application/json" },
  });

  return sub;
}

export async function unregisterPush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/push/subscribe", { method: "DELETE", body: JSON.stringify({ endpoint: sub.endpoint }) });
    await sub.unsubscribe();
  }
}
```

#### Step 8: `app/api/push/subscribe/route.ts`

```ts
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const { endpoint, keys } = await req.json();
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { keys },
    create: { endpoint, keys },
  });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { endpoint } = await req.json();
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return Response.json({ ok: true });
}
```

#### Step 9: `lib/push/send-push.ts` — Server gửi push

```ts
import { prisma } from "@/lib/db";
import { webPush } from "./vapid";

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendPushToAll(payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany();
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webPush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys as { p256dh: string; auth: string } },
        JSON.stringify(payload)
      )
    )
  );

  // Xóa subscriptions đã expired (410 Gone)
  const expired = results
    .map((r, i) => (r.status === "rejected" && r.reason?.statusCode === 410 ? subs[i].id : null))
    .filter(Boolean) as string[];

  if (expired.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expired } } });
  }
}
```

#### Step 10: Hook vào ingest — gửi push khi có breaking news

Sửa `app/api/ingest/route.ts`, thêm sau vòng lặp upsert:

```ts
import { sendPushToAll } from "@/lib/push/send-push";

// Sau khi ingest xong, check breaking articles mới
const breakingArticles = all
  .map(normalizeArticle)
  .filter((a) => classifyArticle(a.title, a.summary ?? "") !== "GENERAL");

if (breakingArticles.length > 0) {
  const latest = breakingArticles[0];
  await sendPushToAll({
    title: `🔴 ${latest.source}`,
    body: latest.title,
    url: latest.url,
    tag: "breaking",
  });
}
```

#### Step 11: `components/notification-permission-button.tsx`

```tsx
"use client";
import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { registerPush, unregisterPush } from "@/lib/push/register-push";

export function NotificationPermissionButton() {
  const [status, setStatus] = useState<"default" | "granted" | "denied" | "unsupported">("default");

  useEffect(() => {
    if (!("Notification" in window)) { setStatus("unsupported"); return; }
    setStatus(Notification.permission as "default" | "granted" | "denied");
  }, []);

  async function handleToggle() {
    if (status === "granted") {
      await unregisterPush();
      setStatus("default");
    } else {
      const sub = await registerPush();
      setStatus(sub ? "granted" : "denied");
    }
  }

  if (status === "unsupported") return null;

  return (
    <button onClick={handleToggle} className="flex items-center gap-1 text-sm hover:underline"
      title={status === "granted" ? "Tắt thông báo" : "Bật thông báo"}>
      {status === "granted" ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
      <span className="hidden sm:inline">{status === "granted" ? "Đang bật" : "Bật thông báo"}</span>
    </button>
  );
}
```

#### Step 12: Update `app/layout.tsx`

- Thêm manifest vào metadata:
```tsx
export const metadata: Metadata = {
  title: "Theo Dõi Tin Tức",
  description: "Theo dõi và cảnh báo tin tức kinh tế – chính trị",
  manifest: "/manifest.json",
};
```

- Thêm `<NotificationPermissionButton />` vào header nav.

---

### Limitations & Notes

| Platform | Hỗ trợ Push offline | Điều kiện |
|----------|-------------------|-----------|
| Chrome (desktop/Android) | ✅ | Chỉ cần grant permission |
| Firefox | ✅ | Chỉ cần grant permission |
| Safari macOS | ✅ | macOS Ventura+ |
| Safari iOS | ✅ | iOS 16.4+, **phải "Add to Home Screen"** |
| Samsung Internet | ✅ | Chỉ cần grant permission |

- HTTPS bắt buộc (Vercel đã có)
- Nếu user deny permission → chỉ còn in-app toast (SSE)
- SW tự cleanup expired subscriptions (410 Gone)

---

### Todo — PWA + Push Notifications

- [ ] Prisma: thêm `PushSubscription` model + migrate
- [ ] Install `web-push` + `@types/web-push`
- [ ] Generate VAPID keys → `.env.local`
- [ ] Tạo `lib/push/vapid.ts`
- [ ] Tạo `public/sw.js`
- [ ] Tạo `public/manifest.json`
- [ ] Tạo icons: `icon-192.png`, `icon-512.png`, `badge-72.png`
- [ ] Tạo `lib/push/register-push.ts`
- [ ] Tạo `lib/push/send-push.ts`
- [ ] Tạo `app/api/push/subscribe/route.ts`
- [ ] Sửa `app/api/ingest/route.ts` — hook sendPushToAll
- [ ] Tạo `components/notification-permission-button.tsx`
- [ ] Sửa `app/layout.tsx` — manifest + notification button
- [ ] Test: Chrome desktop — nhận push khi tab đóng
- [ ] Test: Android Chrome — nhận push khi app background
- [ ] Test: iOS Safari — install PWA → nhận push

---

## Success Criteria

- Home page loads articles, filter by category works
- Breaking news banner appears when new breaking article ingested
- Alert rules can be created and deleted from /alerts page
- Renders correctly on 375px mobile and 1280px desktop
- Dark mode toggles correctly
- **Font Roboto hiển thị đúng, hỗ trợ tiếng Việt**
- **User có thể bật push notification từ UI**
- **Nhận được OS notification khi có breaking news (kể cả offline/tab đóng)**
- **PWA installable trên mobile**

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| SSE not supported / drops on Vercel | Polling fallback every 60s in `breaking-news-banner.tsx` |
| Filter state vs server state mismatch | Use URL search params as single source of truth |
| Hydration errors from Server/Client mix | Mark all interactive components with `"use client"` |
| Vietnamese text rendering | Set `lang="vi"` on `<html>`, dùng Roboto với subset `vietnamese` |
| Push permission denied | Fallback về in-app toast + email (nếu có) |
| iOS Safari push limitations | Hướng dẫn user "Add to Home Screen", hiển thị banner nhắc |
| Service Worker cache stale | Versioned SW file, skipWaiting() on activate |
| VAPID key rotation | Lưu key cố định trong env, không rotate trừ khi compromised |
