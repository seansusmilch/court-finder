---
name: refactor
description: Refactoring workflow for this project. Use when restructuring code for readability, maintainability, reuse, lower coupling, or simpler boundaries while preserving current behavior.
---

# Refactor

Improve structure without changing observable behavior.

## Workflow

1. Read the current code and identify inputs, outputs, side effects, data dependencies, and edge cases.
2. Identify duplication, long functions, mixed concerns, high coupling, magic values, unclear names, and repeated UI or backend patterns.
3. Plan small, behavior-preserving edits. Keep public APIs, route behavior, data shapes, and user-visible output stable unless the task asks otherwise.
4. Refactor incrementally and keep each edit scoped to the responsibility being improved.
5. Verify with focused tests, then type checks and build as needed.

## Project Guidance

- Prefer local conventions and existing helpers over new abstractions.
- Extract shared UI only when duplication is meaningful; do not move app-specific business logic into `src/components/ui`.
- Put reusable non-UI helpers in `src/lib` or the closest existing domain module; do not force everything into `src/lib/utils.ts`.
- Keep Convex writes transactional and avoid moving external API calls into queries or mutations.
- When splitting backend code, preserve indexes, validators, auth checks, permissions, structured logs, and scheduler behavior.
- When splitting React code, preserve URL state, loader behavior, accessibility, loading states, and responsive layout.

## Presentational Components

Presentational components should:

- Accept data and callbacks through props.
- Avoid fetching, mutations, global state, and hidden side effects.
- Own only local UI state when needed.
- Use clear prop names and TypeScript interfaces.

## Verification

Choose checks based on blast radius:

```bash
bun run test
bun check-types
bun run build
```
