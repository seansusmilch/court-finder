import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    MAPBOX_API_KEY: z.string().min(1),
    ROBOFLOW_API_KEY: z.string().min(1),
    ROBOFLOW_BATCH: z.string().default('User Contributed'),
    CONVEX_SITE_URL: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
