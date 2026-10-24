# Court Finder

Court Finder is a React + Convex app for finding and validating sports courts from satellite imagery. It combines an interactive Mapbox map, Convex-backed court data, Roboflow inference results, and a feedback workflow for improving court verification.

## Features

- Interactive Mapbox map with court markers, clustering, filters, search, and user-location support
- Satellite tile scanning backed by Convex actions, Mapbox tiles, and Roboflow object detection
- Court records linked to ML predictions and filtered by status, confidence, class, and viewport
- Authenticated feedback flow for reviewing detections
- Admin scan review pages for inspecting scan output and tile results
- Progressive Web App support

## Stack

- React 19, TypeScript, Vite Plus, and Bun
- TanStack Router for file-based routing
- Convex for backend data and functions, with Clerk for authentication and account management
- Tailwind CSS v4 and shadcn/ui
- Mapbox GL JS, Mapbox Search, and `react-map-gl`
- Roboflow integration for satellite court detection
- Vitest (through Vite Plus) and Testing Library
- Oxlint and Oxfmt (through Vite Plus) for linting, formatting, and type checking

## Getting Started

Use Bun (the version in `package.json`) and Node.js `^22.18.0 || ^24.11.0 || >=26.0.0`.
Vite Plus is installed locally with the project; a global `vp` installation is optional.

Install dependencies:

```bash
bun install
```

Configure Convex for this checkout:

```bash
bun dev:backend:setup
```

Run the backend and frontend together:

```bash
bun dev
```

The Vite Plus frontend runs at [http://localhost:3001](http://localhost:3001).

## Environment

Frontend env, loaded by Vite:

```bash
VITE_CONVEX_URL=
VITE_MAPBOX_API_KEY=
VITE_CLERK_PUBLISHABLE_KEY=
```

Convex/server env:

```bash
MAPBOX_API_KEY=
ROBOFLOW_API_KEY=
CLERK_JWT_ISSUER_DOMAIN=
CLERK_WEBHOOK_SIGNING_SECRET=
CLERK_SECRET_KEY=
ROBOFLOW_BATCH=User Contributed
CONVEX_SITE_URL=
```

`CONVEX_SITE_URL` is optional. Set Convex environment variables in the Convex dashboard or with the Convex CLI for deployed environments.

## Scripts

- `bun dev` - Run Convex and the Vite Plus frontend concurrently
- `bun dev:backend` - Run the Convex dev server
- `bun dev:backend:setup` - Configure Convex for local development
- `bun dev:frontend` - Run `vp dev` on port 3001
- `bun run check` - Generate TanStack routes, then check formatting, lint, and types with `vp check`
- `bun check-types` - Generate TanStack routes and run Vite Plus type checking
- `bun run lint` - Run Oxlint with type-aware rules and type checking
- `bun run fmt` - Format the repository with Oxfmt
- `bun run fmt:check` - Check formatting without writing files
- `bun run test` - Run the bundled Vitest tests once with `vp test run`
- `bun run test:watch` - Run the bundled Vitest in watch mode
- `bun run build` - Build the production frontend
- `bun serve` - Preview the production build
- `bun generate-routes` - Regenerate TanStack Router route types
- `bun generate-pwa-assets` - Generate PWA image assets

The Bun scripts use the local `vp` binary. For other Vite Plus commands, use
`bunx --no-install vp <command>`. Keep using `bun dev` to start both servers;
`vp dev` starts only the frontend. Test configuration stays in `vitest.config.ts`
so unit tests do not run the app's router or PWA plugins. Lint and format settings
live in `vite.config.ts` and exclude generated Convex and route files.

## Project Structure

```text
convex/                  Convex schema, queries, mutations, actions, and libs
src/components/          Shared and feature React components
src/components/map/      Map controls, markers, popups, drawers, and filters
src/components/training/ Feedback review UI
src/components/ui/       shadcn/ui primitives customized for the app
src/hooks/               Shared React hooks
src/lib/                 Frontend constants, types, geocoding, tile helpers
src/routes/              TanStack Router file routes
src/styles/              Mapbox and global style support
```

## Verification

Use the smallest relevant check for the change:

```bash
bun run check
bun run test
bun run build
```

For backend or scan changes, also run:

```bash
bun dev:backend
```
