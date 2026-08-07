import os
from typing import Dict, List, Optional, Any
import google.generativeai as genai

from app.config import settings
from app.rag.indexer import knowledge_base_retriever


SYSTEM_PROMPT = """
You are an expert Conversational Secure Coding Assistant and Code Review Guide.
Your mission is to help software developers understand flagged code vulnerabilities, OWASP Top 10 security standards, refactoring techniques, and secure coding best practices.

Use the provided Knowledge Base RAG context chunks, as well as the submission code/findings context if provided, to give precise, actionable, clear, and encouraging responses.
Always ground your answers in secure coding guidelines (OWASP, CWE, clean code principles). Provide code examples when appropriate.
"""


def generate_assistant_response(
    user_message: str,
    submission_context: Optional[Dict[str, Any]] = None,
    chat_history: Optional[List[Dict[str, str]]] = None
) -> Dict[str, Any]:
    # Perform RAG retrieval from ChromaDB vector store
    retrieved_chunks = []
    try:
        retrieved_chunks = knowledge_base_retriever.query(user_message, top_k=4)
    except Exception as e:
        print(f"RAG retrieval warning: {e}")

    rag_text = "\n\n".join([f"--- Source: {c['source']} ({c['category']}) ---\n{c['content']}" for c in retrieved_chunks])

    submission_text = ""
    if submission_context:
        lang = submission_context.get("language", "code")
        code = submission_context.get("source_code", "")
        findings = submission_context.get("findings", [])
        submission_text = (
            f"\n\nCurrent Analyzed Submission ({lang.upper()}):\n"
            f"Source Code:\n{code}\n\n"
            f"Flagged Findings:\n{findings}\n"
        )

    api_key = settings.gemini_api_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        # Fallback response grounded in RAG & question topic
        lowered = user_message.lower()
        if "sql" in lowered or "injection" in lowered or "cwe-89" in lowered:
            reply = (
                "**SQL Injection (SQLi) Guidance**:\n\n"
                "SQL Injection occurs when untrusted user input is directly concatenated into SQL query strings. "
                "Attackers can manipulate the query structure to bypass authentication or extract sensitive database contents.\n\n"
                "**Remediation Recommendation**:\n"
                "Always use **parameterized queries** or PreparedStatements. In Python: `cursor.execute('SELECT * FROM users WHERE id = %s', (user_id,))`. "
                "In Java: `PreparedStatement stmt = conn.prepareStatement('SELECT * FROM users WHERE id = ?'); stmt.setString(1, userId);`."
            )
        elif "secret" in lowered or "key" in lowered or "password" in lowered or "cwe-798" in lowered:
            reply = (
                "**Hardcoded Credentials & Secret Protection**:\n\n"
                "Hardcoding API secret keys, database passwords, or JWT secrets in source code risks critical leaks when pushed to version control.\n\n"
                "**Remediation Recommendation**:\n"
                "Extract credentials into environment variables (`os.environ['API_KEY']` in Python or `System.getenv('API_KEY')` in Java) "
                "or utilize a secret manager (AWS Secrets Manager, HashiCorp Vault)."
            )
        elif "hash" in lowered or "md5" in lowered or "bcrypt" in lowered:
            reply = (
                "**Password Hashing & Cryptographic Guidelines**:\n\n"
                "MD5 and SHA-1 are cryptographically broken and fast to crack. Passwords must never be stored in plaintext or with simple algorithms.\n\n"
                "**Remediation Recommendation**:\n"
                "Use adaptive password hashing algorithms such as **bcrypt**, Argon2, or PBKDF2 with salt."
            )
        elif "owasp" in lowered:
            reply = (
                "**OWASP Top 10 Summary**:\n\n"
                "The OWASP Top 10 provides standard security guidance for web developers:\n"
                "- **A01: Broken Access Control**: Enforce strict server-side authorization checks.\n"
                "- **A02: Cryptographic Failures**: Protect data in transit and at rest with modern encryption.\n"
                "- **A03: Injection**: Use parameterized queries and avoid raw shell execution.\n"
                "- **A07: Identification and Authentication**: Enforce MFA and secure password storage."
            )
        else:
            reply = (
                f"Thank you for asking about: **'{user_message}'**.\n\n"
                "To ensure code quality and security:\n"
                "1. Sanitize and validate all user inputs at system boundaries.\n"
                "2. Apply parameterization for database queries.\n"
                "3. Store credentials safely in environment variables.\n"
                "4. Keep code modular using guard clauses to minimize cyclomatic complexity."
            )
            
        return {
            "reply": reply,
            "rag_sources": retrieved_chunks
        }

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name=settings.llm_model,
        system_instruction=SYSTEM_PROMPT
    )

    full_prompt = (
        f"Retrieved Knowledge Base Context (RAG):\n{rag_text if rag_text else 'No specific RAG context found.'}\n"
        f"{submission_text}\n"
        f"Developer Question: {user_message}\n\n"
        "Provide a comprehensive, clear, and helpful response:"
    )

    try:
        response = model.generate_content(full_prompt)
        return {
            "reply": response.text,
            "rag_sources": retrieved_chunks
        }
    except Exception as e:
        print(f"Assistant LLM call failed: {e}")
        return {
            "reply": f"Unable to process assistant query via LLM ({str(e)}). Grounded advice: Always validate input, parameterize SQL statements, and store secrets securely.",
            "rag_sources": retrieved_chunks
        }
