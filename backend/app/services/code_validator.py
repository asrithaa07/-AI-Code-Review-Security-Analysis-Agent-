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


import re

def validate_java(source_code: str) -> ValidationResult:
    errors: list[dict] = []
    
    # Auto-fix common minor syntax typos (e.g., missing '(' in if/else if)
    fixed_code = source_code
    if "system.out" in fixed_code:
        fixed_code = fixed_code.replace("system.out", "System.out")
    if "system.err" in fixed_code:
        fixed_code = fixed_code.replace("system.err", "System.err")
        
    fixed_code = re.sub(r"\b(else\s+if|if)\s+([^(\n]+?\)\s*\{)", r"\1 (\2", fixed_code)

    # Wrap code snippet in class if missing class declaration
    code_to_parse = fixed_code
    if "class " not in fixed_code:
        if any(kw in fixed_code for kw in ["public ", "private ", "protected ", "static ", "void ", "int ", "boolean ", "String "]):
            code_to_parse = f"public class SnippetWrapper {{\n{fixed_code}\n}}"
        else:
            code_to_parse = f"public class SnippetWrapper {{\n    public void snippetMethod() {{\n{fixed_code}\n    }}\n}}"

    try:
        javalang.parse.parse(code_to_parse)
    except javalang.parser.JavaSyntaxError as exc:
        # javalang error structure: exc.at is a token with position info
        line = None
        column = None
        if hasattr(exc, 'at') and exc.at:
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

    # Heuristic indicator lists
    java_indicators = [
        "public class ", "private ", "protected ", "public static void ",
        "System.out.print", "package ", "import java.", "import javax.", "import org.",
        "import com.", "import jakarta.", "String[] ", "void ", "int ", "double ",
        "boolean ", "@Override", "throws ", "implements ", "extends ", "PreparedStatement ",
        "ResultSet ", "Connection ", "DriverManager.", "MessageDigest"
    ]
    
    python_indicators = [
        "def ", "from ", "elif ", "self.", "__init__",
        "print(", "if __name__ ==", "def __", "pass", "None",
        "True", "False", "lambda ", "raise ", "except ", "finally:"
    ]

    java_score = sum(code.count(ind) * 2 for ind in java_indicators)
    python_score = sum(code.count(ind) * 2 for ind in python_indicators)

    lines = [line.strip() for line in code.split("\n") if line.strip()]
    semicolon_lines = sum(1 for line in lines if line.endswith(";"))
    curly_braces = code.count("{") + code.count("}")

    if lines and (semicolon_lines / len(lines) > 0.2):
        java_score += 10
    java_score += curly_braces

    colon_lines = sum(1 for line in lines if line.endswith(":"))
    comment_lines = sum(1 for line in lines if line.startswith("#"))
    if lines and (colon_lines / len(lines) > 0.2):
        python_score += 4
    python_score += comment_lines * 2

    # Check for generic Python 'import ' that does not look like Java import
    py_import_count = sum(1 for line in lines if line.startswith("import ") and not line.endswith(";") and not any(p in line for p in ["java.", "javax.", "org.", "com.", "jakarta."]))
    python_score += py_import_count * 2

    py_valid = validate_python(code).is_valid
    java_valid = validate_java(code).is_valid

    if java_score > python_score:
        return Language.java
    if python_score > java_score:
        return Language.python

    if py_valid and not java_valid:
        return Language.python
    if java_valid and not py_valid:
        return Language.java

    return Language.python


def validate_javascript(source_code: str) -> ValidationResult:
    """Basic JS/TS syntax balance validation."""
    errors = []
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    
    for idx, char in enumerate(source_code, start=1):
        if char in "({[":
            stack.append(char)
        elif char in ")}]" :
            if not stack or stack[-1] != pairs[char]:
                errors.append({
                    "line": 1,
                    "column": idx,
                    "message": f"Mismatched closing bracket '{char}'",
                    "severity": "critical",
                    "category": "syntax_error"
                })
                break
            stack.pop()

    if stack and not errors:
        errors.append({
            "line": 1,
            "column": len(source_code),
            "message": f"Unclosed bracket '{stack[-1]}'",
            "severity": "critical",
            "category": "syntax_error"
        })

    return ValidationResult(is_valid=len(errors) == 0, errors=errors)


def validate_code(source_code: str, language: str) -> ValidationResult:
    """Unified multi-language syntax validator."""
    lang_str = str(language).lower()
    if lang_str == "java":
        return validate_java(source_code)
    elif lang_str in ["javascript", "typescript", "js", "ts"]:
        return validate_javascript(source_code)
    elif lang_str == "python":
        return validate_python(source_code)
    return validate_python(source_code)

