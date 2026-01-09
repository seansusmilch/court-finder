---
name: react-frontend
description: React and frontend design patterns for this project. Use when building UI components, pages, or any user-facing features. Covers the stack (React 19, TanStack Router, Tailwind 4, Shadcn/ui), mobile-first design, client-side first experience, and distinctive visual design that avoids generic AI aesthetics.
---

# React & Frontend Design

This skill covers frontend development patterns for this project—from React architecture to visual design. The goal is to build fast, mobile-first interfaces with distinctive aesthetics.

## Stack

- **React 19** + TypeScript (no `import React` needed)
- **TanStack Router** for file-based routing
- **TanStack Query** for server state (via Convex)
- **Tailwind CSS 4** for styling
- **Shadcn/ui** (Radix primitives) for base components
- **Bun** as runtime and package manager

## Core Philosophy

### Mobile-First

Design for mobile first, then progressively enhance for larger screens. Most users are on phones—desktop is the enhancement, not the default.

**Rules:**
- Write base styles for mobile (no breakpoint prefix), add `md:` or `lg:` for larger screens
- Touch targets minimum 44x44px
- Primary actions in bottom 2/3 of screen (thumb-reachable)
- Bottom sheets over modals, bottom nav over hamburgers
- Full-width buttons on mobile, inline on desktop
- Test at 320px, 375px, 768px, 1280px

```tsx
// ✅ Mobile-first responsive pattern
<div className="
  flex flex-col gap-4 p-4      // Mobile: stack, tight spacing
  md:flex-row md:gap-6 md:p-8  // Desktop: row, more breathing room
">
```

### Client-Side First

Optimize for perceived performance. The UI should feel instant even when data is loading.

**Rules:**
- Use optimistic updates for mutations—update UI immediately, sync in background
- Show skeleton screens over spinners (feels faster)
- Never block the entire screen while part of it loads
- Preserve user input on errors
- Use TanStack Router's loader for initial data, but don't block navigation

```tsx
// ✅ Optimistic update pattern
const addItem = useMutation(api.items.create);

function handleAdd(item: Item) {
  // Update local state immediately
  setItems((prev) => [...prev, { ...item, _id: 'temp-' + Date.now() }]);
  
  // Fire mutation in background
  addItem(item).catch(() => {
    // Rollback on error
    setItems((prev) => prev.filter((i) => !i._id.startsWith('temp-')));
    toast.error('Failed to add item');
  });
}

// ✅ Skeleton screen pattern
{isLoading ? (
  <div className="space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
  </div>
) : (
  <Content data={data} />
)}
```

## Project Structure

```
src/
├── components/
│   ├── ui/              # Shadcn base components (don't modify)
│   ├── map/             # Feature: map components
│   └── header.tsx       # Shared components at root
├── hooks/               # Custom hooks
├── lib/                 # Utils, types, constants
└── routes/              # TanStack Router pages
```

**Naming:**
- Files: `kebab-case.tsx` (e.g., `court-marker.tsx`)
- Components: `PascalCase` (e.g., `CourtMarker`)
- Hooks: `useCamelCase` (e.g., `useLocalStorage`)

## Imports & Patterns

```tsx
// ✅ React 19 - no import needed
function MyComponent() { ... }

// ❌ Never do this
import React from 'react';

// ✅ Use path alias
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ✅ Conditional classes with cn()
<div className={cn('base-class', isActive && 'active-class')} />
```

### Props & Types

```tsx
interface CourtCardProps {
  court: Court;
  onSelect: (id: string) => void;
  isSelected?: boolean;
}

export function CourtCard({ court, onSelect, isSelected = false }: CourtCardProps) {
  return (
    <button
      onClick={() => onSelect(court._id)}
      className={cn(
        'p-4 rounded-lg border transition-colors',
        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      )}
    >
      {court.name}
    </button>
  );
}
```

## Routing (TanStack Router)

Keep route component in the same file:

```tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/courts/$courtId')({
  loader: async ({ params }) => {
    // Fetch initial data (runs on navigation)
    return { courtId: params.courtId };
  },
  component: CourtPage,
});

function CourtPage() {
  const { courtId } = Route.useLoaderData();
  const court = useQuery(api.courts.get, { id: courtId });
  
  return <div>{court?.name}</div>;
}
```

**Prefer router features over component state:**
- Use `loader` for initial data fetching
- Use search params (`useSearch`) over `useState` for URL-driven state
- Use `Link` component for navigation

## State Management

| Use Case | Solution |
|----------|----------|
| Server data | Convex `useQuery` / `useMutation` |
| URL state | TanStack Router search params |
| Local persistence | `useLocalStorage` hook |
| Component state | `useState` / `useReducer` |

## Visual Design System

This project uses a distinctive design system. **Do not default to generic patterns.**

### Typography

The project uses a premium font pairing defined in `src/index.css`:

- **Body text:** Plus Jakarta Sans (`font-sans`)
- **Display/headings:** Space Grotesk (`font-display`)  
- **Code:** JetBrains Mono (`font-mono`)

```tsx
// ✅ Use the font system
<h1 className="font-display text-3xl font-bold tracking-tight">
  Court Finder
</h1>
<p className="font-sans text-muted-foreground">
  Find basketball courts near you
</p>
```

### Color Palette

The project uses OKLCH colors for perceptually uniform design. Colors are defined as CSS variables:

- **Primary:** Vibrant coral-orange (`--primary`) — energy, action
- **Secondary:** Electric blue (`--secondary`) — trust, tech
- **Accent:** Forest green (`--accent`) — nature, outdoors
- **Semantic:** Success (green), warning (amber), destructive (red)

