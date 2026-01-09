---
name: package-upgrade
description: Skill for upgrading npm packages safely. Use when upgrading one or more dependencies—handles changelog research, breaking change detection, codebase migration, and verification. Ensures type safety, tests pass, and builds succeed after upgrades.
---

# Package Upgrade

This skill provides a systematic process for upgrading npm packages using Bun. It handles both single package upgrades and batch upgrades, with careful attention to breaking changes and full verification.

## Philosophy

**Be thorough, be automatic, be safe.**

- Assume major version bumps have breaking changes until proven otherwise
- Research before upgrading—don't blindly update and hope for the best
- Address all breaking changes in the codebase BEFORE running the upgrade command
- Verify everything works after the upgrade
- Provide a clear summary of what was done

## Process Overview

```
1. IDENTIFY    → Determine what to upgrade and to which version
2. RESEARCH    → Find changelog, identify breaking changes
3. MIGRATE     → Update codebase to handle breaking changes
4. UPGRADE     → Run the actual package upgrade
5. VERIFY      → Type check, test, build
6. SUMMARIZE   → Report what was done
```

---

## Step 1: Identify the Upgrade

### Single Package Upgrade

When upgrading a specific package:

```bash
# Check current version
bun pm ls | grep <package-name>

# Check latest available version
bun info <package-name> version

# Or check all available versions
bun info <package-name> versions
```

### Batch Upgrade (All Outdated)

To find all outdated packages:

```bash
# List outdated packages
bun outdated
```

This shows:
- Current version installed
- Wanted version (satisfies semver range in package.json)
- Latest version available

**Prioritize upgrades by risk:**
1. Patch versions (x.x.PATCH) — lowest risk, usually safe
2. Minor versions (x.MINOR.x) — low risk, new features, should be backward compatible
3. Major versions (MAJOR.x.x) — HIGH RISK, assume breaking changes

For batch upgrades, process packages in this order. Consider grouping related packages (e.g., `@tanstack/react-router` and `@tanstack/router-devtools`).

---

## Step 2: Research Changelog & Breaking Changes

**This is the most critical step.** Never skip it for major version upgrades.

### Where to Find Changelogs

Search in this order:

#### 1. GitHub Releases

```
https://github.com/<org>/<repo>/releases
```

Look for:
- Release notes for the target version
- Migration guides linked in release notes
- "BREAKING" labels on releases

#### 2. GitHub CHANGELOG.md

```
https://github.com/<org>/<repo>/blob/main/CHANGELOG.md
https://github.com/<org>/<repo>/blob/master/CHANGELOG.md
```

#### 3. Package Documentation Site

Many packages have dedicated docs:
- React: https://react.dev/blog
- TanStack Router: https://tanstack.com/router/latest/docs/framework/react/guide/migrating
- Tailwind: https://tailwindcss.com/docs/upgrade-guide

#### 4. npm Registry

```
https://www.npmjs.com/package/<package-name>?activeTab=versions
```

Click on specific versions to see publish notes (if available).

### Identifying Breaking Changes

**Automatic triggers (assume breaking):**
- Major version bump (e.g., 1.x.x → 2.x.x)
- Package explicitly marked as "breaking" in release

**Explicit keywords to search for in changelogs:**
- `BREAKING`
- `BREAKING CHANGE`
- `BREAKING CHANGES`
- `Migration`
- `Migrate`
- `Upgrade guide`
- `Deprecated` (especially "removed" deprecations)
- `Removed`
- `Changed` (in "Changed" section of Keep a Changelog format)

**Document all breaking changes found:**

```markdown
## Breaking Changes Found for <package>@<version>

1. **API Change**: `oldFunction()` renamed to `newFunction()`
   - Affected files: src/utils/helper.ts, src/hooks/useData.ts
   
2. **Import Path Change**: `import { X } from 'pkg'` → `import { X } from 'pkg/client'`
   - Affected files: src/components/*.tsx
   
3. **Behavior Change**: Default timeout changed from 5000ms to 3000ms
   - May affect: API calls in src/api/
```

---

## Step 3: Migrate Codebase

**Do this BEFORE upgrading the package.**

Address each breaking change identified in Step 2:

### Pattern: API Renames

```bash
# Find all usages
grep -r "oldFunction" --include="*.ts" --include="*.tsx" src/

# Replace (use search_replace tool for safety)
# Old: oldFunction(arg)
# New: newFunction(arg)
```

### Pattern: Import Path Changes

```bash
# Find affected imports
grep -r "from 'pkg'" --include="*.ts" --include="*.tsx" src/
grep -r "from \"pkg\"" --include="*.ts" --include="*.tsx" src/

# Update each import
```

