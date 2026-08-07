import os
import json
from typing import List, Dict, Optional
import google.generativeai as genai
from pydantic import BaseModel, Field

from app.config import settings


class FindingRemediationItem(BaseModel):
    finding_id: str = Field(description="The unique ID of the finding being remediated")
    remediation_summary: str = Field(description="Clear summary of how to fix this finding")
    corrected_code: str = Field(description="Executable corrected code snippet demonstrating the fix")
    best_practice_explanation: str = Field(description="Explanation grounded in secure coding standards and best practices")


class RemediationResult(BaseModel):
    remediations: List[FindingRemediationItem]


SYSTEM_PROMPT = """
You are an expert Remediation Agent and Secure Refactoring Specialist.
Your task is to analyze flagged code findings along with the submitted source code, and generate precise, production-ready fix recommendations for each finding.

For each finding, provide:
1. remediation_summary: A concise, action-oriented explanation of the required fix.
2. corrected_code: The exact, refactored code snippet showing how to implement the fix safely (e.g. using parameterized queries, avoiding hardcoded secrets, using early returns).
3. best_practice_explanation: Grounded explanation detailing why this fix follows secure coding standards (OWASP, CWE, clean code principles).

Return your response strictly adhering to the JSON schema.
"""


def get_mock_remediations(source_code: str, language: str, findings: List[Dict]) -> List[Dict]:
    remediated_findings = []
    
    for f in findings:
        finding = dict(f)
        f_id = finding.get("id", "")
        title = finding.get("title", "").lower()
        category = finding.get("category", "").lower()
        cwe = finding.get("cwe_id", "")
        
        remediation_summary = ""
        corrected_code = ""
        best_practice_explanation = ""

        if "sql" in title or "sql_injection" in category or cwe == "CWE-89":
            remediation_summary = "Replace string concatenation/formatting in SQL queries with parameterized queries or prepared statements."
            if language == "python":
                corrected_code = (
                    "# Corrected: Use parameterized queries to prevent SQL Injection\n"
                    "def get_user(user_id):\n"
                    "    query = \"SELECT * FROM users WHERE id = %s\"\n"
                    "    cursor.execute(query, (user_id,))\n"
                    "    return cursor.fetchone()"
                )
            else:
                corrected_code = (
                    "// Corrected: Use PreparedStatement for parameterized database query\n"
                    "public User login(String username, String password) {\n"
                    "    String sql = \"SELECT * FROM users WHERE username = ?\";\n"
                    "    PreparedStatement pstmt = db.prepareStatement(sql);\n"
                    "    pstmt.setString(1, username);\n"
                    "    return pstmt.executeQuery();\n"
                    "}"
                )
            best_practice_explanation = "Grounded in OWASP A03:2021-Injection guidelines: Parameterized queries separate code from untrusted data, ensuring user input cannot manipulate SQL query structure."

        elif "secret" in title or "hardcoded" in title or "secrets" in category or cwe == "CWE-798":
            remediation_summary = "Move sensitive API keys and credentials out of source code and read them dynamically from environment variables."
            if language == "python":
                corrected_code = (
                    "# Corrected: Retrieve API secret from environment variables\n"
                    "import os\n\n"
                    "API_SECRET_KEY = os.environ.get(\"API_SECRET_KEY\")\n"
                    "if not API_SECRET_KEY:\n"
                    "    raise RuntimeError(\"API_SECRET_KEY environment variable is missing\")"
                )
            else:
                corrected_code = (
                    "// Corrected: Fetch API secret key from environment\n"
                    "public class AuthService {\n"
                    "    private static final String API_KEY = System.getenv(\"API_SECRET_KEY\");\n"
                    "}"
                )
            best_practice_explanation = "Grounded in OWASP A07:2021-Identification and Authentication Failures & CWE-798: Storing credentials outside source code prevents credential exposure via revision control systems."

        elif "hash" in title or "md5" in title or cwe == "CWE-328":
            remediation_summary = "Replace cryptographically broken hash functions (like MD5 or SHA1) with adaptive password hashing functions like bcrypt, Argon2, or PBKDF2."
            if language == "python":
                corrected_code = (
                    "# Corrected: Use bcrypt for password hashing\n"
                    "import bcrypt\n\n"
                    "def hash_password(password: str) -> str:\n"
                    "    salt = bcrypt.gensalt()\n"
                    "    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')"
                )
            else:
                corrected_code = (
                    "// Corrected: Use BCryptPasswordEncoder for secure password hashing\n"
                    "import org.mindrot.jbcrypt.BCrypt;\n\n"
                    "public String hashPassword(String password) {\n"
                    "    return BCrypt.hashpw(password, BCrypt.gensalt(12));\n"
                    "}"
                )
            best_practice_explanation = "Grounded in OWASP A02:2021-Cryptographic Failures: MD5 is vulnerable to collision attacks and fast GPU cracking. Adaptive hashing algorithms add work factors to resist brute force attacks."

        elif "command" in title or "os" in title or cwe == "CWE-78":
            remediation_summary = "Avoid executing shell commands via user string concatenation. Use native language APIs or argument list execution."
            if language == "python":
                corrected_code = (
                    "# Corrected: Pass arguments as list to subprocess without shell=True\n"
                    "import subprocess\n\n"
                    "def ping_host(host: str):\n"
                    "    subprocess.run([\"ping\", \"-c\", \"1\", host], check=True)"
                )
            else:
                corrected_code = (
                    "// Corrected: Pass arguments as array to ProcessBuilder\n"
                    "public void executePing(String host) throws IOException {\n"
                    "    ProcessBuilder pb = new ProcessBuilder(\"ping\", \"-c\", \"1\", host);\n"
                    "    pb.start();\n"
                    "}"
                )
            best_practice_explanation = "Grounded in OWASP A03:2021-Injection & CWE-78: Passing commands as argument vectors eliminates shell parser invocation and prevents command injection payloads."

        elif "complexity" in category or "nesting" in title:
            remediation_summary = "Refactor deeply nested conditional blocks using guard clauses and early returns to reduce cyclomatic complexity."
            if language == "python":
                corrected_code = (
                    "# Corrected: Use early return guard clauses\n"
                    "def process_user_data(user_id, raw_data):\n"
                    "    if not user_id or not raw_data:\n"
                    "        return None\n"
                    "    email = raw_data.get('email')\n"
                    "    if not email:\n"
                    "        return None\n"
                    "    return validate_and_save(user_id, email)"
                )
            else:
                corrected_code = (
                    "// Corrected: Flatten nested conditionals with guard clauses\n"
                    "public boolean authorizeTransaction(Transaction tx) {\n"
                    "    if (tx == null || !tx.isValid()) return false;\n"
                    "    if (tx.getAmount() <= 0) return false;\n"
                    "    return processPayment(tx);\n"
                    "}"
                )
            best_practice_explanation = "Guard clauses reduce nesting levels, decrease cognitive load, and ensure linear control flow for easier testing."

        else:
            remediation_summary = f"Refactor code to resolve {finding.get('title', 'quality issue')} according to language conventions."
            corrected_code = f"# Refactored implementation addressing {finding.get('title')}\n# Ensure strict parameter validation and error handling"
            best_practice_explanation = "Follow standard software architecture guidelines, modular design principles, and exception handling best practices."

        finding["remediation_summary"] = remediation_summary
        finding["corrected_code"] = corrected_code
        finding["best_practice_explanation"] = best_practice_explanation
        remediated_findings.append(finding)
        
    return remediated_findings


