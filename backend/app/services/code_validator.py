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
        # Try to parse the code
        ast.parse(source_code)
    except SyntaxError as exc:
        errors.append(
            {
                "line": exc.lineno,
                "column": exc.offset,
                "message": exc.msg or str(exc),
                "severity": "critical",
                "category": "syntax_error",
            }
        )
    except Exception as exc:
        errors.append({
            "line": None,
            "column": None,
            "message": f"Unexpected error: {str(exc)}",
            "severity": "critical",
            "category": "syntax_error",
        })
    
    return ValidationResult(is_valid=len(errors) == 0, errors=errors)


def validate_java(source_code: str) -> ValidationResult:
    errors: list[dict] = []
    try:
        javalang.parse.parse(source_code)
    except javalang.parser.JavaSyntaxError as exc:
        # javalang error structure: exc.at is a token with position info
        line = None
        column = None
        if hasattr(exc, 'at') and exc.at:
            # Try to get line/column from the token
            if hasattr(exc.at, 'line'):
                line = exc.at.line
            if hasattr(exc.at, 'column'):
                column = exc.at.column
        
        errors.append(
            {
                "line": line,
                "column": column,
                "message": str(exc.description) if hasattr(exc, "description") else str(exc),
                "severity": "critical",
                "category": "syntax_error",
            }
        )
    except Exception as exc:
        errors.append({
            "line": None,
            "column": None,
            "message": f"Unexpected error: {str(exc)}",
            "severity": "critical",
            "category": "syntax_error",
        })
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


def detect_language(source_code: str, filename: str | None = None) -> Language:
    """
    Automatically detect whether code is Python or Java based on filename extension,
    AST syntax parsing, and structural code heuristics.
    """
    if filename:
        ext_lang = detect_language_from_filename(filename)
        if ext_lang:
            return ext_lang

    code = source_code.strip()
    if not code:
        return Language.python

    py_valid = validate_python(code).is_valid
    java_valid = validate_java(code).is_valid

    if py_valid and not java_valid:
        return Language.python
    if java_valid and not py_valid:
        return Language.java

    # Heuristic scoring
    java_score = 0
    python_score = 0

    java_indicators = [
        "public class ", "private ", "protected ", "public static void ",
        "System.out.print", "package ", "import java.", "import javax.",
        "String[] ", "void ", "int ", "double ", "boolean ", "@Override",
        "throws ", "implements ", "extends "
    ]
    for ind in java_indicators:
        java_score += code.count(ind) * 2

    lines = [line.strip() for line in code.split("\n") if line.strip()]
    semicolon_lines = sum(1 for line in lines if line.endswith(";"))
    curly_braces = code.count("{") + code.count("}")
    if lines and (semicolon_lines / len(lines) > 0.3):
        java_score += 5
    java_score += curly_braces

    python_indicators = [
        "def ", "import ", "from ", "elif ", "self.", "__init__",
        "print(", "if __name__ ==", "def __", "pass", "None",
        "True", "False", "lambda ", "raise ", "except ", "finally:"
    ]
    for ind in python_indicators:
        python_score += code.count(ind) * 2

    colon_lines = sum(1 for line in lines if line.endswith(":"))
    comment_lines = sum(1 for line in lines if line.startswith("#"))
    if lines and (colon_lines / len(lines) > 0.2):
        python_score += 4
    python_score += comment_lines * 2

    if java_score > python_score:
        return Language.java
    return Language.python

