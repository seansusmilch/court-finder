import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { reverseGeocode } from './lib/geocoding';
import { v } from 'convex/values';

export const revGeocode = internalAction({
  args: {
    lat: v.number(),
    lng: v.number(),
    tileId: v.optional(v.id('tiles')),
  },
  handler: async (ctx, { lat, lng, tileId }): Promise<string> => {
    const startTs = Date.now();

    console.log('start', {
      startTs,
      lat,
      lng,
      tileId,
    });

    const geocodedLocation = await reverseGeocode(lat, lng);

    // If we have a tileId, update the tile with the geocoded location
    if (tileId) {
      await ctx.runMutation(internal.tiles.updateTileGeocode, {
        tileId,
        reverseGeocode: geocodedLocation,
      });
    }

    console.log('complete', {
      durationMs: Date.now() - startTs,
      lat,
      lng,
      tileId,
      result: geocodedLocation,
    });

    return geocodedLocation;
  },
});
