# Phase 04 — Frontend UI (FB-style Redesign)

## Overview

- **Effort**: 6h
- **Status**: in-progress
- **Depends on**: All API routes working
- **Goal**: Redesign layout to FB-style: sticky header with search, fixed left sidebar (categories/sources/alerts), fixed right sidebar (breaking/trending/alerts summary), center feed. Hamburger drawer on mobile.

---

## Architecture — New Layout

```
┌──────────────────────────────────────────────────────────┐
│ HEADER (sticky top, z-50)                                │
│ [Logo]        [Search input]        [Bell] [Alerts link] │
├──────────┬───────────────────────────┬───────────────────┤
│ LEFT     │ CENTER FEED              │ RIGHT             │
│ SIDEBAR  │ (scrollable)             │ SIDEBAR           │
│ (fixed)  │                          │ (fixed)           │
│ 240px    │ BreakingBanner           │ 280px             │
│          │ FilterBar (inline)       │                   │
│ [Cats]   │ ArticleCard              │ [Breaking 5]      │
│ [Sources]│ ArticleCard              │ [Trending src]    │
│ [Alerts] │ ArticleCard              │ [Active alerts]   │
│          │ [Load more]              │                   │
└──────────┴───────────────────────────┴───────────────────┘

Mobile (< 768px):
┌──────────────────────┐
│ [☰] Logo    [🔔][⚙] │  ← hamburger + header
├──────────────────────┤
│ Feed (full width)    │
│ ArticleCard          │
│ ArticleCard          │
├──────────────────────┤
│ [Home][Cat][Alerts]  │  ← NO bottom nav, hamburger drawer instead
└──────────────────────┘
  ☰ opens left drawer (categories, sources, alerts)
```

---

## Files to Create

| File | Purpose | LOC est |
|------|---------|---------|
| `components/layout/sidebar-left.tsx` | Categories nav, sources list, alerts shortcut | ~80 |
| `components/layout/sidebar-right.tsx` | Breaking feed, trending sources, active alerts | ~100 |
| `components/layout/mobile-drawer.tsx` | Hamburger drawer wrapping left sidebar content | ~50 |
| `components/layout/header-bar.tsx` | FB-style sticky header: logo, search, nav icons | ~60 |

## Files to Modify

| File | Changes |
|------|---------|
| `app/layout.tsx` | Replace inline header with `HeaderBar` + 3-column grid layout |
| `app/page.tsx` | Remove `FilterBar` (moved to sidebar), adjust for center column |
| `app/globals.css` | Add sidebar-specific layout utilities if needed |
| `components/filter-bar.tsx` | Simplify — category/source filtering moves to sidebar, keep search in header |
| `app/alerts/page.tsx` | Wrap in same center column width |

## Files Unchanged (reuse as-is)
- `components/article-card.tsx`
- `components/article-feed.tsx`
- `components/breaking-news-banner.tsx`
- `components/notification-permission-button.tsx`
- `components/alert-rule-form.tsx`
- `components/alert-rule-list.tsx`

---

## Implementation Steps

### Step 1: Create `components/layout/header-bar.tsx`

FB-style sticky header:
- Left: Logo link (`/`)
- Center: Search input (debounced, pushes `?search=` to URL)
- Right: `NotificationPermissionButton` + Link to `/alerts`
- Mobile: add hamburger button (triggers drawer via callback prop)
- `sticky top-0 z-50 bg-background border-b`

```tsx
// Props: { onMenuToggle: () => void }
// Extract search logic from current FilterBar
// Search input: w-full max-w-md on desktop, hidden on mobile (show icon toggle)
```

### Step 2: Create `components/layout/sidebar-left.tsx`

Fixed left sidebar (desktop only, hidden < lg):
- **Categories section**: Clickable list items — All, Crypto, Tech, Economic, Political, General
  - Active category highlighted (uses `useSearchParams`)
  - Click → `router.push(/?category=X)`
  - Add CRYPTO and TECH to category filter (currently missing from FilterBar CATEGORIES)
- **Sources section**: List all sources from DB or hardcoded initial set
  - Include new crypto sources: CoinGecko, Etherscan, DeFiLlama, Binance Futures
  - Click → `router.push(/?source=X)`
- **Alerts shortcut**: Link to `/alerts` page + notification toggle

```tsx
// fixed left-0 top-[header-height] h-[calc(100vh-header-height)]
// w-60 overflow-y-auto border-r p-4
// Hidden on mobile (< lg:hidden)
```

### Step 3: Create `components/layout/sidebar-right.tsx`