### Pattern: Removed Features

If a feature is removed with no replacement:
1. Check if feature is actually used in codebase
2. If used, implement alternative before upgrading
3. If not used, no action needed

### Pattern: Changed Defaults

If defaults changed:
1. Decide if old behavior is needed
2. If yes, explicitly set the old value in config
3. If no, no action needed (but document the behavior change)

### Pattern: Type Changes

If TypeScript types changed:
1. Find usages with `grep` or TypeScript errors
2. Update type annotations
3. May need to update interfaces that extend package types

---

## Step 4: Upgrade Package

After all breaking changes are addressed:

### Single Package

```bash
# Upgrade to latest
bun add <package-name>@latest

# Or upgrade to specific version
bun add <package-name>@<version>
```

### Multiple Related Packages

Upgrade together to ensure compatibility:

```bash
bun add @tanstack/react-router@latest @tanstack/router-devtools@latest
```

### All Packages (Batch)

```bash
# Upgrade all to latest within semver range
bun update

# Or upgrade all to absolute latest (including major bumps)
bun update --latest
```

**⚠️ Warning:** `bun update --latest` should only be run after researching ALL major version bumps.

---

## Step 5: Verify

Run all verification steps. **All must pass.**

### 5.1 Type Check

```bash
bun check-types
```

Fix any type errors introduced by the upgrade. Common issues:
- Changed type signatures
- Removed types
- Stricter type checking in new version

### 5.2 Run Tests

```bash
bun test
```

If tests fail:
1. Check if test is using deprecated/removed API
2. Check if behavior intentionally changed (update test)
3. Check if it's a real regression (may need to reconsider upgrade)

### 5.3 Build Verification

```bash
bun run build
```

Ensures:
- No build-time errors
- Bundler can resolve all imports
- No missing dependencies

### 5.4 Manual Smoke Test (if applicable)

For UI packages, run the dev server and manually verify critical flows:

```bash
bun dev
```

---

## Step 6: Summarize

After successful upgrade, provide a summary:

```markdown
## Package Upgrade Summary

### Upgraded
- `<package>`: v1.2.3 → v2.0.0

### Breaking Changes Addressed
1. Renamed `oldApi()` to `newApi()` in 3 files
2. Updated import paths in 5 files
3. Added explicit timeout config to preserve old behavior

### Files Modified
- src/utils/helper.ts
- src/hooks/useData.ts
- src/components/DataView.tsx
- src/config.ts

### Verification
- ✅ Type check passed
- ✅ Tests passed (24/24)
- ✅ Build succeeded

### Notes
- New feature available: `useNewHook()` for better performance
- Deprecated warning: `legacyMethod()` will be removed in v3
```

---

## Example: Full Upgrade Flow

### Scenario: Upgrade `@tanstack/react-router` from 1.x to 2.x

```bash
# Step 1: Identify
bun pm ls | grep tanstack
# Output: @tanstack/react-router@1.45.0

bun info @tanstack/react-router version
# Output: 2.1.0
```

**Step 2: Research**

Visit: https://tanstack.com/router/latest/docs/framework/react/guide/migrating

Found breaking changes:
1. `createFileRoute` signature changed
2. `useSearch` returns `undefined` instead of `{}` when no params
3. New required peer dependency: `@tanstack/react-router-devtools`

**Step 3: Migrate**

```bash
# Find all createFileRoute usages
grep -r "createFileRoute" --include="*.tsx" src/routes/

# Update each file...
```

**Step 4: Upgrade**

```bash
bun add @tanstack/react-router@latest @tanstack/router-devtools@latest
```

**Step 5: Verify**

```bash
bun check-types  # ✅ Pass
bun test         # ✅ 24/24 passed
bun run build    # ✅ Success
```

**Step 6: Summary**

(Provide summary as shown in Step 6 format)

---

## Quick Reference

| Task | Command |
|------|---------|
| Check installed version | `bun pm ls \| grep <pkg>` |
| Check latest version | `bun info <pkg> version` |
| List outdated | `bun outdated` |
| Upgrade single | `bun add <pkg>@latest` |
| Upgrade specific version | `bun add <pkg>@<version>` |
| Upgrade all (semver) | `bun update` |
| Upgrade all (latest) | `bun update --latest` |
| Type check | `bun check-types` |
| Run tests | `bun test` |
| Build | `bun run build` |

## Key Files

- `package.json` — Dependencies and versions
- `bun.lockb` — Lock file (binary, managed by Bun)
- `tsconfig.json` — May need updates for TypeScript version changes