def generate_remediations(source_code: str, language: str, findings: List[Dict]) -> List[Dict]:
    if not findings:
        return []

    api_key = settings.gemini_api_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("WARNING: GEMINI_API_KEY not set. Falling back to Remediation Agent mock data.")
        return get_mock_remediations(source_code, language, findings)

    genai.configure(api_key=api_key)
    
    model = genai.GenerativeModel(
        model_name=settings.llm_model,
        system_instruction=SYSTEM_PROMPT
    )

    prompt = (
        f"Language: {language}\n\n"
        f"Source Code:\n{source_code}\n\n"
        f"Flagged Findings:\n{json.dumps(findings, indent=2)}\n\n"
        "Generate specific fix recommendations, corrected code snippets, and best practice explanations for each finding ID."
    )

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=RemediationResult
            )
        )
        
        result = RemediationResult.model_validate_json(response.text)
        remediation_map = {item.finding_id: item for item in result.remediations}

        enriched_findings = []
        for f in findings:
            finding = dict(f)
            f_id = finding.get("id")
            rem = remediation_map.get(f_id)
            if rem:
                finding["remediation_summary"] = rem.remediation_summary
                finding["corrected_code"] = rem.corrected_code
                finding["best_practice_explanation"] = rem.best_practice_explanation
            else:
                # Mock fallback for unmapped finding
                mock_rems = get_mock_remediations(source_code, language, [finding])
                if mock_rems:
                    m = mock_rems[0]
                    finding["remediation_summary"] = m.get("remediation_summary")
                    finding["corrected_code"] = m.get("corrected_code")
                    finding["best_practice_explanation"] = m.get("best_practice_explanation")
            enriched_findings.append(finding)

        return enriched_findings

    except Exception as e:
        print(f"Remediation Agent LLM call failed ({e}). Falling back to mock remediations.")
        return get_mock_remediations(source_code, language, findings)
