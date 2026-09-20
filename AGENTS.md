## Development Commands

### Essential Commands
- `bun dev` - Run both backend (Convex) and frontend (Vite) concurrently
- `bun dev:backend` - Run Convex dev server only
- `bun dev:frontend` - Run Vite dev server on port 3001
- `bun check-types` - Type check all TypeScript code
- `bun run build` - Build production frontend
- `bun serve` - Preview production build

### Setup Commands
- `bun dev:backend:setup` - Configure and set up Convex project
- `bun generate-pwa-assets` - Generate PWA assets for different screen sizes

## Architecture Overview

### Tech Stack
- **Frontend**: React 19, TypeScript, TanStack Router, TanStack Query, TailwindCSS v4, shadcn/ui
- **Backend**: Convex (reactive database), Clerk authentication
- **Maps**: Mapbox GL JS, Mapbox Search API
- **ML**: Roboflow integration for court detection
- **Build**: Vite, Bun as package manager
- **PWA**: Progressive Web App support

### Key Components
- **Map Components**: Located in `src/components/map/` with sections and shared utilities
- **UI Components**: shadcn/ui components in `src/components/ui/`
- **Routes**: File-based routing with TanStack Router in `src/routes/`
- **Backend**: Convex functions in `convex/` with schema in `schema.ts`

### Database Schema
The Convex database schema is defined in `convex/schema.ts`. Treat that file as the source of truth for table names, fields, validators, and indexes. This project is very greenfield, so migrations or data loss are acceptable when explicitly requested; otherwise preserve deployed data.

## External Integrations

### Mapbox
- Satellite tiles and geocoding
- Custom map controls and navigation
- API key required from environment

### Roboflow
- ML inference for court detection
- Training data upload
- Model version management

## Build Configuration

### Vite Setup
- Path aliases: `@` for `src/`, `@backend` for `convex/`
- PWA with auto-update registration
- Sourcemaps enabled for debugging
- TanStack Router plugin for file-based routing

### Convex Configuration
- Auto-generated types in `convex/_generated/`
- Schema validation
- Background task scheduling

## Important Guidelines

### Bun Usage
- Always use `bun` instead of npm/yarn/pnpm
- Bun automatically loads `.env` files
- Use `bun run test` for testing

### Logging Requirements
Every log must include structured context:
- Timing information (startTs, durationMs)
- IDs for all entities (tileId, scanId, etc.)
- Progress and completion metrics

### Error Handling
- Throw descriptive errors for client-facing issues
- Validate required data before operations
- Include complete context in error logs

### Code Style
- React 19 doesn't need `import React`
- Components: `PascalCase`
- Hooks: `useCamelCase`
- Database tables: `snake_case`
