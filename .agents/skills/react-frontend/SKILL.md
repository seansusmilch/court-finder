---
name: react-frontend
description: React frontend patterns for this Court Finder project. Use when building or reviewing React components, routes, user-facing UI, styling, accessibility, mobile-first layouts, TanStack Router state, shadcn/ui usage, or Vitest frontend tests in this repository.
---

# React Frontend

Use this skill for user-facing frontend work in `src/`.

## Stack

- React 19 and TypeScript. Do not add a default `import React` only for JSX; named, namespace, and type imports from `react` are normal when needed.
- TanStack Router file routes live in `src/routes/`; keep the route component in the same route file.
- Tailwind CSS v4 is configured through `src/index.css` and `@tailwindcss/vite`.
- shadcn/ui components live in `src/components/ui/`; they are customized in this app, so edit them when the task genuinely affects shared primitives.
- Use Bun as the package/script runner. This project intentionally uses Vite and Vitest through Bun scripts.

## Project Conventions

- Use `@/` imports for `src` and `@backend` for Convex when needed.
- Use `cn()` from `@/lib/utils` for conditional classes.
- Follow nearby filename style. Existing feature components often use `PascalCase.tsx`, while shared/root components often use `kebab-case.tsx`. Components use `PascalCase`; hooks use `useCamelCase`.
- Feature components are grouped by domain: `src/components/map`, `src/components/training`, `src/components/scans`, and shared components at `src/components`.
- Keep URL state in TanStack Router search params when it affects navigation, deep linking, or refresh behavior.
- Use Convex `useQuery` and `useMutation` for Convex data; use TanStack Query `useMutation` only for non-Convex async workflows where it already fits the local pattern.

## Mobile-First UI

- Write base Tailwind classes for 320-375px screens, then add `md:` and `lg:` enhancements.
- Keep touch targets at least 44x44px, preferably 48px for primary mobile actions.
- Prefer bottom navigation, bottom sheets, and sticky bottom action bars for primary mobile flows.
- Avoid hover-only interactions; every control must work on touch.
- Prevent fixed bottom UI from covering content with matching bottom padding.
- Use skeleton states for known layouts and avoid blocking the whole screen when only part of the page is loading.

## Visual System

- Use the tokens in `src/index.css`: `font-sans`, `font-display`, `font-mono`, semantic colors, sport colors, and radius/shadow variables.
- Preserve the app palette: coral-orange primary, electric-blue secondary, forest-green accent, semantic success/warning/destructive colors.
- Use lucide icons for icon buttons and label icon-only controls with `aria-label`.
- Keep card radius consistent with the local design system; avoid nesting cards inside cards.
- Test dark mode when changing colors or shadows.

## Accessibility

- Use semantic HTML before ARIA.
- Keep visible focus states and keyboard navigation intact.
- Pair color with text, iconography, or state labels when communicating status.
- Use appropriate form labels and input types.
- Respect reduced motion with `motion-safe:` for nonessential animation.

## Verification

Run the smallest relevant check first, then broaden based on risk:

```bash
bun check-types
bun run test
bun run build
```
