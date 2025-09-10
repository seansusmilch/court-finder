# Project: Court Finder

## Overview

This is a web application designed to find basketball courts. It utilizes a modern tech stack including React for the frontend, TanStack Router for file-based routing, Convex for the backend, and TailwindCSS for styling. The application is a Progressive Web App (PWA) and includes features for user authentication, feedback submission, and displaying court locations on a map.

## Tech Stack

- **Frontend:**
  - React
  - TanStack Router
  - TailwindCSS
  - shadcn/ui
  - Mapbox GL JS
- **Backend:**
  - Convex
- **Build Tools:**
  - Vite
  - Bun

## Building and Running

1.  **Install Dependencies:**

    ```bash
    bun install
    ```

2.  **Convex Setup:**
    This project uses Convex as a backend. You'll need to set up Convex before running the app:

    ```bash
    bun run dev:backend:setup
    ```

    Follow the prompts to create a new Convex project and connect it to your application.

3.  **Run the Development Server:**
    ```bash
    bun dev
    ```
    This will start both the frontend and backend services. The application will be available at `http://localhost:3001`.

### Other useful commands

- `bun build`: Build the application for production.
- `bun dev:frontend`: Start only the web application.
- `bun dev:backend`: Start only the Convex backend.
- `bun check-types`: Run the TypeScript compiler to check for type errors.

## Development Conventions

- **Routing:** File-based routing is handled by TanStack Router. Routes are defined in the `src/routes` directory.
- **Styling:** The project uses TailwindCSS for styling, with some custom components from `shadcn/ui`.
- **State Management:** Convex provides reactive data management for the application.
- **Backend Logic:** Convex functions for database operations, authentication, and other backend logic are located in the `convex/` directory.
- **Schema:** The database schema is defined in `convex/schema.ts`.

## Project Structure

- **`/`**: Root directory containing project-wide configuration files like `package.json`, `vite.config.ts`, and `tsconfig.json`.
- **`.github`**: CI/CD workflows, currently for code reviews.
- **`convex/`**: All backend logic. This is where Convex functions (queries, mutations, actions), schema definitions, and authentication configurations reside.
- **`docs/`**: Project documentation, including architectural plans, feature descriptions, and sample data from external services.
- **`poc/`**: A collection of "Proof of Concept" scripts used for testing and experimenting with various libraries and APIs (e.g., Mapbox, Roboflow).
- **`public/`**: Static assets that are served directly, such as the application logo and example images.
- **`src/`**: The heart of the React frontend application.
  - **`src/components/`**: Reusable React components used throughout the application, organized by feature (e.g., `map`, `scans`, `ui`).
  - **`src/lib/`**: Shared utilities, constants, type definitions, and helper functions.
  - **`src/routes/`**: The core of the application's navigation, using TanStack's file-based routing paradigm. Each file represents a page or a layout route.
  - **`src/styles/`**: Global and third-party CSS files.
