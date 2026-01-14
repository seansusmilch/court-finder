# GitHub PR Review Data Schema

This document defines the standardized JSON format for passing review data between agents in the GitHub PR review system.

## File Location

All review data files should be stored in `/tmp/` directory:
- `/tmp/review_findings.json` - Primary review data from reviewer to writer
- `/tmp/pr_diff.txt` - Complete PR diff from fetcher
- `/tmp/existing_comments.json` - Existing PR comments from fetcher
- `/tmp/files.json` - List of changed files from fetcher

## Review Findings Schema

`/tmp/review_findings.json` - Complete review data from github-reviewer to github-writer

```json
{
  "version": "1.0",
  "pr_info": {
    "number": 123,
    "repo": "owner/repo",
    "title": "PR title",
    "description": "PR description",
    "head_sha": "abc123def456"
  },
  "review_summary": {
    "overview": "Brief overview of changes and architectural fit",
    "confidence_breakdown": {
      "high": 5,
      "medium": 3,
      "low": 2,
      "suggestions": 4
    },
    "key_findings": [
      "Critical issue 1 description",
      "Critical issue 2 description"
    ],
    "security_assessment": "No critical security issues found",
    "positive_highlights": "Well-implemented pattern X, good use of Y"
  },
  "line_comments": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "confidence": 95,
      "confidence_level": "high",
      "severity": "critical",
      "title": "Potential null pointer exception",
      "description": "Detailed explanation of the issue with specific code references",
      "code_context": "if (data.user.name) {\n  // ...\n}",
      "suggestion": "Add null check: if (data?.user?.name)"
    }
  ],
  "review_event": "COMMENT",
  "metadata": {
    "reviewed_at": "2025-01-13T10:30:00Z",
    "reviewer_agent": "github-reviewer",
    "files_analyzed": 5,
    "total_issues": 14
  }
}
```

## Field Definitions

### pr_info
- `number` (number): PR number
- `repo` (string): Repository identifier "owner/repo"
- `title` (string): PR title
- `description` (string): PR description
- `head_sha` (string): HEAD commit SHA

### review_summary
- `overview` (string): High-level summary of changes
- `confidence_breakdown` (object): Issue counts by confidence level
- `key_findings` (array of string): Top priority issues
- `security_assessment` (string): Security evaluation
- `positive_highlights` (string): Well-implemented patterns

### line_comments
Each comment object contains:
- `file` (string): File path from PR root
- `line` (number): Exact line number from PR diff
- `confidence` (number): 0-100 confidence score
- `confidence_level` (string): "high" | "medium" | "low" | "suggestion"
- `severity` (string): "critical" | "security" | "performance" | "logic" | "improvement" | "clarity"
- `title` (string): Brief issue title (1-10 words)
- `description` (string): Detailed explanation with code references
- `code_context` (string, optional): Relevant code snippet
- `suggestion` (string, optional): Specific fix suggestion

### review_event
- `"COMMENT"`: General feedback, non-blocking
- `"REQUEST_CHANGES"`: Blocking review for critical issues
- `"APPROVE"`: No issues found

### metadata
- `reviewed_at` (string): ISO 8601 timestamp
- `reviewer_agent` (string): Agent identifier
- `files_analyzed` (number): Number of files reviewed
- `total_issues` (number): Total issues found

## Confidence Level Mapping

| Range | Level | Emoji | Example Issues |
|-------|-------|-------|----------------|
| 85-100 | high | 🟢 | Clear bug, security issue, best practice violation |
| 60-84 | medium | 🟡 | Likely issue, potential performance problem |
| 40-59 | low | 🔵 | Subjective concern, depends on context |
| 0-39 | suggestion | ⚪ | Nice-to-have improvement, style preference |

## Severity Categories

| Severity | Emoji | Priority | Examples |
|----------|-------|----------|----------|
| critical | 🚨 | Highest | Crashes, data corruption, null dereferences |
| security | 🔒 | High | Injection, auth bypass, data exposure |
| performance | ⚡ | Medium | N+1 queries, memory leaks, unnecessary re-renders |
| logic | ⚠️ | Medium | Incorrect behavior, edge cases, state bugs |
| improvement | ✨ | Low | Best practices, maintainability, code organization |
| clarity | 📝 | Low | Naming, comments, complexity reduction |

## Data Flow

1. **github-fetcher** writes:
   - `/tmp/pr_diff.txt` - Full diff
   - `/tmp/existing_comments.json` - Existing PR comments
   - `/tmp/files.json` - Changed files list

2. **github-orchestrator** passes file paths to reviewer

3. **github-reviewer** reads files and writes:
   - `/tmp/review_findings.json` - Complete review analysis

4. **github-orchestrator** passes review file path to writer

5. **github-writer** reads `/tmp/review_findings.json` and:
   - Creates `/tmp/review.json` - GitHub API format
   - Submits to GitHub API

## Validation Rules

- All line numbers must be within the PR diff's changed lines
- All file paths must match files in the PR
- Confidence must be 0-100
- At least one of `review_event` values must be used
- All required fields must be present
- JSON must be valid per schema above
