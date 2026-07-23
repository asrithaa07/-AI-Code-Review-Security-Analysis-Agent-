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
        tree = ast.parse(source_code)
        
        # Additional checks for common Python security issues
        for node in ast.walk(tree):
            # Check for dangerous imports
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name in ['pickle', 'subprocess', 'os', 'eval', 'exec']:
                        errors.append({
                            "line": node.lineno,
                            "column": node.col_offset,
                            "message": f"Potentially dangerous import: {alias.name}. Review security implications."
                        })
            
            # Check for eval/exec usage
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    if node.func.id in ['eval', 'exec']:
                        errors.append({
                            "line": node.lineno,
                            "column": node.col_offset,
                            "message": f"Use of {node.func.id}() is dangerous and should be avoided."
                        })
                    
    except SyntaxError as exc:
        errors.append(
            {
                "line": exc.lineno,
                "column": exc.offset,
                "message": exc.msg or str(exc),
            }
        )
    except Exception as exc:
        errors.append({"line": None, "column": None, "message": f"Unexpected error: {str(exc)}"})
    
    return ValidationResult(is_valid=len(errors) == 0, errors=errors)


def validate_java(source_code: str) -> ValidationResult:
    errors: list[dict] = []
    try:
        tree = javalang.parse.parse(source_code)
        
        # Additional checks for common Java security issues
        # Check for dangerous imports
        for path, node in tree.filter(javalang.tree.Import):
            if node.path in ['java.lang.Runtime', 'java.lang.ProcessBuilder', 'java.io.ObjectInputStream']:
                pos = getattr(node, 'position', None)
                line = pos.line if pos else None
                errors.append({
                    "line": line,
                    "column": None,
                    "message": f"Potentially dangerous import: {node.path}. Review security implications."
                })
            
        # Check for SQL injection patterns (basic detection)
        for path, node in tree.filter(javalang.tree.MethodInvocation):
            if hasattr(node, 'member') and node.member in ['execute', 'executeQuery', 'executeUpdate']:
                pos = getattr(node, 'position', None)
                line = pos.line if pos else None
                errors.append({
                    "line": line,
                    "column": None,
                    "message": f"Database method {node.member} detected. Ensure proper parameterization to prevent SQL injection."
                })
                    
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
            }
        )
    except Exception as exc:
        errors.append({"line": None, "column": None, "message": f"Unexpected error: {str(exc)}"})
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