```tsx
// ✅ Use semantic color classes
<Button variant="default">Primary Action</Button>    // Coral-orange
<Button variant="secondary">Secondary</Button>       // Electric blue
<Badge className="bg-accent text-accent-foreground">Outdoor</Badge>

// ✅ Sport-specific colors (defined in index.css)
<div className="bg-basketball border-basketball">Basketball</div>
<div className="bg-tennis border-tennis">Tennis</div>
```

### Spacing

Use the 4px base scale consistently:

```
4px  (gap-1)   → Icon-to-label, tight inline
8px  (gap-2)   → Related items, form fields
16px (gap-4)   → Between components, card padding
24px (gap-6)   → Section separation
32px (gap-8)   → Major section breaks
```

**Rule:** Related items get less space, unrelated items get more.

### Avoiding Generic Design

Make intentional, distinctive choices:

**Typography:**
- Use `font-display` (Space Grotesk) for headings—it has character
- Vary font weights purposefully (not everything bold)
- Use `tracking-tight` on large headings, normal on body

**Color:**
- Commit to the coral-orange/blue/green palette—don't add random colors
- Use color with intention: primary for actions, accent for highlights
- Dark mode is supported—test both themes

**Layout:**
- Asymmetry is fine—not everything needs to be perfectly centered
- Use whitespace generously—dense UIs feel cheap
- Cards should have consistent border-radius (use `rounded-lg`)

**Motion:**
- Add subtle transitions (`transition-colors`, `transition-transform`)
- Use `animate-spin` for loaders, custom animations sparingly
- Respect `prefers-reduced-motion`

```tsx
// ✅ Distinctive, not generic
<Card className="p-6 hover:shadow-lg transition-shadow">
  <h2 className="font-display text-xl font-semibold tracking-tight">
    Nearby Courts
  </h2>
  <p className="mt-2 text-muted-foreground">
    Found 12 courts within 5 miles
  </p>
  <div className="mt-4 flex gap-2">
    <Badge className="bg-basketball text-white">Basketball</Badge>
    <Badge variant="outline">Public</Badge>
  </div>
</Card>
```

## Component Patterns

### Buttons

```tsx
// ✅ Clear hierarchy with descriptive text
<Button>Find Courts</Button>                    // Primary
<Button variant="secondary">View Map</Button>   // Secondary  
<Button variant="ghost">Learn more</Button>     // Tertiary

// ✅ Loading state
<Button disabled={isPending}>
  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isPending ? 'Saving...' : 'Save Changes'}
</Button>
```

### Forms

```tsx
<form className="space-y-4">
  <div>
    <Label htmlFor="location">Location</Label>
    <Input 
      id="location" 
      placeholder="Enter city or zip code"
      className="mt-1"
    />
  </div>
  <Button type="submit" className="w-full md:w-auto">
    Search
  </Button>
</form>
```

### Empty States

Never show blank screens:

```tsx
<div className="text-center py-12">
  <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
  <h3 className="mt-4 font-display text-lg font-medium">No courts found</h3>
  <p className="mt-2 text-muted-foreground">
    Try expanding your search radius or moving the map.
  </p>
  <Button className="mt-6">Search Nearby</Button>
</div>
```

### Error States

```tsx
<Alert variant="destructive">
  <AlertTitle>Unable to load courts</AlertTitle>
  <AlertDescription>
    Please check your connection and try again.
  </AlertDescription>
  <Button variant="outline" size="sm" className="mt-2" onClick={retry}>
    Retry
  </Button>
</Alert>
```

## Mobile Patterns

### Bottom Navigation

For mobile, put primary navigation at the bottom:

```tsx
<nav className="fixed bottom-0 inset-x-0 bg-background border-t md:hidden">
  <div className="flex justify-around py-2">
    <NavLink to="/map" icon={<Map />} label="Map" />
    <NavLink to="/list" icon={<List />} label="List" />
    <NavLink to="/profile" icon={<User />} label="Profile" />
  </div>
</nav>
```

### Bottom Sheets (over modals)

```tsx
<Sheet>
  <SheetTrigger asChild>
    <Button>Filter</Button>
  </SheetTrigger>
  <SheetContent side="bottom" className="h-[80vh]">
    <SheetHeader>
      <SheetTitle>Filter Courts</SheetTitle>
    </SheetHeader>
    {/* Filter content */}
  </SheetContent>
</Sheet>
```

### Sticky Actions

```tsx
<div className="fixed bottom-0 inset-x-0 p-4 bg-background border-t md:static md:border-0 md:p-0">
  <Button className="w-full md:w-auto">Get Directions</Button>
</div>
```

## Accessibility

Minimum requirements for all components:

1. **Keyboard navigation:** Tab through all interactive elements
2. **Focus states:** Visible focus rings (handled by Shadcn defaults)
3. **Color contrast:** 4.5:1 for text (OKLCH palette is designed for this)
4. **Touch targets:** 44x44px minimum
5. **Screen readers:** Semantic HTML + aria-labels on icon buttons

```tsx
// ✅ Accessible icon button
<Button size="icon" aria-label="Close dialog">
  <X className="h-4 w-4" />
</Button>

// ✅ Reduced motion support
<div className="motion-safe:animate-fade-in">
  Content
</div>
```

## Verification

Run `bun check-types` after changes to catch type errors.

## Key Files

- `src/index.css` — Design tokens (colors, fonts, shadows)
- `src/lib/utils.ts` — The `cn()` utility
- `src/components/ui/` — Shadcn base components
- `src/routes/` — TanStack Router pages
