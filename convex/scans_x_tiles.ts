import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server';
import { v } from 'convex/values';
import { Doc } from './_generated/dataModel';

// Query to check if a scan-tile relationship already exists
export const getScanTileRelationship = query({
  args: {
    scanId: v.id('scans'),
    tileId: v.id('tiles'),
  },
  handler: async (ctx, { scanId, tileId }) => {
    return await ctx.db
      .query('scans_x_tiles')
      .withIndex('by_scan_and_tile', (q) =>
        q.eq('scanId', scanId).eq('tileId', tileId)
      )
      .unique();
  },
});

// Mutation to create a scan-tile relationship only if it doesn't already exist
export const insertScanTileRelationshipIfNotExists = internalMutation({
  args: {
    scanId: v.id('scans'),
    tileId: v.id('tiles'),
  },
  handler: async (ctx, { scanId, tileId }) => {
    // Check if relationship already exists
    const existingRelationship = await ctx.db
      .query('scans_x_tiles')
      .withIndex('by_scan_and_tile', (q) =>
        q.eq('scanId', scanId).eq('tileId', tileId)
      )
      .unique();

    if (existingRelationship) {
      return existingRelationship._id;
    }

    // Create new relationship
    return await ctx.db.insert('scans_x_tiles', { scanId, tileId });
  },
});

// Get all tiles for a specific scan
export const getTilesForScan = internalQuery({
  args: {
    scanId: v.id('scans'),
  },
  handler: async (ctx, { scanId }) => {
    const relationships = await ctx.db
      .query('scans_x_tiles')
      .withIndex('by_scan_and_tile', (q) => q.eq('scanId', scanId))
      .collect();

    // Get the actual tile documents
    const tiles = await Promise.all(
      relationships.map(async (rel) => {
        const tile = await ctx.db.get(rel.tileId);
        return tile;
      })
    );

    return tiles.filter(Boolean) as Doc<'tiles'>[];
  },
});

// Batch insert scan-tile relationships (useful for migrations)
export const insertScanTileRelationshipsBatch = mutation({
  args: {
    scanId: v.id('scans'),
    tileIds: v.array(v.id('tiles')),
  },
  handler: async (ctx, { scanId, tileIds }) => {
    const relationshipIds = [];

    for (const tileId of tileIds) {
      // Check if relationship already exists
      const existingRelationship = await ctx.db
        .query('scans_x_tiles')
        .withIndex('by_scan_and_tile', (q) =>
          q.eq('scanId', scanId).eq('tileId', tileId)
        )
        .unique();

      if (existingRelationship) {
        relationshipIds.push(existingRelationship._id);
      } else {
        const relationshipId = await ctx.db.insert('scans_x_tiles', {
          scanId,
          tileId,
        });
        relationshipIds.push(relationshipId);
      }
    }

    return relationshipIds;
  },
});
