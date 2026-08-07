"use client";

import { useRef, useState, useEffect } from "react";
import { 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Upload, 
  Sparkles, 
  FileCode, 
  FileDown, 
  ShieldAlert, 
  Info,
  ShieldCheck,
  Check,
  Copy,
  MessageSquare,
  ListOrdered,
  FileText,
  Terminal,
  Activity
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Language, Submission, Finding, submitPaste, submitUpload, getSubmissionDetails } from "@/lib/api";
import { ConversationalAssistant } from "@/components/conversational-assistant";

interface CodeSubmissionFormProps {
  onSubmissionComplete: (submission: Submission) => void;
}

const SAMPLE_PYTHON = `def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    cursor.execute(query)
    return cursor.fetchone()
`;

const SAMPLE_JAVA = `public class AuthService {
    private static final String API_KEY = "sk-secret-key-12345";

    public User login(String username, String password) {
        String sql = "SELECT * FROM users WHERE username = '" + username + "'";
        return db.query(sql);
    }
}
`;

export function CodeSubmissionForm({ onSubmissionComplete }: CodeSubmissionFormProps) {
  const [sourceCode, setSourceCode] = useState("");
  const [filename, setFilename] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client-side quick auto-detection for visual preview
  const autoDetectedLanguage: Language = (() => {
    if (filename.toLowerCase().endsWith(".py")) return "python";
    if (filename.toLowerCase().endsWith(".java")) return "java";
    const code = sourceCode.toLowerCase();
    const javaScore = (code.match(/public class|system\.out|public static void|import java\.|void |string\[\]/g) || []).length;
    const pyScore = (code.match(/def |import |from |elif |self\.|print\(/g) || []).length;
    return javaScore > pyScore ? "java" : "python";
  })();

  const handlePasteSubmit = async () => {
    if (!sourceCode.trim()) {
      setError("Please enter source code before submitting.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const submission = await submitPaste({
        source_code: sourceCode,
        filename: filename || undefined,
      });
      onSubmissionComplete(submission);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const submission = await submitUpload(file);
      onSubmissionComplete(submission);
      setSelectedFile(null); // Reset selected file after submission
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setError(null);
    if (file.size === 0) {
      setError("The selected file is empty and cannot be analyzed.");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "py" && ext !== "java") {
      setError("Unsupported file type. Only .py and .java files are allowed.");
      return;
    }
    setSelectedFile(file);
  };

  const handleSelectedFileSubmit = () => {
    if (selectedFile) {
      handleFileUpload(selectedFile);
    }
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm">
      <CardHeader className="space-y-3 p-6 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Submit Code for Review</CardTitle>
            <CardDescription className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Paste source code or drag &amp; drop a file — the agent auto-detects Python vs Java code structure.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="paste" className="w-full">
          <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl">
            <TabsTrigger value="paste" className="rounded-lg font-semibold py-2.5 transition-all">Paste Code</TabsTrigger>
            <TabsTrigger value="upload" className="rounded-lg font-semibold py-2.5 transition-all">Upload File</TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 items-center">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Target Language</Label>
                <div className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold px-3 py-1 text-xs">
                    {autoDetectedLanguage === "python" ? "🐍 Auto-Detected: Python" : "☕ Auto-Detected: Java"}
                  </Badge>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Agent auto-understands code</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filename" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Filename (optional)</Label>
                <Input
                  id="filename"
                  placeholder={autoDetectedLanguage === "python" ? "example.py" : "Example.java"}
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-transparent py-5 focus-visible:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label htmlFor="source-code" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Source Code</Label>
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => setSourceCode(SAMPLE_PYTHON)} 
                    className="inline-flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900 cursor-pointer"
                  >
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                    Load Sample Python
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setSourceCode(SAMPLE_JAVA)} 
                    className="inline-flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900 cursor-pointer"
                  >
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                    Load Sample Java
                  </button>
                </div>
              </div>
              <div className="w-full relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1">
                <Textarea
                  id="source-code"
                  placeholder="Paste your Python or Java source code here..."
                  className="w-full min-h-[380px] font-mono text-sm bg-transparent border-0 resize-y focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-0"
                  value={sourceCode}
                  onChange={(e) => setSourceCode(e.target.value)}
                  spellCheck="false"
                />
              </div>
            </div>

            <button 
              type="button"
              onClick={handlePasteSubmit} 
              disabled={isSubmitting} 
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/10 px-8 py-4 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validating &amp; Triggering Multi-Agent Analysis...
                </span>
              ) : (
                "Submit Code Analysis"
              )}
            </button>
          </TabsContent>

          <TabsContent value="upload" className="mt-6 space-y-5">
            {selectedFile ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-8 flex flex-col items-center gap-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                  <FileCode className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">{selectedFile.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto mt-2">
                  <Button
                    variant="outline"
                    onClick={() => { setSelectedFile(null); setError(null); }}
                    className="flex-1 sm:flex-initial rounded-xl font-semibold border-slate-300 dark:border-slate-800"
                    disabled={isSubmitting}
                  >
                    Change File
                  </Button>
                  <Button
                    onClick={handleSelectedFileSubmit}
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-initial bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/10 rounded-xl"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Submit File for Review"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="group cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 dark:border-slate-800 dark:hover:border-blue-600 bg-slate-50/50 hover:bg-blue-50/20 dark:bg-slate-950/30 dark:hover:bg-blue-950/10 p-12 text-center transition-all duration-200"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileSelect(file);
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 group-hover:scale-110 transition-transform shadow-sm">
                  <Upload className="h-5 w-5 text-slate-500 dark:text-slate-400 group-hover:text-blue-500" />
                </div>
                <p className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-200">Drag &amp; drop your source file here</p>
                <p className="mb-4 text-xs text-slate-500">Supports .py and .java files (max 500KB)</p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".py,.java"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                <Button variant="outline" className="rounded-xl font-semibold border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
                  Browse Local Files
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mt-6 rounded-xl border border-red-200 dark:border-red-950 bg-red-50/50 dark:bg-red-950/20">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertTitle className="text-red-800 dark:text-red-400 font-bold">Execution Error</AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export function SubmissionResult({ submission: initialSubmission }: { submission: Submission }) {
  const [submission, setSubmission] = useState<Submission>(initialSubmission);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all"); // all, security, quality, owasp
  const [activePortalTab, setActivePortalTab] = useState<"findings" | "pr_summary" | "assistant">("findings");
  const [assistantQuery, setAssistantQuery] = useState<string | undefined>(undefined);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Sync state if initialSubmission changes from parent
  useEffect(() => {
    setSubmission(initialSubmission);
    setSelectedFindingId(null);
  }, [initialSubmission]);

  // Polling logic for status pending/analyzing
  useEffect(() => {
    if (submission.status === "pending" || submission.status === "analyzing") {
      const interval = setInterval(async () => {
        try {
          const updated = await getSubmissionDetails(submission.id);
          setSubmission(updated);
          if (updated.status === "completed" || updated.status === "failed") {
            clearInterval(interval);
          }
        } catch (e) {
          console.error("Failed to poll submission status:", e);
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [submission.id, submission.status]);

  const downloadPdf = () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    window.open(`${API_URL}/api/v1/submissions/${submission.id}/pdf`, "_blank");
  };

  const downloadMarkdown = () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    window.open(`${API_URL}/api/v1/submissions/${submission.id}/markdown`, "_blank");
  };

  const downloadJson = () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    window.open(`${API_URL}/api/v1/submissions/${submission.id}/json`, "_blank");
  };

  if (submission.status === "pending" || submission.status === "analyzing") {
    return (
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm p-12 flex flex-col items-center justify-center min-h-[450px]">
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute h-16 w-16 rounded-full border-4 border-blue-100 dark:border-blue-950 animate-pulse"></div>
          <Loader2 className="h-10 w-10 text-blue-600 dark:text-blue-400 animate-spin relative" />
        </div>
        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">Analyzing Your Code</h4>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center max-w-sm">
          Running LangGraph Orchestrator pipeline: parallel execution of Code Analysis, Security Vulnerability, Remediation, and PR Summary agents...
        </p>
      </Card>
    );
  }

  if (submission.status === "failed") {
    return (
      <Card className="border border-red-200 dark:border-red-950 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden p-6 space-y-4 min-h-[450px] flex flex-col justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 text-center">Analysis Pipeline Failed</h4>
        <div className="rounded-xl bg-red-50/50 dark:bg-red-950/25 p-4 border border-red-100 dark:border-red-900/40 max-h-60 overflow-y-auto">
          <ul className="list-disc pl-5 space-y-2 text-sm text-red-700 dark:text-red-300">
            {submission.validation_errors && submission.validation_errors.length > 0 ? (
              submission.validation_errors.map((err, i) => <li key={i}>{err.message}</li>)
            ) : (
              <li>Unknown orchestration execution failure.</li>
            )}
          </ul>
        </div>
      </Card>
    );
  }

  const findings = submission.findings || [];

  // OWASP Category extraction for prominent display & filtering
  const owaspCategoriesFound = Array.from(
    new Set(findings.map((f) => f.owasp_category).filter((c): c is string => Boolean(c)))
  );

  // Filter findings based on user controls
  const filteredFindings = findings.filter((f) => {
    const matchesSeverity = severityFilter === "all" || f.severity.toLowerCase() === severityFilter.toLowerCase();
    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "syntax" && (f.agent_source === "syntax_validator" || f.category === "syntax_error")) ||
      (typeFilter === "security" && f.agent_source === "security_vulnerability") ||
      (typeFilter === "quality" && f.agent_source === "code_analysis") ||
      (typeFilter === "owasp" && Boolean(f.owasp_category));
    return matchesSeverity && matchesType;
  });

  const selectedFinding = findings.find((f) => f.id === selectedFindingId);

  // Group findings by line number for inline code annotations
  const findingsByLine: Record<number, Finding[]> = {};
  findings.forEach((f) => {
    if (f.line_number != null) {
      if (!findingsByLine[f.line_number]) {
        findingsByLine[f.line_number] = [];
      }
      findingsByLine[f.line_number].push(f);
    }
  });

  const getSeverityBadge = (sev: string) => {
    const s = (sev || "info").toLowerCase();
    switch (s) {
      case "critical":
        return <Badge className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 shadow-sm">Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 shadow-sm">High</Badge>;
      case "medium":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 shadow-sm">Medium</Badge>;
      case "low":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 shadow-sm">Low</Badge>;
      default:
        return <Badge className="bg-slate-500 hover:bg-slate-600 text-white font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 shadow-sm">Info</Badge>;
    }
  };

  const getCategoryFlag = (f: Finding) => {
    if (f.agent_source === "syntax_validator" || f.category === "syntax_error") {
      return (
        <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-800 dark:text-red-400 font-semibold text-[10px] bg-red-50 dark:bg-red-950/40">
          🚫 Syntax Error
        </Badge>
      );
    }
    if (f.agent_source === "security_vulnerability") {
      return (
        <Badge variant="outline" className="border-purple-300 text-purple-700 dark:border-purple-800 dark:text-purple-400 font-semibold text-[10px] bg-purple-50 dark:bg-purple-950/40">
          🛡️ Security ({f.category.replace(/_/g, " ")})
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400 font-semibold text-[10px] bg-amber-50 dark:bg-amber-950/40">
        ⚙️ Quality ({f.category.replace(/_/g, " ")})
      </Badge>
    );
  };

  const getLineHighlightClass = (lineNumber: number) => {
    const lineFindings = findingsByLine[lineNumber] || [];
    if (lineFindings.length === 0) return "";

    const isSelectedLine = lineFindings.some((f) => f.id === selectedFindingId);

    let highestSev = "info";
    const order = ["critical", "high", "medium", "low", "info"];
    for (const s of order) {
      if (lineFindings.some((f) => f.severity.toLowerCase() === s)) {
        highestSev = s;
        break;
      }
    }

    let bgClass = "";
    if (highestSev === "critical" || highestSev === "high") bgClass = "bg-red-500/10 dark:bg-red-950/20";
    else if (highestSev === "medium") bgClass = "bg-amber-500/10 dark:bg-amber-950/20";
    else bgClass = "bg-blue-500/10 dark:bg-blue-950/20";

    const borderClass = isSelectedLine
      ? "border-l-4 border-blue-500 bg-blue-500/15 dark:bg-blue-950/30"
      : highestSev === "critical" || highestSev === "high"
      ? "border-l-2 border-red-500"
      : highestSev === "medium"
      ? "border-l-2 border-amber-500"
      : "border-l-2 border-blue-500";

    return `${bgClass} ${borderClass}`;
  };

  const scores = submission.severity_scores || { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const computedScore = Math.max(0, Math.min(100, 100 - (scores.critical * 30) - (scores.high * 15) - (scores.medium * 8) - (scores.low * 3) - (scores.info * 1)));
  const healthScore = (submission.health_score !== undefined && submission.health_score !== null) ? submission.health_score : computedScore;
  const totalFindings = findings.length;
  const hasSevereIssues = findings.some((f) => ["critical", "high", "medium"].includes(f.severity.toLowerCase()));

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Portal Header */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm">
        <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/10">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-white">Developer Review Portal</CardTitle>
                  <Badge variant="outline" className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {submission.language.toUpperCase()}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500 mt-0.5 font-mono">
                  Scan ID: {submission.id}
                </CardDescription>
              </div>
            </div>

            {/* Code Health Score Display & Report Download Buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <Activity className={`h-5 w-5 ${healthScore > 80 ? 'text-emerald-500' : healthScore > 50 ? 'text-amber-500' : 'text-red-500'}`} />
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Health Score</span>
                  <span className={`text-sm font-extrabold ${healthScore > 80 ? 'text-emerald-600 dark:text-emerald-400' : healthScore > 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                    {healthScore} / 100
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={downloadPdf}
                className="rounded-xl border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 font-semibold h-9 px-3 text-xs"
                title="Export report as PDF document"
              >
                <FileDown className="mr-1.5 h-3.5 w-3.5 text-blue-500" />
                PDF
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={downloadMarkdown}
                className="rounded-xl border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 font-semibold h-9 px-3 text-xs"
                title="Export report as Markdown"
              >
                <FileText className="mr-1.5 h-3.5 w-3.5 text-indigo-500" />
                Markdown
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={downloadJson}
                className="rounded-xl border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 font-semibold h-9 px-3 text-xs"
                title="Export raw JSON findings report"
              >
                <FileCode className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                JSON
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Navigation Tabs Bar */}
        <div className="px-6 py-3 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800/60 flex flex-wrap gap-2">
          <Button
            variant={activePortalTab === "findings" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActivePortalTab("findings")}
            className={`rounded-xl font-bold text-xs ${activePortalTab === "findings" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "text-slate-600 dark:text-slate-300"}`}
          >
            <FileCode className="mr-1.5 h-4 w-4" />
            Findings &amp; Remediation ({totalFindings})
          </Button>

          <Button
            variant={activePortalTab === "pr_summary" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActivePortalTab("pr_summary")}
            className={`rounded-xl font-bold text-xs ${activePortalTab === "pr_summary" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "text-slate-600 dark:text-slate-300"}`}
          >
            <FileText className="mr-1.5 h-4 w-4" />
            PR Review Summary
          </Button>

          <Button
            variant={activePortalTab === "assistant" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActivePortalTab("assistant")}
            className={`rounded-xl font-bold text-xs ${activePortalTab === "assistant" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "text-slate-600 dark:text-slate-300"}`}
          >
            <MessageSquare className="mr-1.5 h-4 w-4" />
            Conversational Code Assistant (RAG)
          </Button>
        </div>

        {/* Prominent OWASP Security Impact Header Row (If OWASP issues found) */}
        {owaspCategoriesFound.length > 0 && (
          <div className="p-4 bg-purple-950/10 border-b border-purple-200/40 dark:border-purple-900/30 px-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider">
                OWASP Security Standards Flagged ({owaspCategoriesFound.length}):
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {owaspCategoriesFound.map((cat, idx) => (
                <Badge
                  key={idx}
                  className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 font-mono text-[11px] px-2.5 py-0.5"
                >
                  🛡️ {cat}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Main Tab Content */}
      {activePortalTab === "findings" && (
        <div className="space-y-6">
          {/* Two-Column Explorer Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            {/* Left column: Findings List */}
            {totalFindings === 0 ? (
              <Card className="lg:col-span-2 border border-emerald-100 dark:border-emerald-950/40 bg-emerald-50/5 dark:bg-emerald-950/5 shadow-lg rounded-2xl p-8 flex flex-col items-center justify-center text-center h-[680px] gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 shadow-md">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-3">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">No issues detected</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
                    Your code passed all syntax, security vulnerability, and code quality checks cleanly.
                  </p>
                </div>
              </Card>
            ) : (
              <Card className="lg:col-span-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden h-[680px] flex flex-col">
                <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/60 space-y-3 flex-shrink-0">
                  {/* Category Filter Chips */}
                  <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg text-[10px] sm:text-[11px] font-semibold flex-wrap gap-1">
                    <button
                      onClick={() => setTypeFilter("all")}
                      className={`flex-1 py-1 px-2 rounded-md transition-all ${typeFilter === "all" ? "bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400" : "text-slate-500"}`}
                    >
                      All ({findings.length})
                    </button>
                    <button
                      onClick={() => setTypeFilter("security")}
                      className={`flex-1 py-1 px-2 rounded-md transition-all ${typeFilter === "security" ? "bg-white dark:bg-slate-900 shadow text-purple-600 dark:text-purple-400" : "text-slate-500"}`}
                    >
                      Security ({findings.filter((f) => f.agent_source === "security_vulnerability").length})
                    </button>
                    <button
                      onClick={() => setTypeFilter("owasp")}
                      className={`flex-1 py-1 px-2 rounded-md transition-all ${typeFilter === "owasp" ? "bg-white dark:bg-slate-900 shadow text-indigo-600 dark:text-indigo-400" : "text-slate-500"}`}
                    >
                      OWASP Top 10 ({findings.filter((f) => Boolean(f.owasp_category)).length})
                    </button>
                    <button
                      onClick={() => setTypeFilter("quality")}
                      className={`flex-1 py-1 px-2 rounded-md transition-all ${typeFilter === "quality" ? "bg-white dark:bg-slate-900 shadow text-amber-600 dark:text-amber-500" : "text-slate-500"}`}
                    >
                      Quality ({findings.filter((f) => f.agent_source === "code_analysis").length})
                    </button>
                  </div>

                  {/* Severity filter row */}
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      variant={severityFilter === "all" ? "default" : "outline"}
                      size="xs"
                      onClick={() => setSeverityFilter("all")}
                      className="text-[10px] font-bold h-6 rounded-md"
                    >
                      All
                    </Button>
                    <Button
                      variant={severityFilter === "critical" ? "destructive" : "outline"}
                      size="xs"
                      onClick={() => setSeverityFilter("critical")}
                      className="text-[10px] font-bold h-6 rounded-md"
                    >
                      Critical ({scores.critical})
                    </Button>
                    <Button
                      variant={severityFilter === "high" ? "destructive" : "outline"}
                      size="xs"
                      onClick={() => setSeverityFilter("high")}
                      className="text-[10px] font-bold h-6 rounded-md"
                    >
                      High ({scores.high})
                    </Button>
                    <Button
                      variant={severityFilter === "medium" ? "default" : "outline"}
                      size="xs"
                      onClick={() => setSeverityFilter("medium")}
                      className="text-[10px] font-bold h-6 rounded-md"
                    >
                      Medium ({scores.medium})
                    </Button>
                    <Button
                      variant={severityFilter === "low" ? "default" : "outline"}
                      size="xs"
                      onClick={() => setSeverityFilter("low")}
                      className="text-[10px] font-bold h-6 rounded-md"
                    >
                      Low ({scores.low})
                    </Button>
                  </div>
                </CardHeader>

                {/* Findings List */}
                <CardContent className="p-0 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800/40">
                  {filteredFindings.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      No matching findings discovered.
                    </div>
                  ) : (
                    filteredFindings.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFindingId(f.id)}
                        className={`w-full text-left p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all flex flex-col gap-2 ${
                          selectedFindingId === f.id ? "bg-blue-50/30 dark:bg-blue-950/25 border-r-4 border-blue-500" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[11px] font-mono text-slate-500 font-semibold">
                            {f.line_number != null ? `Line ${f.line_number}` : "Global Issue"}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {getCategoryFlag(f)}
                            {getSeverityBadge(f.severity)}
                          </div>
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{f.title}</h4>
                        {f.owasp_category && (
                          <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">
                            🛡️ {f.owasp_category}
                          </span>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{f.description}</p>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            {/* Right column: Interactive Source Code Viewer */}
            <Card className="lg:col-span-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden h-[680px] flex flex-col">
              <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex-shrink-0 flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">Interactive Source Code Explorer</CardTitle>
                <span className="text-[11px] text-slate-500">Click highlighted lines to view remediation</span>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-auto bg-slate-950 text-slate-300">
                <pre className="font-mono text-xs leading-relaxed py-4 select-none">
                  {submission.source_code.split("\n").map((line, idx) => {
                    const lineNum = idx + 1;
                    const highlightClass = getLineHighlightClass(lineNum);
                    const lineFindings = findingsByLine[lineNum] || [];
                    const hasLineFindings = lineFindings.length > 0;
                    const topFinding = lineFindings[0];

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (hasLineFindings) {
                            setSelectedFindingId(lineFindings[0].id);
                          }
                        }}
                        className={`flex items-center px-4 transition-all duration-150 ${highlightClass} ${
                          hasLineFindings ? "cursor-pointer hover:bg-slate-900/50" : ""
                        }`}
                      >
                        <span className="w-8 text-right pr-3 select-none text-slate-600 font-mono text-[10px] border-r border-slate-900 mr-4">
                          {lineNum}
                        </span>
                        <span className="flex-1 whitespace-pre font-mono text-[11px] select-text">
                          {line || " "}
                        </span>
                        {hasLineFindings && topFinding && (
                          <span className="ml-2 flex items-center gap-1">
                            {getSeverityBadge(topFinding.severity)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </pre>
              </CardContent>
            </Card>
          </div>

          {/* Selected Finding Remediation & Explanation Card */}
          {selectedFinding && (
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
              <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800/60 bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-950 dark:to-slate-900 flex flex-col sm:flex-row justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getSeverityBadge(selectedFinding.severity)}
                    {getCategoryFlag(selectedFinding)}
                    {selectedFinding.cwe_id && (
                      <Badge variant="secondary" className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 text-[10px]">
                        {selectedFinding.cwe_id}
                      </Badge>
                    )}
                    {selectedFinding.owasp_category && (
                      <Badge className="font-semibold bg-purple-600 text-white text-[10px] px-2.5 py-0.5">
                        🛡️ {selectedFinding.owasp_category}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">{selectedFinding.title}</CardTitle>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {selectedFinding.line_number != null ? `Line ${selectedFinding.line_number}` : "Global Scope"}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAssistantQuery(`Explain ${selectedFinding.title} (${selectedFinding.cwe_id || selectedFinding.owasp_category || ""}) and how to fix it.`);
                      setActivePortalTab("assistant");
                    }}
                    className="text-xs font-semibold border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 rounded-xl"
                  >
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                    Ask Assistant About Fix
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Finding Description */}
                <div>
                  <Label className="text-xs uppercase font-bold text-slate-400 tracking-wider">Analysis Finding &amp; Impact</Label>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mt-1">{selectedFinding.description}</p>
                </div>

                {/* Remediation Agent Section */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      <Label className="text-xs uppercase font-extrabold text-blue-600 dark:text-blue-400 tracking-wider">
                        Remediation Agent Recommendations &amp; Corrected Code
                      </Label>
                    </div>
                  </div>

                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedFinding.remediation_summary || "Apply parameterized queries and modular refactoring according to standard security rules."}
                  </p>

                  {/* Corrected Code Block */}
                  {selectedFinding.corrected_code && (
                    <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2 overflow-hidden shadow-inner">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Remediated &amp; Corrected Code Snippet
                        </span>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => copyToClipboard(selectedFinding.corrected_code || "")}
                          className="text-[10px] text-slate-400 hover:text-white rounded-lg px-2 py-1"
                        >
                          {copiedCode ? <Check className="h-3 w-3 text-emerald-400 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                          {copiedCode ? "Copied!" : "Copy Code"}
                        </Button>
                      </div>
                      <pre className="font-mono text-xs leading-relaxed text-emerald-300 overflow-x-auto whitespace-pre">
                        {selectedFinding.corrected_code}
                      </pre>
                    </div>
                  )}

                  {/* Best Practice Explanation */}
                  {selectedFinding.best_practice_explanation && (
                    <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-1">
                      <span className="font-bold text-blue-700 dark:text-blue-400 block uppercase text-[10px] tracking-wider">
                        Grounded Best Practice Standard:
                      </span>
                      <p className="leading-relaxed">{selectedFinding.best_practice_explanation}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* PR Review Summary Tab */}
      {activePortalTab === "pr_summary" && (
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/60">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {submission.pr_summary?.title || `Pull Request Review Summary: ${submission.language.toUpperCase()}`}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Generated by PR Summary Agent synthesizing Code Analysis, Security Vulnerabilities, and Remediation outputs.</p>
            </div>
            <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-100 dark:border-blue-900">
              <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Code Health Score</span>
                <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{healthScore} / 100</p>
              </div>
            </div>
          </div>

          {/* Executive Overview */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Executive Overview</h4>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {submission.pr_summary?.executive_overview || "Automated code review completed cleanly across multi-agent analysis layers."}
            </div>
          </div>

          {/* Severity Matrix */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Severity Breakdown Matrix</h4>
            <div className="grid grid-cols-5 gap-3 text-center">
              <div className="p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-red-500">Critical</span>
                <p className="text-xl font-extrabold text-red-600 dark:text-red-400">{scores.critical}</p>
              </div>
              <div className="p-3 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-orange-500">High</span>
                <p className="text-xl font-extrabold text-orange-500 dark:text-orange-400">{scores.high}</p>
              </div>
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-amber-500">Medium</span>
                <p className="text-xl font-extrabold text-amber-500 dark:text-amber-400">{scores.medium}</p>
              </div>
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-blue-500">Low</span>
                <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400">{scores.low}</p>
              </div>
              <div className="p-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500">Info</span>
                <p className="text-xl font-extrabold text-slate-600 dark:text-slate-400">{scores.info}</p>
              </div>
            </div>
          </div>

          {/* OWASP Standard Mapping */}
          {submission.pr_summary?.owasp_mapping && submission.pr_summary.owasp_mapping.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">OWASP Top 10 Security Standard Mapping</h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold uppercase text-slate-500">
                      <th className="p-3">OWASP Category</th>
                      <th className="p-3">Flagged Finding</th>
                      <th className="p-3">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {submission.pr_summary.owasp_mapping.map((owasp, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                        <td className="p-3 font-mono font-bold text-purple-600 dark:text-purple-400">🛡️ {owasp.category}</td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{owasp.finding_title}</td>
                        <td className="p-3">{getSeverityBadge(owasp.risk_level)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Prioritized Fix Roadmap */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Prioritized Action &amp; Fix Roadmap</h4>
            {submission.pr_summary?.prioritized_fix_list && submission.pr_summary.prioritized_fix_list.length > 0 ? (
              <div className="space-y-2">
                {submission.pr_summary.prioritized_fix_list.map((fix, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs flex-shrink-0">
                      {fix.priority}
                    </span>
                    <div className="space-y-1">
                      <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">{fix.issue_title}</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{fix.action_item}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No priority fixes required. Code meets secure coding criteria.</p>
            )}
          </div>
        </Card>
      )}

      {/* Conversational Assistant Tab */}
      {activePortalTab === "assistant" && (
        <ConversationalAssistant
          submissionId={submission.id}
          initialFindingQuery={assistantQuery}
        />
      )}
    </div>
  );
}
