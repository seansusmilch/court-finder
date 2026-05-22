---
name: requirements-capture
description: Requirements documentation workflow for this project. Use when creating or updating a requirements document from current code behavior before refactoring, migration, or regression-sensitive changes.
---

# Requirements Capture

Use this skill to document what the current feature does before changing it.

## Process

1. Inspect the current UI, routes, backend functions, data flow, permissions, and tests for the feature.
2. Document observable behavior by feature area.
3. Capture edge cases, empty/loading/error states, auth and permission behavior, validation rules, persistence, and state transitions.
4. Keep the document implementation-neutral. Do not include filenames, component names, function names, or file structure unless the user explicitly asks for implementation notes.
5. Write requirements that a future refactor can use to preserve behavior.

## Output Style

- Organize by feature, not by file.
- Use direct, testable statements.
- Separate core behavior from edge cases where that improves scanability.
- Avoid code snippets and implementation details.
- Include unresolved questions only when behavior cannot be determined from the app and code.

## Verification

Cross-check the requirements against:

- Existing tests.
- Current route behavior and URL state.
- Convex auth/permission behavior.
- Loading, empty, and error states.
- Mobile and desktop layouts when UI behavior is involved.
