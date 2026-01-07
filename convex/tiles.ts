import { internal } from './_generated/api';
import { internalMutation, internalQuery, query } from './_generated/server';
import { v } from 'convex/values';
import { styleTileUrl, tileCenterLatLng } from './lib/tiles';

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

    if (existingTile) {
      console.log('query', {
        table: 'tiles',
        index: 'by_tile',
        params: { x, y, z },
        found: true,
        tileId: existingTile._id,
      });
      return existingTile._id;
    }

    const { lat, lng } = tileCenterLatLng(z, x, y);
    const reverseGeocode: string = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    const tileId = await ctx.db.insert('tiles', { x, y, z, reverseGeocode });

    console.log('created', {
      table: 'tiles',
      tileId,
      data: { x, y, z, reverseGeocode },
    });

    // Schedule the geocoding action to run after the mutation completes
    await ctx.scheduler.runAfter(0, internal.geocoding.revGeocode, {
      lat,
      lng,
      tileId,
    });

    return tileId;
  },
});

// Get all tiles (useful for debugging)
export const getAllTiles = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query('tiles').collect();
  },
});

// Update tile with geocoded location
export const updateTileGeocode = internalMutation({
  args: {
    tileId: v.id('tiles'),
    reverseGeocode: v.string(),
  },
  handler: async (ctx, { tileId, reverseGeocode }) => {
    const tile = await ctx.db.get(tileId);
    const previousValue = tile?.reverseGeocode;

    await ctx.db.patch(tileId, { reverseGeocode });

    console.log('patched', {
      table: 'tiles',
      tileId,
      fields: ['reverseGeocode'],
      newValue: reverseGeocode,
      previousValue,
    });
  },
});

export const getImageUrlFromTileId = query({
  args: {
    tileId: v.id('tiles'),
  },
  handler: async (ctx, { tileId }) => {
    const tile = await ctx.db.get(tileId);
    if (!tile) {
      throw new Error('Tile not found');
    }
    return styleTileUrl(tile.z, tile.x, tile.y);
  },
});
