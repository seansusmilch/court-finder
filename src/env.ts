const required = (name: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`Missing ${name} environment variable`);
  }

  return value;
};

export const env = {
  VITE_CONVEX_URL: required('VITE_CONVEX_URL', import.meta.env.VITE_CONVEX_URL),
  VITE_MAPBOX_API_KEY: required('VITE_MAPBOX_API_KEY', import.meta.env.VITE_MAPBOX_API_KEY),
  VITE_CLERK_PUBLISHABLE_KEY: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
};
