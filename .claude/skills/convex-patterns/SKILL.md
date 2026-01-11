---
name: convex-patterns
description: Convex backend patterns for this project. Use when writing queries, mutations, actions, or working with the Convex schema, authentication, permissions, or database operations.
---

# Convex Backend Patterns

This skill documents the Convex backend conventions used in this project. Follow these patterns when writing new Convex functions, queries, mutations, or actions.

## Function Types

Choose the correct function type based on what you need:

- **`query`**: Public read-only operations that can be called from the frontend. Use for fetching data.
- **`internalQuery`**: Internal read-only operations, only callable from other Convex functions (via `internal.*` API). Use for helper queries.
- **`mutation`**: Public write operations that can be called from the frontend. Use for creating, updating, or deleting data.
- **`internalMutation`**: Internal write operations, only callable from other Convex functions. Use for helper mutations.
- **`action`**: Operations that can call external APIs, use Node.js APIs, or perform long-running work. Must use `'use node'` directive. Actions can call queries/mutations via `ctx.runQuery()` and `ctx.runMutation()`.

### Examples

```typescript
// Public query
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

// Internal mutation
export const insertTileIfNotExists = internalMutation({
  args: {
    x: v.float64(),
    y: v.float64(),
    z: v.float64(),
  },
  handler: async (ctx, { x, y, z }) => {
    // Implementation
  },
});

// Action with external API calls
export const scanArea = action({
  args: {
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    // Can call external APIs, use process.env, etc.
  },
});
```

## API Exposure

- **Public API**: Functions exported as `query` or `mutation` are accessible via `api.*` (e.g., `api.users.me`)
- **Internal API**: Functions exported as `internalQuery` or `internalMutation` are accessible via `internal.*` (e.g., `internal.tiles.insertTileIfNotExists`)

When calling from actions:
- Use `ctx.runQuery(api.users.me, {})` for public queries
- Use `ctx.runQuery(internal.tiles.getAllTiles)` for internal queries
- Use `ctx.runMutation(api.users.updateProfile, { name: '...' })` for public mutations
- Use `ctx.runMutation(internal.tiles.insertTileIfNotExists, { x, y, z })` for internal mutations

## Authentication

Always use `getAuthUserId(ctx)` from `@convex-dev/auth/server` to get the current user:

```typescript
import { getAuthUserId } from '@convex-dev/auth/server';

export const someQuery = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      // Handle unauthenticated case
      return null;
    }
    // Use userId
  },
});
```

## Permissions

The project uses a permission-based authorization system. Check permissions using the `hasPermission` query pattern:

```typescript
import { PERMISSIONS } from './lib/constants';

// In an action, check permissions:
const canScan = await ctx.runQuery(api.users.hasPermission, {
  permission: PERMISSIONS.SCANS.EXECUTE,
});
if (!canScan || !userId) {
  throw new Error('Unauthorized');
}
```

Available permissions are defined in `convex/lib/constants.ts`:
- `PERMISSIONS.SCANS.READ`, `PERMISSIONS.SCANS.WRITE`, `PERMISSIONS.SCANS.EXECUTE`
- `PERMISSIONS.TRAINING.READ`, `PERMISSIONS.TRAINING.WRITE`
- `PERMISSIONS.ADMIN.ACCESS`

## Validation

Use Convex validators from `convex/values` (imported as `v`) to validate function arguments:

```typescript
import { v } from 'convex/values';

export const myQuery = query({
  args: {
    tileId: v.id('tiles'),
    optionalName: v.optional(v.string()),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    // args are typed and validated
  },
});
```

Common validators:
- `v.string()`, `v.number()`, `v.boolean()`
- `v.id('tableName')` - validates table ID
- `v.optional(v.string())` - optional string
- `v.array(v.string())` - array of strings
- `v.object({ field: v.string() })` - object with fields
- `v.float64()` - 64-bit float

## Indexes

Indexes are defined in `convex/schema.ts` using `.index()`:

```typescript
tiles: defineTable({
  x: v.float64(),
  y: v.float64(),
  z: v.float64(),
}).index('by_tile', ['x', 'y', 'z']),
```

Query using indexes with `withIndex()`:

