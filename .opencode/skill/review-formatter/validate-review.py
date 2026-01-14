#!/usr/bin/env python3
"""
Validates PR review JSON for GitHub API compatibility.
Checks JSON syntax, structure, field requirements, line numbers, and file paths.
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional


class ValidationError:
    """Represents a single validation error."""

    def __init__(self, path: str, error_type: str, message: str, recommendation: str):
        self.path = path
        self.type = error_type
        self.message = message
        self.recommendation = recommendation

    def to_dict(self) -> Dict[str, str]:
        return {
            "path": self.path,
            "type": self.type,
            "message": self.message,
            "recommendation": self.recommendation,
        }


class ReviewValidator:
    """Validates PR review JSON files."""

    def __init__(self, review_file: str = "/tmp/review.json", files_json: str = "/tmp/files.json"):
        self.review_file = Path(review_file)
        self.files_json = Path(files_json)
        self.errors: List[ValidationError] = []
        self.changed_files: List[str] = []
        self.repo_root = Path.cwd()

    def validate(self) -> Dict[str, Any]:
        """Run all validations and return results."""
        self._check_input_files()
        self._load_changed_files()
        self._validate_json()

        return {
            "valid": len(self.errors) == 0,
            "errors": [e.to_dict() for e in self.errors],
        }

    def _check_input_files(self) -> None:
        """Check if required input files exist."""
        if not self.review_file.exists():
            self.errors.append(
                ValidationError(
                    path="",
                    error_type="file_not_found",
                    message=f"Review file not found at {self.review_file}",
                    recommendation="Ensure the PR Reviewer Agent has created /tmp/review.json",
                )
            )
        
        if not self.files_json.exists():
            self.errors.append(
                ValidationError(
                    path="files.json",
                    error_type="file_not_found",
                    message=f"Files JSON not found at {self.files_json}",
                    recommendation="Ensure the GitHub workflow has created /tmp/files.json",
                )
            )

    def _load_changed_files(self) -> None:
        """Load the list of changed files from files.json."""
        if not self.files_json.exists():
            return

        try:
            with open(self.files_json) as f:
                files_data = json.load(f)
                self.changed_files = [item["filename"] for item in files_data]
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            self.errors.append(
                ValidationError(
                    path="files.json",
                    error_type="invalid_format",
                    message=f"Invalid files.json format: {e}",
                    recommendation="Ensure /tmp/files.json is valid JSON with 'filename' fields",
                )
            )

    def _validate_json(self) -> None:
        """Validate the review JSON structure and content."""
        if not self.review_file.exists():
            return

        try:
            with open(self.review_file) as f:
                review_data = json.load(f)
        except json.JSONDecodeError as e:
            self.errors.append(
                ValidationError(
                    path="",
                    error_type="syntax",
                    message=f"Invalid JSON syntax: {e}",
                    recommendation="Fix JSON syntax errors in /tmp/review.json",
                )
            )
            return

        self._validate_top_level_fields(review_data)
        self._validate_comments(review_data.get("comments", []))

    def _validate_top_level_fields(self, review_data: Dict[str, Any]) -> None:
        """Validate required top-level fields."""
        # Validate body field
        body = review_data.get("body")
        if body is None or body == "":
            self.errors.append(
                ValidationError(
                    path=".body",
                    error_type="missing_field",
                    message="Missing or empty 'body' field",
                    recommendation="Add a summary comment to the body field",
                )
            )
        elif not isinstance(body, str):
            self.errors.append(
                ValidationError(
                    path=".body",
                    error_type="invalid_type",
                    message=f"'body' field must be a string, got {type(body).__name__}",
                    recommendation="Convert body to string",
                )
            )

        # Validate comments field
        comments = review_data.get("comments")
        if comments is None:
            self.errors.append(
                ValidationError(
                    path=".comments",
                    error_type="missing_field",
                    message="Missing 'comments' field",
                    recommendation="Add a comments array (empty array if no line comments)",
                )
            )
        elif not isinstance(comments, list):
            self.errors.append(
                ValidationError(
                    path=".comments",
                    error_type="invalid_type",
                    message=f"'comments' field must be an array, got {type(comments).__name__}",
                    recommendation="Convert comments to array",
                )
            )

        # Validate event field
        event = review_data.get("event")
        if event is None or event == "":
            self.errors.append(
                ValidationError(
                    path=".event",
                    error_type="missing_field",
                    message="Missing or empty 'event' field",
                    recommendation='Set event to "COMMENT" or other valid GitHub review event',
                )
            )
        elif not isinstance(event, str):
            self.errors.append(
                ValidationError(
                    path=".event",
                    error_type="invalid_type",
                    message=f"'event' field must be a string, got {type(event).__name__}",
                    recommendation="Convert event to string",
                )
            )

    def _validate_comments(self, comments: List[Any]) -> None:
        """Validate each comment in the comments array."""
        for idx, comment in enumerate(comments):
            self._validate_single_comment(idx, comment)

    def _validate_single_comment(self, idx: int, comment: Any) -> None:
        """Validate a single comment."""
        prefix = f".comments[{idx}]"

        # Validate path field
        path = comment.get("path") if isinstance(comment, dict) else None
        if path is None or path == "":
            self.errors.append(
                ValidationError(
                    path=f"{prefix}.path",
                    error_type="missing_field",
                    message="Comment missing 'path' field",
                    recommendation="Add the file path to the comment",
                )
            )
        elif not isinstance(path, str):
            self.errors.append(
                ValidationError(
                    path=f"{prefix}.path",
                    error_type="invalid_type",
                    message=f"Comment 'path' must be a string, got {type(path).__name__}",
                    recommendation="Convert path to string",
                )
            )
        elif path not in self.changed_files:
            self.errors.append(
                ValidationError(
                    path=f"{prefix}.path",
                    error_type="invalid_file",
                    message=f"File '{path}' not found in PR changed files",
                    recommendation="Verify the file path is correct and exists in the PR",
                )
            )
        else:
            # File exists in PR, validate line number against actual file
            self._validate_line_number(prefix, path, comment.get("line") if isinstance(comment, dict) else None)

        # Validate line field (already partially validated above, but check type separately)
        line = comment.get("line") if isinstance(comment, dict) else None
        if line is None:
            self.errors.append(
                ValidationError(
                    path=f"{prefix}.line",
                    error_type="missing_field",
                    message="Comment missing 'line' field",
                    recommendation="Add the line number to the comment",
                )
            )
        elif not isinstance(line, (int, float)):
            self.errors.append(
                ValidationError(
                    path=f"{prefix}.line",
                    error_type="invalid_type",
                    message=f"Comment 'line' must be a number, got {type(line).__name__}",
                    recommendation="Convert line to number",
                )
            )
        elif line < 1:
            self.errors.append(
                ValidationError(
                    path=f"{prefix}.line",
                    error_type="invalid_value",
                    message=f"Line number must be positive, got {line}",
                    recommendation="Set line number to a positive integer",
                )
            )

        # Validate body field
        body = comment.get("body") if isinstance(comment, dict) else None
        if body is None or body == "":
            self.errors.append(
                ValidationError(
                    path=f"{prefix}.body",
                    error_type="missing_field",
                    message="Comment missing or empty 'body' field",
                    recommendation="Add the comment content",
                )
            )
        elif not isinstance(body, str):
            self.errors.append(
                ValidationError(
                    path=f"{prefix}.body",
                    error_type="invalid_type",
                    message=f"Comment 'body' must be a string, got {type(body).__name__}",
                    recommendation="Convert body to string",
                )
            )

    def _validate_line_number(self, prefix: str, file_path: str, line: Any) -> None:
        """Validate that the line number exists in the referenced file."""
        if line is None or not isinstance(line, (int, float)) or line < 1:
            return  # These errors are caught by _validate_single_comment

        full_path = self.repo_root / file_path
        if not full_path.exists():
            self.errors.append(
                ValidationError(
                    path=f"{prefix}.line",
                    error_type="file_not_found",
                    message=f"File '{file_path}' does not exist in the repository",
                    recommendation="Verify the file path is correct",
                )
            )
            return

        try:
            with open(full_path) as f:
                line_count = sum(1 for _ in f)

            if line > line_count:
                self.errors.append(
                    ValidationError(
                        path=f"{prefix}.line",
                        error_type="invalid_line",
                        message=f"Line {line} does not exist in file {file_path} (file has {line_count} lines)",
                        recommendation=f"Adjust line number to be within file bounds (1-{line_count})",
                    )
                )
        except (IOError, UnicodeDecodeError) as e:
            self.errors.append(
                ValidationError(
                    path=f"{prefix}.line",
                    error_type="file_read_error",
                    message=f"Could not read file '{file_path}': {e}",
                    recommendation="Ensure the file exists and is readable",
                )
            )


def main():
    """Main entry point."""
    validator = ReviewValidator()
    result = validator.validate()

    errors_file = Path("/tmp/validation-errors.json")
    with open(errors_file, "w") as f:
        json.dump(result, f, indent=2)

    if result["valid"]:
        print("Validation complete. Review JSON is valid.")
        sys.exit(0)
    else:
        print(json.dumps(result, indent=2))
        print(f"Validation complete. Found {len(result['errors'])} error(s).")
        sys.exit(1)


if __name__ == "__main__":
    main()
