const required = (name: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`Missing ${name} environment variable`);
  }

  return value;
};

export const env = {
  MAPBOX_API_KEY: required('MAPBOX_API_KEY', process.env.MAPBOX_API_KEY),
  ROBOFLOW_API_KEY: required('ROBOFLOW_API_KEY', process.env.ROBOFLOW_API_KEY),
  ROBOFLOW_BATCH: process.env.ROBOFLOW_BATCH || 'User Contributed',
  CONVEX_SITE_URL: process.env.CONVEX_SITE_URL,
};