```typescript
const tile = await ctx.db
  .query('tiles')
  .withIndex('by_tile', (q) => q.eq('x', x).eq('y', y).eq('z', z))
  .unique();
```

For compound indexes, chain `.eq()` calls for each indexed field in order.

## Logging

Use structured logging with consistent event types. Log objects should include:
- Event type as the first key: `'query'`, `'created'`, `'patched'`, `'start'`, `'complete'`, `'error'`
- Table name (if applicable)
- Relevant IDs and parameters
- Timing information when appropriate

```typescript
console.log('query', {
  table: 'tiles',
  index: 'by_tile',
  params: { x, y, z },
  found: !!existingTile,
  tileId: existingTile?._id,
});

console.log('created', {
  table: 'tiles',
  tileId,
  data: { x, y, z, reverseGeocode },
});

console.log('patched', {
  table: 'tiles',
  tileId,
  fields: ['reverseGeocode'],
  newValue: reverseGeocode,
  previousValue,
});

console.log('start', {
  startTs: Date.now(),
  userId,
  bbox: args.bbox,
  zoom: args.zoom,
});

console.log('complete', {
  durationMs: Date.now() - startTs,
  userId,
  input: { latitude, longitude },
  output: { scanId, tilesProcessed },
});
```

## Scheduler

Use `ctx.scheduler.runAfter()` to schedule async work after a mutation completes:

```typescript
await ctx.scheduler.runAfter(0, internal.geocoding.revGeocode, {
  lat,
  lng,
  tileId,
});
```

The delay is in milliseconds (0 = run immediately after mutation completes).

## Storage

Use `ctx.storage` for file operations:

```typescript
// Generate upload URL
const uploadUrl = await ctx.storage.generateUploadUrl();

// Get file URL
const fileUrl = await ctx.storage.getUrl(storageId);

// Delete file
await ctx.storage.delete(storageId);
```

Storage IDs are typed as `v.id('_storage')` in the schema.

## Environment Variables

Access environment variables in actions (not queries/mutations) using `process.env`:

```typescript
const mapboxToken = process.env[ENV_VARS.MAPBOX_API_KEY];
```

Environment variable names are defined in `convex/lib/constants.ts` as `ENV_VARS`.

## Migrations

Use the `@convex-dev/migrations` package with `migrations.define()` for data migrations. This pattern allows migrations to be included in the `runAll` runner and executed in a controlled sequence.

```typescript
import { Migrations } from '@convex-dev/migrations';
import { components } from './_generated/api';
import type { DataModel } from './_generated/dataModel';

export const migrations = new Migrations<DataModel>(components.migrations);

export const myMigration = migrations.define({
  table: 'tableName',
  migrateOne: async (ctx, doc) => {
    // Modify and return partial document updates
    // Or return undefined to skip the document
    return { field: newValue, oldField: undefined };
  },
});

export const runAll = migrations.runner([
  internal.migrations.myMigration,
  // Add more migrations in execution order
]);
```

### Migration Patterns

**Delete documents** matching criteria:
```typescript
export const removeDocuments = migrations.define({
  table: 'inference_predictions',
  migrateOne: async (ctx, doc) => {
    if (doc.class === 'swimming-pool') {
      await ctx.db.delete(doc._id);
    }
  },
});
```

**Update fields** on documents:
```typescript
export const updateFields = migrations.define({
  table: 'scans',
  migrateOne: async (ctx, doc) => {
    const centerTile = pointToTile(doc.centerLat, doc.centerLong);
    return { centerTile };
  },
});
```

**Create related documents** and link them:
```typescript
export const createAndLink = migrations.define({
  table: 'inference_predictions',
  migrateOne: async (ctx, doc) => {
    if (doc.courtId) return;

    const courtId = await ctx.db.insert('courts', { /* ... */ });
    await ctx.db.patch(doc._id, { courtId });
  },
});
```

**Schedule async work** with the scheduler:
```typescript
export const migrateTilesReverseGeocode = migrations.define({
  table: 'tiles',
  migrateOne: async (ctx, doc) => {
    const { lat, lng } = tileCenterLatLng(doc.z, doc.x, doc.y);
    await ctx.scheduler.runAfter(0, internal.geocoding.revGeocode, {
      lat,
      lng,
      tileId: doc._id,
    });
  },
});
```

