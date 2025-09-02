import type { Id } from './_generated/dataModel';
import { internalMutation, internalQuery, query } from './_generated/server';
import { v } from 'convex/values';

// Query to check if a tile already exists
export const getTileByCoordinates = query({
  args: {
    x: v.float64(),
    y: v.float64(),
    z: v.float64(),
  },
  handler: async (ctx, { x, y, z }) => {
    return await ctx.db
      .query('tiles')
      .withIndex('by_tile', (q) => q.eq('x', x).eq('y', y).eq('z', z))
      .unique();
  },
});

// Mutation to insert a tile only if it doesn't already exist
export const insertTileIfNotExists = internalMutation({
  args: {
    x: v.float64(),
    y: v.float64(),
    z: v.float64(),
  },
  handler: async (ctx, { x, y, z }) => {
    // Check if tile already exists
    const existingTile = await ctx.db
      .query('tiles')
      .withIndex('by_tile', (q) => q.eq('x', x).eq('y', y).eq('z', z))
      .unique();

    if (existingTile) return existingTile._id;

    return await ctx.db.insert('tiles', { x, y, z });
  },
});

// Get all tiles (useful for debugging)
export const getAllTiles = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query('tiles').collect();
  },
});
