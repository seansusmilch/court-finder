---
name: Mobile-First UI Overhaul
overview: Implement mobile-first UI improvements including a persistent bottom navigation bar for mobile, redesigned homepage with better visual hierarchy, and an optimized feedback page with thumb-zone-friendly controls.
todos:
  - id: bottom-nav
    content: Create bottom navigation component with mobile-first design
    status: completed
  - id: header-simplify
    content: Simplify header - remove hamburger menu, keep desktop nav
    status: completed
  - id: root-layout
    content: Update root layout to integrate bottom nav and add mobile padding
    status: completed
  - id: homepage-redesign
    content: Redesign homepage with mobile-first layout, thumb-zone CTAs, collapsible disclaimer
    status: completed
  - id: feedback-optimize
    content: Optimize feedback page with fixed bottom action bar and larger touch targets
    status: completed
  - id: skeleton-loader
    content: Add skeleton loading states for better perceived performance
    status: completed
---

# Mobile-First UI Overhaul

## 1. Bottom Navigation for Mobile

Replace the hamburger menu with a persistent bottom navigation bar on mobile devices, following the design principle that bottom navigation is more thumb-friendly.

**Files to modify:**

- [`src/components/header.tsx`](src/components/header.tsx) - Remove mobile hamburger menu
- Create new `src/components/bottom-nav.tsx` - Mobile bottom navigation component
- [`src/routes/__root.tsx`](src/routes/__root.tsx) - Integrate bottom nav into layout

**Implementation:**

- Fixed bottom bar with 4-5 key navigation items (Home, Map, Feedback, Account/Login)
- 48x48px touch targets with icons + labels
- Active state indicator on current route
- Hide on desktop (md: breakpoint and above)
- Adjust main content to account for bottom nav height on mobile
```tsx
// Bottom nav structure
<nav className="fixed bottom-0 inset-x-0 bg-background border-t md:hidden z-50">
  <div className="flex justify-around py-2">
    <NavItem icon={Home} label="Home" to="/" />
    <NavItem icon={Map} label="Map" to="/map" />
    <NavItem icon={MessageSquare} label="Feedback" to="/feedback" />
    <NavItem icon={User} label="Account" to="/login" />
  </div>
</nav>
```


---

## 2. Homepage Redesign

Simplify the homepage for mobile-first design with better visual hierarchy and thumb-zone placement.

**File to modify:** [`src/routes/index.tsx`](src/routes/index.tsx)

**Changes:**

- Mobile-first layout: Single column stacking, scales to 2-column on md:
- Hero section: Simplified, with CTA buttons positioned lower (thumb zone)
- Feature cards: Full-width on mobile, grid on desktop
- Disclaimer card: Collapsible accordion on mobile to save space
- Remove heavy animations (fade-in, slide-in) or use `motion-safe:` prefix
- Footer: Simpler, integrated into bottom navigation context

**Before/After layout:**

```
Mobile (Current)           Mobile (New)
+-------------------+      +-------------------+
| [Logo] [Hamburger]|      | [Logo]            |  <- Simplified header
+-------------------+      +-------------------+
| Hero Image        |      | Hero (smaller)    |
| BIG Title         |      | Concise Title     |
| Long Description  |      | Brief tagline     |
| [CTA] [CTA]       |      +-------------------+
+-------------------+      | Feature 1 (card)  |
| Feature Cards     |      | Feature 2 (card)  |
| (3 columns)       |      | Feature 3 (card)  |
+-------------------+      +-------------------+
| Disclaimer        |      | [Disclaimer ▼]    |  <- Collapsible
| (large)           |      +-------------------+
+-------------------+      | [Primary CTA]     |  <- Sticky bottom
| Footer            |      +-------------------+
+-------------------+      | [Bottom Nav]      |
                           +-------------------+
```

---

## 3. Feedback Page Optimization

Redesign the feedback page for optimal thumb-zone usage and clearer visual hierarchy.

**File to modify:** [`src/routes/_authed.feedback.tsx`](src/routes/_authed.feedback.tsx)

**Changes:**

- Move action buttons to fixed bottom bar (sticky within thumb zone)
- Increase button sizes to 48px+ height with full-width on mobile
- Replace spinner with skeleton loading state
- Simplify top header (progress indicator only)
- Make the image viewer take more vertical space
- Reduce metadata clutter at bottom

**New layout structure:**

```
+-------------------+
| [Help] 12 left    |  <- Compact header
+-------------------+
|                   |
|   [Image with     |
|    bounding box]  |  <- Takes majority of screen
|                   |
+-------------------+
| Is this a Tennis? |  <- Question centered
+-------------------+
| [No] [Unsure][Yes]|  <- Fixed bottom, full-width buttons
+-------------------+
| [Bottom Nav]      |
+-------------------+
```

**Key improvements:**

- Buttons: 48px height, proper spacing (12px gap)
- Question: Larger text (text-xl), centered
- Loading: Skeleton placeholder for image
- Touch targets: All interactive elements 44px+

---

## 4. Global Improvements

### Skeleton Loading Component

Create a reusable skeleton loader to replace the current spinner in [`src/components/loader.tsx`](src/components/loader.tsx).

```tsx
// New pattern for route loading
<div className="space-y-4 p-4">
  <Skeleton className="h-8 w-48" />
  <Skeleton className="h-64 w-full" />
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-3/4" />
</div>
```

### Layout Adjustment for Bottom Nav

Update root layout to add padding-bottom on mobile to prevent content being hidden behind the fixed bottom nav.

```tsx
// In __root.tsx
<main className="pb-16 md:pb-0">
  <Outlet />
</main>
```

---

## Files Changed Summary

| File | Change |

|------|--------|

| `src/components/bottom-nav.tsx` | New - Mobile bottom navigation |

| `src/components/header.tsx` | Modify - Remove mobile hamburger menu |

| `src/routes/__root.tsx` | Modify - Add bottom nav, adjust layout padding |

| `src/routes/index.tsx` | Modify - Mobile-first homepage redesign |

| `src/routes/_authed.feedback.tsx` | Modify - Thumb-zone optimized layout |

| `src/components/loader.tsx` | Modify - Add skeleton variant |