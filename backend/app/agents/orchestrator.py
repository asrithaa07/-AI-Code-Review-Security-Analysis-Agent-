import asyncio
import operator
import uuid
from typing import Annotated, Dict, List, TypedDict
from sqlalchemy.orm import Session

from langgraph.graph import START, END, StateGraph
from app.agents.code_analysis import analyze_code_quality
from app.agents.security_vulnerability import scan_security_vulnerabilities
from app.agents.remediation import generate_remediations
from app.agents.pr_summary import generate_pr_summary, calculate_health_score
from app.models.submission import CodeSubmission, SubmissionStatus
from app.database import SessionLocal


class AgentState(TypedDict):
    submission_id: str
    source_code: str
    language: str
    code_findings: List[dict]
    security_findings: List[dict]
    merged_findings: List[dict]
    remediated_findings: List[dict]
    pr_summary: dict
    health_score: int
    errors: Annotated[List[str], operator.add]


# Nodes
async def code_analysis_node(state: AgentState) -> Dict:
    try:
        findings = await asyncio.to_thread(
            analyze_code_quality, 
            state["source_code"], 
            state["language"]
        )
        return {"code_findings": findings}
    except Exception as e:
        return {"errors": [f"Code Analysis Agent failed: {str(e)}"]}


async def security_scan_node(state: AgentState) -> Dict:
    try:
        findings = await asyncio.to_thread(
            scan_security_vulnerabilities, 
            state["source_code"], 
            state["language"]
        )
        return {"security_findings": findings}
    except Exception as e:
        return {"errors": [f"Security Vulnerability Agent failed: {str(e)}"]}


def merge_findings_node(state: AgentState) -> Dict:
    merged = []
    
    # Process Code Analysis Findings
    for f in state.get("code_findings") or []:
        finding = dict(f)
        finding["agent_source"] = "code_analysis"
        finding["id"] = finding.get("id") or str(uuid.uuid4())
        if finding.get("line_number") is not None:
            try:
                finding["line_number"] = int(finding["line_number"])
            except ValueError:
                finding["line_number"] = None
        merged.append(finding)
        
    # Process Security Findings
    for f in state.get("security_findings") or []:
        finding = dict(f)
        finding["agent_source"] = "security_vulnerability"
        finding["id"] = finding.get("id") or str(uuid.uuid4())
        if finding.get("line_number") is not None:
            try:
                finding["line_number"] = int(finding["line_number"])
            except ValueError:
                finding["line_number"] = None
        merged.append(finding)
        
    # Sort merged findings by line number
    def get_sort_key(item):
        ln = item.get("line_number")
        return (0, ln) if ln is not None else (1, 0)
        
    merged.sort(key=get_sort_key)
    return {"merged_findings": merged}


async def remediation_node(state: AgentState) -> Dict:
    try:
        findings = state.get("merged_findings") or []
        enriched = await asyncio.to_thread(
            generate_remediations,
            state["source_code"],
            state["language"],
            findings
        )
        return {"remediated_findings": enriched}
    except Exception as e:
        return {"errors": [f"Remediation Agent failed: {str(e)}"]}


async def pr_summary_node(state: AgentState) -> Dict:
    try:
        findings = state.get("remediated_findings") or state.get("merged_findings") or []
        severity_counts = {
            "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0
        }
        for finding in findings:
            sev = str(finding.get("severity", "info")).lower()
            if sev in severity_counts:
                severity_counts[sev] += 1
            else:
                severity_counts["info"] += 1
                
        summary = await asyncio.to_thread(
            generate_pr_summary,
            state["source_code"],
            state["language"],
            findings,
            severity_counts
        )
        h_score = summary.get("health_score", calculate_health_score(severity_counts))
        return {"pr_summary": summary, "health_score": h_score}
    except Exception as e:
        return {"errors": [f"PR Summary Agent failed: {str(e)}"]}


# Build LangGraph workflow
workflow = StateGraph(AgentState)

workflow.add_node("code_analysis", code_analysis_node)
workflow.add_node("security_scan", security_scan_node)
workflow.add_node("merge", merge_findings_node)
workflow.add_node("remediation", remediation_node)
workflow.add_node("pr_summary_generator", pr_summary_node)

