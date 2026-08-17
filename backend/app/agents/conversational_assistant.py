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
    # 1. Perform RAG retrieval from ChromaDB vector store
    retrieved_chunks = []
    try:
        retrieved_chunks = knowledge_base_retriever.query(user_message, top_k=4)
    except Exception as e:
        print(f"RAG retrieval warning: {e}")

    # Process submission context details
    code_snippet = ""
    findings = []
    lang = "code"
    if submission_context:
        lang = submission_context.get("language", "code")
        code_snippet = submission_context.get("source_code", "")
        findings = submission_context.get("findings", [])

    # If Gemini API key is available, call Gemini LLM
    api_key = settings.gemini_api_key or os.environ.get("GEMINI_API_KEY")
    if api_key:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(
                model_name=settings.llm_model,
                system_instruction=SYSTEM_PROMPT
            )
            rag_text = "\n\n".join([f"--- Source: {c['source']} ({c['category']}) ---\n{c['content']}" for c in retrieved_chunks])
            submission_text = (
                f"\n\nCurrent Analyzed Submission ({lang.upper()}):\n"
                f"Source Code:\n{code_snippet}\n\n"
                f"Flagged Findings:\n{findings}\n"
            ) if submission_context else ""
            
            prompt = (
                f"Retrieved Knowledge Base Context (RAG):\n{rag_text if rag_text else 'No RAG context.'}\n"
                f"{submission_text}\n"
                f"Developer Question: {user_message}\n\n"
                "Provide a comprehensive, clear, structured markdown response with code examples:"
            )
            res = model.generate_content(prompt)
            return {"reply": res.text, "rag_sources": retrieved_chunks}
        except Exception as e:
            print(f"LLM call failed ({e}), switching to dynamic RAG synthesis engine.")

    # 2. Intelligent Dynamic ChatGPT-Style RAG Synthesis Engine
    # Normalize user message string (remove hyphens, handle spaces like "hard coded" vs "hardcoded")
    lowered = user_message.lower()
    normalized_msg = lowered.replace("-", " ").replace("_", " ")

    chunk_excerpts = []
    for c in retrieved_chunks:
        content = c.get("content", "").strip()
        src = c.get("source", "knowledge_base.md")
        cat = c.get("category", "security")
        if content:
            cleaned_content = "\n".join(
                [line.lstrip("#").strip() if line.strip().startswith("#") else line for line in content.split("\n")]
            )
            chunk_excerpts.append((src, cat, cleaned_content))

    # Topic Map for presence checks and explanations
    topics = {
        "secrets": {
            "name": "Hardcoded Secrets & Credentials (CWE-798)",
            "keywords": ["hard coded", "hardcoded", "secret", "api key", "password", "credential", "token", "cwe 798", "cwe-798"],
            "what_is_it": "Hardcoded secrets refer to private API keys, database passwords, tokens, or encryption keys stored directly as plain strings in source code.",
            "fix_guide": "Always read sensitive credentials dynamically at runtime from environment variables (`os.environ.get()`) or a secret manager.",
            "code_example": "# Python Safe Environment Variable Retrieval\nimport os\nAPI_KEY = os.environ.get('API_SECRET_KEY')"
        },
        "sql_injection": {
            "name": "SQL Injection (CWE-89)",
            "keywords": ["sql", "query", "cwe 89", "cwe-89", "database", "select", "where", "injection"],
            "what_is_it": "SQL Injection occurs when untrusted user input is concatenated directly into SQL query strings.",
            "fix_guide": "Use parameterized queries or PreparedStatements which separate SQL logic from untrusted user values.",
            "code_example": "# Python Safe Parameterized Query\nquery = 'SELECT * FROM users WHERE username = %s'\ncursor.execute(query, (user_input,))"
        },
        "command_injection": {
            "name": "OS Command Injection (CWE-78)",
            "keywords": ["command injection", "cwe 78", "cwe-78", "os.system", "subprocess", "exec", "runtime.exec"],
            "what_is_it": "OS Command Injection occurs when unescaped user input is passed directly to system shell execution commands.",
            "fix_guide": "Avoid shell invocation (`shell=True`) and pass arguments as a list directly to process execution APIs.",
            "code_example": "# Python Safe Command Execution\nimport subprocess\nsubprocess.run(['ping', '-c', '3', host], capture_output=True, check=True)"
        },
        "xss": {
            "name": "Cross-Site Scripting (XSS / CWE-79)",
            "keywords": ["xss", "cross site scripting", "cwe 79", "cwe-79", "html", "encode", "escape", "innerhtml", "dom"],
            "what_is_it": "XSS allows attackers to inject malicious JavaScript into web pages rendered for other users.",
            "fix_guide": "Apply context-aware HTML/JavaScript output encoding and template engines with auto-escaping enabled.",
            "code_example": "# Python (Jinja2 auto-escapes html context)\nreturn render_template('profile.html', user_data=user_input)"
        },
        "hashing": {
            "name": "Weak Cryptographic Hashing / MD5 (CWE-328)",
            "keywords": ["md5", "sha1", "hash", "bcrypt", "cwe 328", "cwe-328", "crypto"],
            "what_is_it": "Legacy hash functions like MD5 and SHA-1 are cryptographically broken and vulnerable to fast collision attacks.",
            "fix_guide": "Use salted adaptive hashing algorithms like bcrypt, Argon2, or PBKDF2 for password storage.",
            "code_example": "# Python Safe bcrypt Password Hashing\nimport bcrypt\nsalt = bcrypt.gensalt(12)\nhashed = bcrypt.hashpw(password.encode('utf-8'), salt)"
        },
        "path_traversal": {
            "name": "Path Traversal (CWE-22)",
            "keywords": ["path traversal", "directory traversal", "cwe 22", "cwe-22", "filename", "open"],
            "what_is_it": "Path Traversal occurs when file path inputs access files outside the intended base directory.",
            "fix_guide": "Resolve target paths to absolute canonical paths and verify they reside inside the allowed directory sandbox.",
            "code_example": "# Python Safe Path Resolution\nfrom pathlib import Path\nbase = Path('/var/uploads').resolve()\ntarget = Path(base / filename).resolve()\nif not target.is_relative_to(base):\n    raise PermissionError('Unauthorized access')"
        },
        "complexity": {
            "name": "Code Complexity & Deep Nesting",
            "keywords": ["guard clause", "guard", "nesting", "complexity", "cyclomatic", "arrow anti pattern", "clean code", "dry"],
            "what_is_it": "Deeply nested conditional blocks increase cognitive complexity and hinder readability.",
            "fix_guide": "Use early return guard clauses at method start to validate preconditions early.",
            "code_example": "# Python Early Return Guard Clause\ndef process_user(user_id, data):\n    if not user_id or not data:\n        return False  # Early exit\n    # Continue main linear logic..."
        },
        "quality": {
            "name": "Code Quality Issues & Code Smells",
            "keywords": ["quality", "code quality", "smell", "code smell", "duplication", "parameter list", "refactoring", "maintainability"],
            "what_is_it": "Code quality issues include code smells such as Duplicate Code, Long Parameter Lists, Magic Numbers, and God Classes that degrade maintainability and readability.",
            "fix_guide": "Extract repeated logic into helper functions, apply parameter objects, use constants, and enforce modular single-responsibility principles.",
            "code_example": "# Refactored with Parameter Object\nfrom dataclasses import dataclass\n\n@dataclass\nclass UserRequest:\n    name: str\n    email: str\n\ndef create_user(req: UserRequest):\n    pass"
        }
    }

    # Identify requested topic with space/hyphen normalization
    matched_topic_key = None
    for t_key, t_info in topics.items():
        if any(kw in normalized_msg or kw in lowered for kw in t_info["keywords"]):
            matched_topic_key = t_key
            break

    # Presence query detection
    is_presence_query = any(p in normalized_msg for p in [
        "is ", "are ", "present", "does my code", "do i have", "in my code", "check if", "detected", "vulnerable", "found", "have any", "submitted code", "in the code"
    ])

    reply_sections = []

    # Scenario A: User asking if a specific vulnerability/issue is present in their code
    if matched_topic_key and (is_presence_query or submission_context):
        t_info = topics[matched_topic_key]
        topic_name = t_info["name"]
        
        # Check if finding exists in analyzed submission
        matching_finding = None
        if findings:
            for f in findings:
                f_title = f.get("title", "").lower()
                f_desc = f.get("description", "").lower()
                f_cwe = f.get("cwe_id", "").lower()
                if any(kw in f_title or kw in f_desc or kw in f_cwe for kw in t_info["keywords"]):
                    matching_finding = f
                    break

        if matching_finding:
            line = matching_finding.get("line_number")
            line_str = f" (Line {line})" if line else ""
            desc = matching_finding.get("description", t_info["what_is_it"])
            remediation = matching_finding.get("remediation_summary", t_info["fix_guide"])
            corrected = matching_finding.get("corrected_code", t_info["code_example"])
            
            reply_sections.append(
                f"### Yes, {topic_name} IS present in your code{line_str}.\n\n"
                f"**Why it was flagged:**\n{desc}\n\n"
                f"**How to Fix / Overcome It:**\n{remediation}\n\n"
                f"**Corrected Code Suggestion:**\n```python\n{corrected.strip()}\n```"
            )
        else:
            reply_sections.append(
                f"### No, {topic_name} was NOT detected in your submitted code.\n\n"
                f"**What is {topic_name}?**\n{t_info['what_is_it']}\n\n"
                f"**How to Fix / Prevent it if it occurs in future code:**\n{t_info['fix_guide']}\n\n"
                f"**Secure Code Example:**\n```python\n{t_info['code_example']}\n```"
            )

    # Scenario B: User asking general "what are issues in my code" query
    elif submission_context and (findings is not None) and any(k in normalized_msg for k in ["my code", "issues in my code", "overcome", "fix my code", "what are the issues", "flagged issue", "submitted code", "code quality issue", "quality issue"]):
        reply_sections.append("### Code Analysis & Remediation Summary\n")
        reply_sections.append(f"Your submitted **{lang.upper()}** code has **{len(findings)} flagged issue(s)**:\n")
        
        for idx, f in enumerate(findings, 1):
            sev = f.get("severity", "info").upper()
            title = f.get("title", "Flagged Issue")
            desc = f.get("description", "")
            line = f.get("line_number")
            line_str = f" (Line {line})" if line else ""
            remediation = f.get("remediation_summary", "")
            corrected = f.get("corrected_code", "")
            
            item_text = f"**{idx}. [{sev}] {title}**{line_str}\n"
            item_text += f"- **Issue:** {desc}\n"
            if remediation:
                item_text += f"- **How to Overcome:** {remediation}\n"
            if corrected:
                snippet = corrected[:150].strip() + ("..." if len(corrected) > 150 else "")
                item_text += f"```\n{snippet}\n```"
            reply_sections.append(item_text)

    # Scenario C: ChatGPT-Style Natural RAG Response Synthesis
    else:
        if chunk_excerpts:
            # Natural conversational response grounded in retrieved Knowledge Base
            top_src, top_cat, top_txt = chunk_excerpts[0]
            clean_content = top_txt[:500].strip()
            
            reply_sections.append(
                f"Here is what the Secure Coding Knowledge Base recommends regarding **\"{user_message}\"**:\n\n"
                f"{clean_content}\n\n"
                "**Key Recommendation:**\n"
                "Ensure untrusted input is validated or parameterized, handle resource lifecycles explicitly, and avoid storing plain secrets in code files."
            )
        else:
            reply_sections.append(
                f"Regarding **\"{user_message}\"**, here are core secure coding guidelines:\n\n"
                "1. **Input Validation**: Validate external input with whitelist schema validation.\n"
                "2. **Least Privilege**: Operating components with minimal required rights.\n"
                "3. **Injection Prevention**: Parameterize database queries and avoid shell execution.\n"
                "4. **Secrets Management**: Store API keys and credentials in environment variables."
            )

    final_reply = "\n\n".join(reply_sections)
    return {"reply": final_reply, "rag_sources": retrieved_chunks}
