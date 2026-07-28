import os
from typing import List, Optional
import google.generativeai as genai
from pydantic import BaseModel, Field

from app.config import settings

class CodeAnalysisFinding(BaseModel):
    title: str = Field(description="Short title summarizing the code quality issue")
    description: str = Field(description="Detailed explanation of the issue and why it is a problem")
    line_number: Optional[int] = Field(description="The 1-based line number where the issue starts, or null if it is global")
    severity: str = Field(description="Severity: info, low, medium, high, or critical")
    category: str = Field(description="Category: complexity, code_smell, anti_pattern, or poor_practice")

class CodeAnalysisResult(BaseModel):
    findings: List[CodeAnalysisFinding]

SYSTEM_PROMPT = """
You are an expert Code Quality and Design Analysis Agent. Your task is to analyze the provided source code for:
1. Code Smells: Long methods, duplicate code, large classes, primitive obsession, or duplicate patterns.
2. Complexity issues: High cyclomatic complexity, deeply nested conditions, or overly convoluted logic.
3. Design Anti-patterns: Tight coupling, global state abuse, violation of SOLID principles, or poor encapsulation.
4. Poor Coding Practices: Empty exception handlers, missing docstrings, violating standard naming conventions, or resource leaks.

CONTEXT-AWARE DOCUMENTATION RULES:
Do NOT recommend documentation (missing docstrings or comments) for short code snippets, competitive programming template scripts, algorithmic solutions (e.g. single-function interview problems like Two Sum, Solution classes, etc.), or files under 50 lines. Only recommend documentation when analyzing production code, multi-function utility modules, APIs, backend services, or classes with multiple public methods where documentation adds real value.

For each issue found, classify it with:
- Title: A concise name of the issue.
- Description: Explanation of what the issue is, why it is bad, and how it can be refactored.
- Line number: The exact 1-based line number where the issue starts, or null if it applies globally to the entire class/file.
- Severity: low, medium, high, or critical.
- Category: complexity, code_smell, anti_pattern, or poor_practice.

Be highly precise and constructive. Do not hallucinate or create false issues. Only flag genuine issues in the submitted code.
"""

def get_mock_code_analysis(source_code: str, language: str) -> List[dict]:
    if "process_user_data" in source_code:
        return [
            {
                "title": "High Cyclomatic Complexity and Deep Nesting",
                "description": "The method 'process_user_data' has deep nesting of conditional structures (if user_id -> if raw_data -> if len(raw_data) -> if user). This increases cognitive load and makes the code difficult to unit test. Refactor using early exit guard clauses.",
                "line_number": 31,
                "severity": "medium",
                "category": "complexity"
            },
            {
                "title": "Duplicate Code Pattern (Violation of DRY)",
                "description": "The email validation and string preparation logic is duplicated for raw_data['email'] and raw_data['backup_email']. Extract it into a single helper method.",
                "line_number": 37,
                "severity": "low",
                "category": "code_smell"
            }
        ]
    elif "authorizeTransaction" in source_code:
        return [
            {
                "title": "Deeply Nested Conditional Blocks (Arrow Anti-Pattern)",
                "description": "The method 'authorizeTransaction' features heavily nested conditions (up to 6 levels). This hurts code readability and unit testability. Consider collapsing checks or using polymorphism.",
                "line_number": 34,
                "severity": "medium",
                "category": "complexity"
            }
        ]
    else:
        # Context-aware check for short snippets or competitive programming templates
        lines = [l.strip() for l in source_code.split("\n") if l.strip()]
        total_lines = len(lines)
        
        # Check if the code resembles a competitive programming solution or small snippet
        is_small_snippet = total_lines < 50
        
        # Simple count of functions and classes
        num_methods = 0
        num_classes = 0
        for line in lines:
            if line.startswith("def ") or line.startswith("class ") or line.startswith("public ") or "void " in line or "class Solution" in line:
                if "class " in line:
                    num_classes += 1
                else:
                    num_methods += 1
        
        # If it is a short snippet, single class, or has <= 1 methods, do NOT recommend documentation
        if is_small_snippet or (num_classes <= 1 and num_methods <= 1):
            return []
            
        # For larger or production-like code, recommend component documentation
        return [
            {
                "title": "Missing Component Documentation",
                "description": "The source file lacks file-level or method-level documentation. Add appropriate docstrings/comments describing inputs, outputs, and behaviors to improve code readability and maintainability.",
                "line_number": 1,
                "severity": "info",
                "category": "poor_practice"
            }
        ]

def analyze_code_quality(source_code: str, language: str) -> List[dict]:
    api_key = settings.gemini_api_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        # Fallback to mock findings instead of raising an error to allow local demonstration without API key
        print("WARNING: GEMINI_API_KEY not set. Falling back to Code Analysis mock findings.")
        return get_mock_code_analysis(source_code, language)

    genai.configure(api_key=api_key)
    
    model = genai.GenerativeModel(
        model_name=settings.llm_model,
        system_instruction=SYSTEM_PROMPT
    )
    
    prompt = f"Analyze the following {language} code:\n\n{source_code}"
    
    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            response_schema=CodeAnalysisResult
        )
    )
    
    # Parse output
    try:
        result = CodeAnalysisResult.model_validate_json(response.text)
        return [finding.model_dump() for finding in result.findings]
    except Exception as e:
        # Fallback in case of parse error
        import json
        try:
            data = json.loads(response.text)
            if "findings" in data:
                return data["findings"]
            return data
        except Exception:
            raise ValueError(f"Failed to parse Code Analysis Agent response: {response.text}") from e