# Execution edges
workflow.add_edge(START, "code_analysis")
workflow.add_edge(START, "security_scan")
workflow.add_edge("code_analysis", "merge")
workflow.add_edge("security_scan", "merge")
workflow.add_edge("merge", "remediation")
workflow.add_edge("remediation", "pr_summary_generator")
workflow.add_edge("pr_summary_generator", END)

orchestrator_app = workflow.compile()


async def run_agent_analysis_pipeline(submission_id: uuid.UUID) -> None:
    db = SessionLocal()
    try:
        submission = db.query(CodeSubmission).filter(CodeSubmission.id == submission_id).first()
        if not submission:
            return

        # Prepare syntax error findings if present
        syntax_findings = []
        if submission.validation_errors:
            for err in submission.validation_errors:
                syntax_findings.append({
                    "id": str(uuid.uuid4()),
                    "agent_source": "syntax_validator",
                    "category": "syntax_error",
                    "severity": err.get("severity", "critical"),
                    "title": f"Syntax Error: {err.get('message', 'Syntax parsing failed')[:60]}",
                    "description": err.get("message", "Syntax parsing failed"),
                    "line_number": err.get("line"),
                    "cwe_id": None,
                    "owasp_category": None,
                    "remediation_summary": "Fix syntax error according to language grammar rules.",
                    "corrected_code": "# Correct syntax error\n",
                    "best_practice_explanation": "Source code must be free of compiler and syntax errors to compile and execute safely."
                })

        # Prepare graph state
        initial_state = {
            "submission_id": str(submission.id),
            "source_code": submission.source_code,
            "language": submission.language.value,
            "code_findings": [],
            "security_findings": [],
            "merged_findings": [],
            "remediated_findings": [],
            "pr_summary": {},
            "health_score": 100,
            "errors": []
        }
        
        # Run orchestrator
        result_state = await orchestrator_app.ainvoke(initial_state)
        
        # Reload submission to update
        submission = db.query(CodeSubmission).filter(CodeSubmission.id == submission_id).first()
        
        errors = result_state.get("errors") or []
        if errors and not syntax_findings and not result_state.get("merged_findings"):
            submission.status = SubmissionStatus.failed
            existing_errors = submission.validation_errors or []
            for err in errors:
                existing_errors.append({"line": None, "column": None, "message": err})
            submission.validation_errors = existing_errors
        else:
            final_findings = syntax_findings + (result_state.get("remediated_findings") or result_state.get("merged_findings") or [])
            
            # Sort findings by line number
            def get_sort_key(item):
                ln = item.get("line_number")
                return (0, int(ln)) if ln is not None else (1, 0)
                
            final_findings.sort(key=get_sort_key)
            submission.findings = final_findings
            
            # Compute severity statistics across ALL final findings (including syntax errors)
            severity_counts = {
                "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0
            }
            for finding in final_findings:
                sev = str(finding.get("severity", "info")).lower()
                if sev in severity_counts:
                    severity_counts[sev] += 1
                else:
                    severity_counts["info"] += 1
            
            submission.severity_scores = severity_counts
            
            # Compute accurate health score across all final findings
            h_score = calculate_health_score(severity_counts)
            submission.health_score = h_score
            
            # Generate or update PR summary with full findings and severity counts
            pr_sum = result_state.get("pr_summary")
            if not pr_sum or syntax_findings:
                pr_sum = generate_pr_summary(submission.source_code, submission.language.value, final_findings, severity_counts)
            else:
                pr_sum["health_score"] = h_score
                pr_sum["severity_breakdown"] = severity_counts
                
            submission.pr_summary = pr_sum
            submission.status = SubmissionStatus.completed
            
        db.commit()
    except Exception as e:
        db.rollback()
        submission = db.query(CodeSubmission).filter(CodeSubmission.id == submission_id).first()
        if submission:
            submission.status = SubmissionStatus.failed
            existing_errors = submission.validation_errors or []
            existing_errors.append({"line": None, "column": None, "message": f"Orchestration failure: {str(e)}"})
            submission.validation_errors = existing_errors
            db.commit()
    finally:
        db.close()