Fixed right sidebar (desktop only, hidden < xl):
- **Breaking news**: Fetch top 5 breaking articles (last 24h) via `/api/articles?isBreaking=true&limit=5`
  - Compact list: title + timeAgo, link to article
- **Trending sources**: Show top 5 sources by article count today
  - Fetch via `/api/articles` with aggregation or new lightweight endpoint
  - Display: source name + count badge
- **Active alerts summary**: Fetch `/api/alerts` rules
  - Show keywords badges
  - "Manage" link → `/alerts`

```tsx
// fixed right-0 top-[header-height] h-[calc(100vh-header-height)]
// w-70 overflow-y-auto border-l p-4
// Hidden < xl (xl:block)
```

### Step 4: Create `components/layout/mobile-drawer.tsx`

Hamburger drawer (mobile only):
- Overlay + slide-in from left
- Contains same content as `SidebarLeft`
- Close on route change + outside click + escape key
- Use React state in layout, no external lib needed

```tsx
// Props: { open: boolean; onClose: () => void }
// fixed inset-0 z-50, backdrop blur, slide-in panel
```

### Step 5: Update `app/layout.tsx`

Replace current layout with 3-column grid:

```tsx
<body>
  <HeaderBar onMenuToggle={() => setDrawerOpen(true)} />
  <div className="flex">
    <SidebarLeft className="hidden lg:block" />
    <main className="flex-1 min-h-[calc(100vh-3.5rem)] mx-auto max-w-2xl px-4 py-4">
      {children}
    </main>
    <SidebarRight className="hidden xl:block" />
  </div>
  <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
</body>
```

Note: layout.tsx is a Server Component. Drawer state needs a client wrapper.
→ Create thin `components/layout/layout-shell.tsx` client component wrapping the body content.

### Step 6: Update `app/page.tsx`

- Remove `<FilterBar />` import (category/source filtering now in sidebar)
- Keep `<BreakingNewsBanner />` at top of feed
- Keep `<ArticleFeed />` as center content
- Add CRYPTO and TECH to the category validation

### Step 7: Update `components/filter-bar.tsx`

- Remove category/source dropdowns (moved to sidebars)
- This component may be deleted entirely if search moves to header
- Or keep as a minimal inline "active filter chips" display

### Step 8: Update `app/globals.css`

- Add header height CSS variable: `--header-height: 3.5rem`
- Adjust scrolling: `main` area scrolls, sidebars fixed

---

## Key Design Decisions

- **No new npm packages** — pure Tailwind + React state for drawer
- **Responsive breakpoints**: `lg` (1024px) shows left sidebar, `xl` (1280px) shows right sidebar
- **Server/Client split**: layout.tsx stays server, interactive shell is client component
- **Reuse existing components**: ArticleCard, ArticleFeed, BreakingNewsBanner, AlertRuleForm/List unchanged
- **Category enum**: Add CRYPTO and TECH to page.tsx filter validation (already in DB)

---

## Todo List

- [ ] Create `components/layout/header-bar.tsx`
- [ ] Create `components/layout/sidebar-left.tsx`
- [ ] Create `components/layout/sidebar-right.tsx`
- [ ] Create `components/layout/mobile-drawer.tsx`
- [ ] Create `components/layout/layout-shell.tsx` (client wrapper for drawer state)
- [ ] Update `app/layout.tsx` — 3-column layout
- [ ] Update `app/page.tsx` — remove FilterBar, add CRYPTO/TECH categories
- [ ] Update or remove `components/filter-bar.tsx`
- [ ] Update `app/globals.css` — header height variable
- [ ] Test desktop layout (1280px+): all 3 columns visible
- [ ] Test tablet (768-1024px): only center feed + header
- [ ] Test mobile (375px): hamburger drawer works
- [ ] Test sidebar navigation: category/source clicks filter feed

---

## Success Criteria

- FB-style 3-column layout on desktop
- Sticky header with centered search
- Left sidebar: categories + sources + alerts shortcut (clickable, filters feed)
- Right sidebar: breaking news + trending sources + active alerts
- Hamburger drawer on mobile with smooth slide-in
- All existing functionality preserved (feed, pagination, breaking banner, alerts page)
- Responsive at 375px, 768px, 1024px, 1280px breakpoints

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Layout Server/Client conflict | Thin client wrapper `layout-shell.tsx` for drawer state |
| Sidebar overlapping on medium screens | Responsive breakpoints: lg for left, xl for right |
| Search in header vs FilterBar redundancy | Remove FilterBar dropdowns, search only in header |
| Right sidebar data fetching | Client-side fetch with SWR-like pattern, stale OK |
| Large layout refactor breaking pages | Keep children slot unchanged, only wrap |
