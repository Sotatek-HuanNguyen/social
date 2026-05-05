# News Tracker - Theo Dõi Tin Tức

Ứng dụng theo dõi và cảnh báo tin tức kinh tế – chính trị theo thời gian thực.

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **UI**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL via Prisma
- **News Sources**: Vietnamese RSS feeds + CurrentsAPI
- **Deployment**: Vercel (cron jobs mỗi 15 phút)

## Cài đặt

### 1. Clone và cài dependencies

```bash
git clone <repo-url>
cd social
npm install
```

### 2. Cấu hình environment

```bash
cp .env.example .env.local
```

Sửa `.env.local` với thông tin thực:

| Biến | Mô tả | Cách lấy |
|------|--------|----------|
| `DATABASE_URL` | PostgreSQL connection string | [neon.tech](https://neon.tech) → tạo project → copy pooled URL |
| `DIRECT_URL` | Direct DB connection (cho migration) | Neon dashboard → copy direct URL |
| `CURRENTS_API_KEY` | API key cho tin quốc tế | [currentsapi.services](https://currentsapi.services) → đăng ký free |
| `CRON_SECRET` | Secret bảo vệ endpoint ingest | Tự tạo chuỗi ngẫu nhiên |

### 3. Setup database

```bash
# Generate Prisma client
npx prisma generate

# Chạy migration (cần DB đang chạy)
npx prisma migrate dev --name init

# Kiểm tra tables
npx prisma studio
```

### 4. Chạy dev server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

### 5. Test ingestion thủ công

```bash
curl "http://localhost:3000/api/ingest?secret=<CRON_SECRET>"
```

Hoặc dùng Authorization header:
```bash
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/ingest
```

## Scripts

| Lệnh | Mô tả |
|-------|--------|
| `npm run dev` | Chạy dev server |
| `npm run build` | Build production |
| `npm start` | Chạy production server |
| `npm test` | Chạy unit tests (vitest) |
| `npm run lint` | Kiểm tra lint |

## Cấu trúc project

```
app/
├── page.tsx                  # Trang chủ - feed tin tức
├── alerts/page.tsx           # Quản lý cảnh báo
├── layout.tsx                # Layout chung
└── api/
    ├── ingest/route.ts       # Cron: fetch RSS + CurrentsAPI
    ├── articles/route.ts     # GET articles (filter, pagination)
    ├── articles/[id]/route.ts
    ├── alerts/route.ts       # GET/POST alert rules
    ├── alerts/[id]/route.ts  # DELETE alert rule
    └── alerts/sse/route.ts   # SSE breaking news stream

components/
├── article-card.tsx          # Card hiển thị bài viết
├── article-feed.tsx          # Feed + load more
├── filter-bar.tsx            # Bộ lọc danh mục/nguồn/tìm kiếm
├── breaking-news-banner.tsx  # Banner tin nóng (SSE)
├── alert-rule-form.tsx       # Form tạo cảnh báo
└── alert-rule-list.tsx       # Danh sách cảnh báo

lib/
├── db.ts                     # Prisma client singleton
├── services/
│   ├── rss-fetcher.ts        # Fetch 5 RSS feeds VN
│   ├── currents-api-client.ts # CurrentsAPI client
│   └── article-normalizer.ts # Chuẩn hóa bài viết
└── utils/
    ├── keyword-classifier.ts # Phân loại ECONOMIC/POLITICAL/GENERAL
    ├── api-helpers.ts        # Pagination + error helpers
    └── format-date.ts        # timeAgo helper
```

## API Endpoints

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/articles?category=ECONOMIC&source=VnExpress&search=keyword&page=1&limit=20` | Danh sách bài viết |
| GET | `/api/articles/:id` | Chi tiết bài viết |
| GET | `/api/alerts` | Danh sách alert rules |
| POST | `/api/alerts` | Tạo alert rule (`{ keywords: ["..."], category?: "ECONOMIC" }`) |
| DELETE | `/api/alerts/:id` | Xóa alert rule |
| GET | `/api/alerts/sse` | SSE stream tin nóng |
| GET | `/api/ingest?secret=...` | Trigger ingestion (cron) |

## Deploy lên Vercel

```bash
# Cài Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Thêm env vars
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add CURRENTS_API_KEY production
vercel env add CRON_SECRET production

# Chạy migration trên Neon
DATABASE_URL="<neon-direct-url>" npx prisma migrate deploy
```

Sau deploy, Vercel sẽ tự chạy cron `/api/ingest` mỗi 15 phút.

## Nguồn tin RSS

- VnExpress (Kinh doanh)
- CafeF (Chứng khoán)
- VietnamNet (Kinh tế)
- Tuổi Trẻ (Kinh tế)
- Thanh Niên (Kinh tế)
- CurrentsAPI (Tin quốc tế tiếng Việt)
