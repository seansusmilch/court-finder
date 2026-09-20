# Mapbox upgrade evidence

Captured from the Vite development server at `http://localhost:3001/map` using
the project environment configuration and Chrome headless with WebGL enabled.

- [Desktop satellite map](./mapbox-dev-initial.png) — Mapbox satellite style,
  search, court filters, map settings, scale control, locate, and bearing
  controls rendered together.
- [Desktop standard dark map](./mapbox-dev-standard-dark.png) — map style
  switch changed from satellite to the standard dark style and the map rebuilt
  successfully.
- [Mobile satellite map](./mapbox-dev-mobile.png) — responsive map canvas,
  search/filter controls, navigation controls, and bottom navigation rendered at
  a 390 × 844 viewport.

The live Convex dataset returned zero court features in the captured viewport,
so cluster expansion and court-detail interactions require a seeded/authenticated
dataset and were not represented in these screenshots. The browser run did
confirm the map canvas and scale control mounted, with 20 Mapbox-related
responses returning HTTP 200/204 and no runtime exceptions.
