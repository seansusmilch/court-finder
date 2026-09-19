---
name: package-upgrade
description: Safe dependency upgrade workflow for this Bun, Vite, React, Convex project. Use when upgrading one or more packages, researching breaking changes, migrating package APIs, or verifying dependency changes.
---

# Package Upgrade

Use this skill for dependency upgrades.

## Workflow

1. Identify current, wanted, and latest versions.
2. Research changelogs, release notes, migration guides, and peer dependency changes before major upgrades.
3. Search the codebase for affected APIs and migrate code before or alongside the package change.
4. Upgrade with Bun.
5. Verify type checks, tests, and build.
6. Summarize changed packages, migrations applied, files touched, and verification results.

## Commands

```bash
bun pm ls
bun outdated
bun info <package> version
bun info <package> versions
bun add <package>@latest
bun add <package>@<version>
bun update
bun update --latest
```

Use `bun update --latest` only after reviewing all major version jumps.

## Research Checklist

- Treat every major bump as breaking until proven otherwise.
- Search for `BREAKING`, `Migration`, `Upgrade guide`, `Deprecated`, `Removed`, and changed peer dependencies.
- Prefer official docs, package repositories, release notes, and package registry metadata.
- Group related packages when they need compatible versions, such as TanStack Router packages or Vite/plugin packages.

## Project Notes

- `package.json` declares `packageManager: bun@1.2.19`.
- The lockfile is `bun.lock`.
- This project uses Vite intentionally; keep package scripts aligned with `bun run ...`.
- Tests are run through the package script with `bun run test`, which invokes Vitest.
- Convex commands should use `bunx convex ...` or existing Bun scripts.

## Verification

```bash
bun check-types
bun run test
bun run build
```

For UI-affecting upgrades, run the app and smoke-test changed flows:

```bash
bun dev
```
