import asyncio
import operator
import uuid
from typing import Annotated, Dict, List, TypedDict
from sqlalchemy.orm import Session

from langgraph.graph import START, END, StateGraph
from app.agents.code_analysis import analyze_code_quality
from app.agents.security_vulnerability import scan_security_vulnerabilities
from app.models.submission import CodeSubmission, SubmissionStatus
from app.database import SessionLocal

class AgentState(TypedDict):
    submission_id: str
    source_code: str
    language: str
    code_findings: List[dict]
    security_findings: List[dict]
    merged_findings: List[dict]
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
        
    # Sort merged findings by line number (placing global / None line numbers at the end)
    def get_sort_key(item):
        ln = item.get("line_number")
        return (0, ln) if ln is not None else (1, 0)
        
    merged.sort(key=get_sort_key)
    return {"merged_findings": merged}

# Build LangGraph workflow
workflow = StateGraph(AgentState)

workflow.add_node("code_analysis", code_analysis_node)
workflow.add_node("security_scan", security_scan_node)
workflow.add_node("merge", merge_findings_node)

# Set up graph execution edges
workflow.add_edge(START, "code_analysis")
workflow.add_edge(START, "security_scan")
workflow.add_edge("code_analysis", "merge")
workflow.add_edge("security_scan", "merge")
workflow.add_edge("merge", END)

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
                    "owasp_category": None
                })

        # Prepare graph state
        initial_state = {
            "submission_id": str(submission.id),
            "source_code": submission.source_code,
            "language": submission.language.value,
            "code_findings": [],
            "security_findings": [],
            "merged_findings": [],
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
            merged = syntax_findings + (result_state.get("merged_findings") or [])
            
            # Sort merged findings by line number (placing global / None line numbers at the end)
            def get_sort_key(item):
                ln = item.get("line_number")
                return (0, int(ln)) if ln is not None else (1, 0)
                
            merged.sort(key=get_sort_key)
            submission.findings = merged
            
            # Compute severity statistics across all flagged issues
            severity_counts = {
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0,
                "info": 0
            }
            for finding in merged:
                severity = str(finding.get("severity", "info")).lower()
                if severity in severity_counts:
                    severity_counts[severity] += 1
                else:
                    severity_counts["info"] += 1
            
            submission.severity_scores = severity_counts
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
