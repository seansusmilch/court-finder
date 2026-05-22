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

- React 19, TypeScript, Vite, and Bun
- TanStack Router for file-based routing
- Convex and Convex Auth for backend data, functions, and authentication
- Tailwind CSS v4 and shadcn/ui
- Mapbox GL JS, Mapbox Search, and `react-map-gl`
- Roboflow integration for satellite court detection
- Vitest and Testing Library

## Getting Started

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

The Vite app runs at [http://localhost:3001](http://localhost:3001).

## Environment

Frontend env, loaded by Vite:

```bash
VITE_CONVEX_URL=
VITE_MAPBOX_API_KEY=
```

Convex/server env:

```bash
MAPBOX_API_KEY=
ROBOFLOW_API_KEY=
ROBOFLOW_BATCH=User Contributed
CONVEX_SITE_URL=
```

`CONVEX_SITE_URL` is optional. Set Convex environment variables in the Convex dashboard or with the Convex CLI for deployed environments.

## Scripts

- `bun dev` - Run Convex and Vite concurrently
- `bun dev:backend` - Run the Convex dev server
- `bun dev:backend:setup` - Configure Convex for local development
- `bun dev:frontend` - Run Vite on port 3001
- `bun check-types` - Generate TanStack routes and run TypeScript checking
- `bun run test` - Run Vitest tests once
- `bun run test:watch` - Run Vitest in watch mode
- `bun run build` - Build the production frontend
- `bun serve` - Preview the production build
- `bun generate-routes` - Regenerate TanStack Router route types
- `bun generate-pwa-assets` - Generate PWA image assets

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
bun check-types
bun run test
bun run build
```

For backend or scan changes, also run:

```bash
bun dev:backend
```
