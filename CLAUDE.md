# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `bun dev` - Run both backend (Convex) and frontend (Vite) concurrently
- `bun dev:backend` - Run Convex dev server only
- `bun dev:frontend` - Run Vite dev server on port 3001
- `bun check-types` - Type check all TypeScript code
- `bun build` - Build production frontend
- `bun serve` - Preview production build

### Setup Commands
- `bun dev:backend:setup` - Configure and set up Convex project
- `bun generate-pwa-assets` - Generate PWA assets for different screen sizes
- `bun ruler:apply` - Apply linter rules (Intellectronica Ruler)

## Architecture Overview

### Tech Stack
- **Frontend**: React 19, TypeScript, TanStack Router, TanStack Query, TailwindCSS v4, shadcn/ui
- **Backend**: Convex (reactive database), Convex Auth
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
- `users` - User profiles with permissions
- `tiles` - Geographic map tiles (x, y, z coordinates)
- `inference_predictions` - ML predictions for courts
- `scans` - Area scans for court detection
- `feedback_submissions` - User feedback on predictions
- `upload_batches` - Batch upload management for training data

## Development Patterns

### Frontend Development
- Use `@/` path alias for imports (e.g., `@/components/ui/button`)
- Route components should be in the same file as their route definition
- Use loaders for data fetching, search params for URL state
- Mobile-first design with responsive breakpoints
- Use `cn()` utility for conditional classes

### Backend Development
- Public functions: `query`, `mutation`, `action`
- Internal functions: `internalQuery`, `internalMutation` (server-side only)
- Actions must have `'use node';` for external API access
- Use indexes for efficient database queries
- Structured logging with complete context

### Authentication
- Convex Auth for user management
- Permission-based access control
- Anonymous user support
- Get user with `getAuthUserId(ctx)` in functions

### State Management
| Use Case | Solution |
|----------|----------|
| Server data | Convex `useQuery` / `useMutation` |
| Async mutations | TanStack Query `useMutation` |
| URL state | TanStack Router search params |
| Local persistence | `useLocalStorage` hook |

## External Integrations

### Mapbox
- Satellite tiles and geocoding
- Custom map controls and navigation
- API key required from environment

### Roboflow
- ML inference for court detection
- Training data upload
- Model version management

### Environment Variables
- `MAPBOX_API_KEY` - Mapbox API access
- `ROBOFLOW_API_KEY` - Roboflow API access

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
- Use `bun test` for testing (when tests are added)

### Logging Requirements
Every log must include structured context:
- Timing information (startTs, durationMs)
- Authentication context (userId, permissions)
- IDs for all entities (tileId, scanId, etc.)
- Progress and completion metrics

### Error Handling
- Throw descriptive errors for client-facing issues
- Validate required data before operations
- Include complete context in error logs

### Code Style
- React 19 doesn't need `import React`
- Component files: `kebab-case.tsx`
- Components: `PascalCase`
- Hooks: `useCamelCase`
- Database tables: `snake_case`

## Recent Development
Current branch `map-layout-redo` focuses on:
- Enhanced map components with better organization
- Improved user location features
- Refactoring of map sections and shared utilities