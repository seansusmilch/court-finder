# OpenCode Multi-Agent PR Review System

## Overview

The PR review system now uses a multi-agent architecture with GLM 4.6, delegating specialized tasks to dedicated agents for better separation of concerns and more focused code analysis.

## Model Update

- **Previous**: `zai-coding-plan/glm-4.5-flash`
- **Current**: `zai-coding-plan/glm-4.6`

## Agent Architecture

### 1. GitHub PR Orchestrator (`github-pr-orchestrator.md`)

**Type**: Primary Agent
**Purpose**: Coordinates the entire PR review process

**Responsibilities**:
- Delegates tasks to specialized subagents
- Coordinates context passing between agents
- Manages the review workflow from start to finish
- Handles errors and retries as needed

**Workflow**:
1. Invokes `github-fetcher` to gather PR context
2. Invokes `github-reviewer` to analyze code changes
3. Invokes `github-writer` to post the review

### 2. GitHub Fetcher (`github-fetcher.md`)

**Type**: Subagent
**Purpose**: Retrieves information from GitHub API

**Capabilities**:
- Fetch PR details (title, description, status)
- Fetch PR diffs (changed files, line-by-line changes)
- Fetch existing review comments (for deduplication)
- Fetch review discussions
- Fetch branch information and commit history

**Tools**: Limited to `gh api` and `gh pr` commands (read-only)

**Permissions**: Very restricted - only GitHub API access allowed

### 3. GitHub Reviewer (`github-reviewer.md`)

**Type**: Subagent
**Purpose**: Analyzes code and identifies issues

**Capabilities**:
- Deep code analysis using CodeRabbit methodology
- Context-aware analysis across entire codebase
- Section-specific suggestions (functions, components, modules)
- Confidence scoring (0-100%)
- Security vulnerability scanning (OWASP Top 10)
- Duplicate detection against existing comments

**Analysis Areas**:
- Component/Function Level: Single responsibility, complexity, validation
- Relationship Analysis: Imports, state placement, data flow, coupling
- React-Specific: Hook dependencies, re-renders, composition
- TypeScript: Type coverage, interfaces, generics, narrowing
- Convex Integration: Schema design, query/mutation patterns, auth checks
- Security: Injection, auth bypass, data exposure, secrets

**Tools**: Read-only - `read`, `grep`, `glob` (no edits or bash)

**Permissions**: Cannot make code changes - analysis only

### 4. GitHub Writer (`github-writer.md`)

**Type**: Subagent
**Purpose**: Posts reviews and comments to GitHub API

**Capabilities**:
- Create GitHub reviews with line comments
- Post review comments
- Format review content properly for GitHub API
- Handle review event types (COMMENT, REQUEST_CHANGES, APPROVE)

**Process**:
1. Creates review JSON file at `/tmp/review.json`
2. Submits review via `gh api` POST request
3. Validates structure before submission
4. Handles errors gracefully

**Tools**: Limited bash (GitHub API), read/write to `/tmp/` only

**Permissions**: Very restricted - only write to temp files and GitHub API access

## Benefits of Multi-Agent Architecture

1. **Separation of Concerns**: Each agent has a focused responsibility
2. **Specialized Expertise**: Each agent is optimized for its specific task
3. **Better Control**: Orchestrator can retry failed steps without starting over
4. **Clearer Debugging**: Issues can be traced to specific agents
5. **Modularity**: Individual agents can be improved independently
6. **Permissions Control**: Each agent has minimal necessary permissions
7. **Consistency**: Reviewer always follows same methodology
8. **No Side Effects**: Reviewer cannot accidentally modify code

## Configuration Files

All agent configurations are located in `.opencode/agent/`:
- `github-pr-orchestrator.md` - Main orchestrator
- `github-fetcher.md` - GitHub API fetcher
- `github-reviewer.md` - Code analyzer
- `github-writer.md` - GitHub API writer

## Workflow Trigger

The workflow is triggered by:
- PR opened, synchronized, reopened, or marked ready for review
- Issue comments with `/oc` or `/opencode`
- PR review comments with `/oc` or `/opencode`

The orchestrator agent is invoked automatically via the workflow configuration.

## Usage

When a PR is created or updated:
1. Orchestrator fetches PR details and existing comments (via fetcher)
2. Orchestrator delegates code analysis to reviewer
3. Reviewer analyzes changes and returns structured findings
4. Orchestrator formats review and submits via writer
5. Writer creates JSON and posts to GitHub API

All coordination happens automatically through the Task tool.
