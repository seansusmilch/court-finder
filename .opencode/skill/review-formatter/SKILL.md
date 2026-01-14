---
name: review-formatter
description: Creates and validates PR review JSON for GitHub API compatibility
---

## Purpose

This skill provides everything needed to create and validate a CodeRabbit-style PR review JSON file:
1. Complete JSON structure documentation
2. Format requirements for GitHub API
3. Python validation script with line number verification

Load this skill only after completing code analysis and when ready to create the review.

## Prerequisites (Before Loading This Skill)

Before loading this skill, the PR Reviewer Agent should have completed:
- ✅ Read PR context from `/tmp/` files
- ✅ Analyzed all code changes
- ✅ Identified and classified all issues (severity, type)
- ✅ Generated proposed fixes for each issue
- ✅ Checked for duplicate comments against existing PR comments
- ✅ Collected summary information (comment count, issue summaries, commit range, file list)

When ready to format and validate, load this skill.

## Workflow

1. **Create** `/tmp/review.json` following the structure below
2. **Validate**: `python3 .opencode/skill/review-formatter/validate-review.py`
3. **Check results**: `cat /tmp/validation-errors.json`
4. **Fix errors** if `valid: false`, then repeat from step 2
5. **Proceed** when `valid: true`

## Required JSON Structure

Construct the GitHub API JSON structure and write to `/tmp/review.json`:

```json
{
  "body": "[summary comment with emoji sections and file list]",
  "comments": [
    {
      "path": "path/to/file.ts",
      "line": 42,
      "body": "<details>\n<summary>⚠️ Potential issue | 🔴 Critical</summary>\n\nBug: [title]\n\n[description]\n\n🐛 Proposed fix\n<details>\n<summary>...</summary>\n```python\n...\n```\n</details>\n\n📝 Committable suggestion\n<details>\n<summary>...</summary>\n...\n</details>\n\n🤖 Prompt for AI Agents\n<details>\n<summary>...</summary>\n...\n</details>\n</details>"
    }
  ],
  "event": "COMMENT"
}
```

Format the summary body with:
```
Actionable comments posted: [count]

🤖 Fix all issues with AI agents
In @[file1]:
- Line 81: [brief instruction]
In @[file2]:
- Line 42: [brief instruction]

📜 Review details
Configuration used: [OPENCODE_MODEL from env var]

📥 Commits
Reviewing files that changed from the base of the PR and between [commit1] and [commit2].

📒 Files selected for processing ([count])
[file list]
```

For each comment body, use collapsible sections:
```
<details>
<summary>⚠️ Potential issue | 🔴 Critical</summary>

[Bug/Enhancement]: [title]

[description]

🐛 Proposed fix
<details>
<summary>...</summary>
```python
 before code
+after code
```
</details>

📝 Committable suggestion
<details>
<summary>‼️ IMPORTANT
Carefully review the code before committing. Ensure that it accurately replaces the highlighted code, contains no missing lines, and has no issues with indentation. Thoroughly test & benchmark the code to ensure it meets the requirements.</summary>
Suggested change
```python
[code block]
```
</details>

🤖 Prompt for AI Agents
<details>
<summary>...</summary>
[ai_prompt]
</details>
</details>
```

Use Write tool to create `/tmp/review.json` with the complete JSON structure.

## Populating the JSON

### Summary Body Fields
- **Actionable comments count**: Number of line comments being posted
- **AI fix summaries**: One-line instruction per issue for the "🤖 Fix all issues with AI agents" section
- **OPENCODE_MODEL**: Environment variable for review details
- **Commit range**: Base commit to head commit from PR info
- **File list**: All changed files from `/tmp/files.json`

### Line Comment Body Structure
Each comment in the `comments` array requires:
- **Severity emoji**: 🔴 Critical, 🟠 Major, 🟡 Minor
- **Issue type**: Bug or Enhancement
- **Title**: Brief descriptive title (e.g., "Missing return after sending unhealthy status")
- **Description**: Clear explanation of issue and impact
- **Proposed fix**: Before/after diff with `-`/`+` markers in code block
- **Committable suggestion**: Full code block with 3 lines before/after context, including warning
- **AI prompt**: Detailed instruction for AI to fix (e.g., "In @file/path:line, add null check before accessing property")

## Validation

After creating `/tmp/review.json`, validate it by running the Python script:

```bash
python3 .opencode/skill/review-formatter/validate-review.py
```

The script performs:
- JSON syntax validation
- Required field validation (body, comments, event)
- Field type validation
- Line number existence validation (reads actual files to verify line count)
- File path validation against `/tmp/files.json`

Read the validation results from `/tmp/validation-errors.json`:

```bash
cat /tmp/validation-errors.json
```

### Response Structure

```json
{
  "valid": true,
  "errors": []
}
```

Or if there are errors:

```json
{
  "valid": false,
  "errors": [
    {
      "path": "comments[0].line",
      "type": "invalid_line",
      "message": "Line 42 does not exist in file src/api.ts (file has 38 lines)",
      "recommendation": "Adjust line number to be within file bounds (1-38)"
    }
  ]
}
```

## Error Types

The validation script may return these error types:

- **syntax**: Invalid JSON syntax
- **missing_field**: Required field is missing
- **invalid_type**: Field has wrong type
- **invalid_value**: Field value is invalid (e.g., negative line number)
- **invalid_line**: Line number doesn't exist in file (checked against actual file line count)
- **invalid_file**: File path not found in PR changed files
- **file_not_found**: Required input file or referenced file missing
- **file_read_error**: Could not read referenced file
- **invalid_format**: Invalid format in files.json

## Validation Rules

The script checks:

1. **JSON Syntax**: File must be valid JSON
2. **Required Fields**:
   - `body`: string (required)
   - `comments`: array (required)
   - `event`: string (required)
3. **Comment Structure** (for each comment):
    - `path`: string (required)
    - `line`: number, >= 1 (required)
    - `body`: string (required)
4. **File Validation**:
    - Each comment's `path` must exist in `/tmp/files.json`
    - Each comment's `line` number must exist in the referenced file (script reads actual files to verify line count)

## Workflow

After loading this skill, follow these steps:

1. Create `/tmp/review.json` with the structure documented above
2. Run the validation script
3. If `valid: false`, read errors from `/tmp/validation-errors.json` and fix the JSON
4. Repeat steps 2-3 until `valid: true`
5. Proceed to submit the review

## Usage Notes

- The validation script reads actual files to verify line numbers exist
- Validation results include all errors with specific recommendations
- Loop validation until `valid: true` before submitting the review
- The skill provides all format requirements - do not create review JSON without loading this skill
