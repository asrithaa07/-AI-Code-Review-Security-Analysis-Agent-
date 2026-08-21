# Team Presentation & Meeting Guide

*Congratulations on being selected! Use this guide as a cheat-sheet when explaining the architecture, tech stack, and workflow to your team members.*

---

## 1. The Core Problem We Are Solving
Start the meeting by explaining *why* this project exists:
> "Manual code reviews are slow and often miss critical security flaws. We built a platform that instantly acts as a Senior Security Architect. A developer submits their code, and our multi-agent AI automatically scans it for OWASP Top 10 vulnerabilities, writes the fixed code for them, and provides a dashboard to talk to the AI about the fixes."

## 2. Our Technology Stack (The "What")
Break the platform down into three distinct layers so it's easy for them to digest.

**Frontend (The Developer Portal)**
* **Next.js & React:** Extremely fast, modern UI framework.
* **Tailwind CSS & Shadcn:** For the premium, dark-mode styling and fluid components.
* **Chart.js:** Powers our dynamic 8-axis Security Radar Chart.

**Backend (The Engine)**
* **FastAPI (Python):** High-performance backend API handling concurrent requests.
* **SQLite / PostgreSQL:** For storing users, scan histories, and generated PDF reports.
* **ChromaDB:** A local vector database used to store our security knowledge base.

**AI & Orchestration (The Brains)**
* **LangGraph:** This is critical! We don't just make one API call. We use LangGraph to orchestrate a "team" of AI agents working together in a pipeline.
* **LangChain:** Handles our RAG (Retrieval-Augmented Generation) so the chatbot actually "reads" OWASP documents before answering.

## 3. The LLMs & Architecture
Your team will definitely ask what AI models are under the hood. 

* **Primary Engine:** **Google Gemini 3.6 Flash**. We chose this model because it is blazing fast, capable of handling massive code-context windows with pinpoint precision, and is excellent at generative refactoring and structured JSON outputs.
* **Embedding Model:** **BAAI/bge-small-en-v1.5**. This is a powerful, lightweight local model running natively on our server that converts our OWASP security documents into vector numbers so the chatbot can search them.
* **Multi-Level Fallback Engine:** This is a major selling point of our architecture! We designed a robust fallback pipeline that prevents the system from ever crashing due to LLM rate limits or API exhaustion:
  - **Level 1 (Cloud Fallback):** If Gemini 3.6 fails, times out, or exhausts its quotas, the system automatically routes the request to **Grok (xAI)**.
  - **Level 2 (Offline Fallback):** If the entire internet or cloud LLMs go offline entirely, our orchestrator detects this and instantly bypasses all LLMs to rely on our native **Static AST Refactoring Engine**. It uses hard-coded rules to safely patch vulnerabilities without an internet connection!

## 4. The Exact Project Workflow (How It Works sequentially)
*Walk them through exactly what happens when a user clicks "Analyze" on the frontend.*

1. **Submission:** The user pastes Python or Java code in the Next.js UI. The frontend sends it to our FastAPI backend.
2. **LangGraph Pipeline Triggers:** FastAPI hands the code to our master Orchestrator agent.
3. **Parallel Scanning:**
   - The **Code Analysis Agent** scans for "smells" (like high cyclomatic complexity or deep nested `if` statements).
   - The **Security Vulnerability Agent** runs an AST (Abstract Syntax Tree) static scan looking for OWASP vulnerabilities (SQL Injection, Hardcoded Secrets, Command Injection). *Note: This step doesn't even use the LLM; it's instant and mathematically accurate.*
4. **AI Remediation:** The Orchestrator gathers these flagged issues and sends them to the **Remediation Agent (Gemini 3.6 Flash)**. Gemini writes the exact code required to fix every flag (e.g., parameterizing the SQL queries) and explains why it made the change.
5. **Scoring Compilation:** The **PR Summary Agent** calculates a definitive *Code Health Score (0-100)* using a strict penalty formula algorithm based on issue severity.
6. **Dashboard Delivery:** The data is pushed back to the frontend where the React dashboard renders the Radar Chart and interactive code-diffs.
7. **Conversational Follow-up:** If the user has questions, they can talk to the Chatbot, which uses ChromaDB RAG to pull up official documentation and answer questions instantly.

---

### Tips for the Panel Presentation Tomorrow:
- **Lead with the Radar Chart:** Visually, it is stunning. Show them the Radar Chart immediately as it instantly communicates the value of the platform.
- **Show, Don't just Tell:** Run a piece of code that has a blatant SQL Injection or Hardcoded Password, and let them watch the code rewrite itself securely in real-time.
- **Drop the keyword "LangGraph":** Panel members love modern tooling. Emphasize that this isn't just a basic "ChatGPT wrapper"—it is a deterministic, multi-agent automated pipeline using LangGraph.
