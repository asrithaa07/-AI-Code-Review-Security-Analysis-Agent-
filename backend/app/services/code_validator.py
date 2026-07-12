import ast
from dataclasses import dataclass

import javalang

from app.models.submission import Language


@dataclass
class ValidationResult:
    is_valid: bool
    errors: list[dict]


def validate_python(source_code: str) -> ValidationResult:
    errors: list[dict] = []
    try:
        ast.parse(source_code)
    except SyntaxError as exc:
        errors.append(
            {
                "line": exc.lineno,
                "column": exc.offset,
                "message": exc.msg or str(exc),
            }
        )
    return ValidationResult(is_valid=len(errors) == 0, errors=errors)


def validate_java(source_code: str) -> ValidationResult:
    errors: list[dict] = []
    try:
        javalang.parse.parse(source_code)
    except javalang.parser.JavaSyntaxError as exc:
        errors.append(
            {
                "line": getattr(exc, "at", None).line if getattr(exc, "at", None) else None,
                "column": getattr(exc, "at", None).column if getattr(exc, "at", None) else None,
                "message": str(exc.description) if hasattr(exc, "description") else str(exc),
            }
        )
    except Exception as exc:
        errors.append({"line": None, "column": None, "message": str(exc)})
    return ValidationResult(is_valid=len(errors) == 0, errors=errors)


def validate_source_code(source_code: str, language: Language) -> ValidationResult:
    if language == Language.python:
        return validate_python(source_code)
    if language == Language.java:
        return validate_java(source_code)
    return ValidationResult(is_valid=False, errors=[{"message": f"Unsupported language: {language}"}])


def detect_language_from_filename(filename: str) -> Language | None:
    lowered = filename.lower()
    if lowered.endswith(".py"):
        return Language.python
    if lowered.endswith(".java"):
        return Language.java
    return None