**Call internal functions** from migrations:
```typescript
export const complexMigration = migrations.define({
  table: 'inference_predictions',
  migrateOne: async (ctx, doc) => {
    const overlappingCourt = await ctx.runQuery(
      internal.courts.findOverlappingCourt,
      { /* args */ }
    );

    if (overlappingCourt) {
      await ctx.db.patch(doc._id, { courtId: overlappingCourt.courtId });
    }
  },
});
```

### Running Migrations

Execute all migrations:
```bash
bun convex run migrations:runAll
```

## Common Patterns

### Upsert Pattern

Check if record exists, update if found, insert if not:

```typescript
const existing = await ctx.db
  .query('inference_predictions')
  .withIndex('by_tile_model_version_detection', (q) =>
    q.eq('tileId', args.tileId)
      .eq('model', args.model)
      .eq('version', args.version)
      .eq('roboflowDetectionId', args.prediction.detection_id)
  )
  .unique();

if (existing) {
  await ctx.db.patch(existing._id, updateData);
  return existing._id;
} else {
  const id = await ctx.db.insert('inference_predictions', updateData);
  return id;
}
```

### Find or Create Pattern

```typescript
const existing = await ctx.db
  .query('tiles')
  .withIndex('by_tile', (q) => q.eq('x', x).eq('y', y).eq('z', z))
  .unique();

if (existing) {
  return existing._id;
}

const tileId = await ctx.db.insert('tiles', { x, y, z });
return tileId;
```

## Convex CLI

Use the Convex CLI to run functions directly from the terminal:

### Run Functions

```bash
# Run a query or mutation without arguments
npx convex run users.me '{}'

# Run with JSON arguments (passed directly after function name)
npx convex run users.updateProfile '{"name": "John Doe"}'

# Function naming uses colons (module:function)
npx convex run inferences:featuresByViewport '{"bbox": {"minLat": 44.9, "maxLat": 45.0, "minLng": -93.1, "maxLng": -93.0}, "zoom": 14}'

# Run an action
npx convex run actions.scanArea '{"latitude": 37.7749, "longitude": -122.4194}'
```

**Important**: Arguments are passed as JSON directly after the function name, NOT with a `--args` flag.

### Run Queries (Read-only)

```bash
# List all tiles
npx convex run tiles:getAllTiles '{}'

# Query with filters
npx convex run tiles:getTileByCoordinates '{"x": 123, "y": 456, "z": 14}'
```

### Run Mutations (Write Operations)

```bash
# Create a new scan
npx convex run scans:create '{"latitude": 37.7749, "longitude": -122.4194, "zoom": 14}'

# Update a record
npx convex run users:updateProfile '{"name": "New Name"}'

# Admin status override
npx convex run courts:updateCourtStatus '{"courtId": "...", "status": "rejected"}'
```

### Running Migrations

```bash
# Run all pending migrations
npx convex run migrations:runAll

# Run a specific migration (will do dry run by default)
npx convex run migrations:myMigration

# Note: Migrations using @convex-dev/migrations track state and will skip already-completed migrations
```

### Useful CLI Commands

```bash
# Start Convex dev server (recommended to use bun)
bun dev:backend

# Start both backend and frontend
bun dev

# Deploy to production
npx convex deploy

# View logs (not available on self-hosted deployments)
npx convex logs
```

### CLI Gotchas

- **No `--args` flag**: Pass JSON arguments directly after the function name
- **Function naming**: Use `module:functionName` format with colons, not dots
- **Self-hosted deployments**: The `npx convex dashboard` command is NOT supported for self-hosted deployments
- **Migration dry runs**: Migrations run in dry-run mode by default - check logs for "DRY RUN" messages
- **Watch mode**: The dev server automatically syncs code changes and runs migrations

## Key Files

- `convex/schema.ts` - Database schema and indexes
- `convex/lib/constants.ts` - Constants including permissions and config
- `convex/users.ts` - User management and auth patterns
- `convex/tiles.ts` - Example query/mutation patterns
- `convex/actions.ts` - Example action patterns
