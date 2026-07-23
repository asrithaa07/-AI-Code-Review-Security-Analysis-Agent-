"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Loader2, Upload, Sparkles, AlertTriangle, FileCode, FileDown, ShieldAlert, Info, XCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Language, Submission, Finding, submitPaste, submitUpload, getSubmissionDetails } from "@/lib/api";

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
  const [language, setLanguage] = useState<Language>("python");
  const [sourceCode, setSourceCode] = useState("");
  const [filename, setFilename] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        language,
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

  const loadSample = useCallback(() => {
    setSourceCode(language === "python" ? SAMPLE_PYTHON : SAMPLE_JAVA);
  }, [language]);

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
              Choose language, paste source code or drag &amp; drop a file to run syntax check.
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="language" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Language</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                  <SelectTrigger id="language" className="rounded-xl border-slate-200 dark:border-slate-800 bg-transparent py-5">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl dark:bg-slate-900 dark:border-slate-800">
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filename" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Filename (optional)</Label>
                <Input
                  id="filename"
                  placeholder={language === "python" ? "example.py" : "Example.java"}
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-transparent py-5 focus-visible:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="source-code" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Source Code</Label>
                <Button variant="ghost" size="sm" onClick={loadSample} type="button" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Load Sample Code
                </Button>
              </div>
              <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1">
                <Textarea
                  id="source-code"
                  placeholder="Paste your source code here..."
                  className="w-full min-h-[380px] font-mono text-sm bg-transparent border-0 resize-y focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-0"
                  value={sourceCode}
                  onChange={(e) => setSourceCode(e.target.value)}
                />
              </div>
            </div>

            <Button 
              onClick={handlePasteSubmit} 
              disabled={isSubmitting} 
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/10 py-5 rounded-xl transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                "Submit Code Analysis"
              )}
            </Button>
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
  const [typeFilter, setTypeFilter] = useState<string>("all"); // all, security, quality
  const [isPolling, setIsPolling] = useState(false);

  // Sync state if initialSubmission changes from parent
  useEffect(() => {
    setSubmission(initialSubmission);
    setSelectedFindingId(null);
  }, [initialSubmission]);

  // Polling logic for status pending/analyzing
  useEffect(() => {
    if (submission.status === "pending" || submission.status === "analyzing") {
      setIsPolling(true);
      const interval = setInterval(async () => {
        try {
          const updated = await getSubmissionDetails(submission.id);
          setSubmission(updated);
          if (updated.status === "completed" || updated.status === "failed") {
            setIsPolling(false);
            clearInterval(interval);
          }
        } catch (e) {
          console.error("Failed to poll submission status:", e);
        }
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setIsPolling(false);
    }
  }, [submission.id, submission.status]);

  const downloadPdf = () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    window.open(`${API_URL}/api/v1/submissions/${submission.id}/pdf`, "_blank");
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
          Running LangGraph Orchestrator pipeline: parallel execution of Code Analysis and Security Vulnerability agents...
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

  // Filter findings based on user controls
  const filteredFindings = findings.filter(f => {
    const matchesSeverity = severityFilter === "all" || f.severity.toLowerCase() === severityFilter.toLowerCase();
    const matchesType = typeFilter === "all" ||
      (typeFilter === "security" && f.agent_source === "security_vulnerability") ||
      (typeFilter === "quality" && f.agent_source === "code_analysis");
    return matchesSeverity && matchesType;
  });

  const selectedFinding = findings.find(f => f.id === selectedFindingId);

  // Group findings by line number for inline code annotations
  const findingsByLine: Record<number, Finding[]> = {};
  findings.forEach(f => {
    if (f.line_number != null) {
      if (!findingsByLine[f.line_number]) {
        findingsByLine[f.line_number] = [];
      }
      findingsByLine[f.line_number].push(f);
    }
  });

  const getSeverityBadge = (sev: string) => {
    const s = sev.toLowerCase();
    switch (s) {
      case "critical":
        return <Badge className="bg-red-600 hover:bg-red-700 text-white font-semibold">Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">High</Badge>;
      case "medium":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-semibold">Medium</Badge>;
      case "low":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-semibold">Low</Badge>;
      default:
        return <Badge className="bg-slate-500 hover:bg-slate-600 text-white font-semibold">Info</Badge>;
    }
  };

  const getLineHighlightClass = (lineNumber: number) => {
    const lineFindings = findingsByLine[lineNumber] || [];
    if (lineFindings.length === 0) return "";

    const isSelectedLine = lineFindings.some(f => f.id === selectedFindingId);

    // Find highest severity on the line
    let highestSev = "info";
    const order = ["critical", "high", "medium", "low", "info"];
    for (const s of order) {
      if (lineFindings.some(f => f.severity.toLowerCase() === s)) {
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
  const totalFindings = findings.length;

  return (
    <div className="space-y-6">
      {/* Header Results Summary */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm">
        <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
                <FileCode className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Analysis Result</CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5 font-mono">
                  ID: {submission.id}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadPdf}
                className="rounded-xl border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 font-semibold h-9"
              >
                <FileDown className="mr-1.5 h-4 w-4 text-blue-500" />
                Download PDF Report
              </Button>
              {totalFindings === 0 ? (
                <Badge className="bg-emerald-500 text-white font-semibold rounded-lg px-2.5 py-1.5 gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Code Clean
                </Badge>
              ) : (
                <Badge className="bg-red-500 text-white font-semibold rounded-lg px-2.5 py-1.5 gap-1">
                  <ShieldAlert className="h-4 w-4" />
                  {totalFindings} Issues Flagged
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 bg-slate-50/50 dark:bg-slate-950/20">
          {/* Severity Score Count Row */}
          <div className="grid grid-cols-5 gap-3 text-center">
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Critical</span>
              <p className="text-2xl font-extrabold text-red-600 dark:text-red-500 mt-0.5">{scores.critical}</p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-orange-500 tracking-wider">High</span>
              <p className="text-2xl font-extrabold text-orange-500 dark:text-orange-400 mt-0.5">{scores.high}</p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Medium</span>
              <p className="text-2xl font-extrabold text-amber-500 dark:text-amber-400 mt-0.5">{scores.medium}</p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">Low</span>
              <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">{scores.low}</p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Info</span>
              <p className="text-2xl font-extrabold text-slate-600 dark:text-slate-400 mt-0.5">{scores.info}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-Column Explorer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Left column: Findings List */}
        <Card className="lg:col-span-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden h-[680px] flex flex-col">
          <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/60 space-y-3 flex-shrink-0">
            {/* Filter Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setTypeFilter("all")}
                className={`flex-1 py-1.5 rounded-md transition-all ${typeFilter === "all" ? "bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400" : "text-slate-500"}`}
              >
                All ({findings.length})
              </button>
              <button
                onClick={() => setTypeFilter("security")}
                className={`flex-1 py-1.5 rounded-md transition-all ${typeFilter === "security" ? "bg-white dark:bg-slate-900 shadow text-red-600 dark:text-red-400" : "text-slate-500"}`}
              >
                Security ({findings.filter(f => f.agent_source === "security_vulnerability").length})
              </button>
              <button
                onClick={() => setTypeFilter("quality")}
                className={`flex-1 py-1.5 rounded-md transition-all ${typeFilter === "quality" ? "bg-white dark:bg-slate-900 shadow text-amber-600 dark:text-amber-500" : "text-slate-500"}`}
              >
                Quality ({findings.filter(f => f.agent_source === "code_analysis").length})
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
                Critical
              </Button>
              <Button
                variant={severityFilter === "high" ? "destructive" : "outline"}
                size="xs"
                onClick={() => setSeverityFilter("high")}
                className="text-[10px] font-bold h-6 rounded-md"
              >
                High
              </Button>
              <Button
                variant={severityFilter === "medium" ? "default" : "outline"}
                size="xs"
                onClick={() => setSeverityFilter("medium")}
                className="text-[10px] font-bold h-6 rounded-md"
              >
                Medium
              </Button>
              <Button
                variant={severityFilter === "low" ? "default" : "outline"}
                size="xs"
                onClick={() => setSeverityFilter("low")}
                className="text-[10px] font-bold h-6 rounded-md"
              >
                Low
              </Button>
              <Button
                variant={severityFilter === "info" ? "default" : "outline"}
                size="xs"
                onClick={() => setSeverityFilter("info")}
                className="text-[10px] font-bold h-6 rounded-md"
              >
                Info
              </Button>
            </div>
          </CardHeader>
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
                  className={`w-full text-left p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all flex flex-col gap-1.5 ${
                    selectedFindingId === f.id ? "bg-blue-50/30 dark:bg-blue-950/25 border-r-2 border-blue-500" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-500 font-semibold">
                      {f.line_number != null ? `Line ${f.line_number}` : "Global Issue"}
                    </span>
                    {getSeverityBadge(f.severity)}
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{f.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{f.description}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>
 
        {/* Right column: Interactive Code Viewer */}
        <Card className="lg:col-span-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden h-[680px] flex flex-col">
          <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex-shrink-0">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">Interactive Source Code Explorer</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto bg-slate-950 text-slate-300">
            <pre className="font-mono text-xs leading-relaxed py-4 select-none">
              {submission.source_code.split("\n").map((line, idx) => {
                const lineNum = idx + 1;
                const highlightClass = getLineHighlightClass(lineNum);
                const lineFindings = findingsByLine[lineNum] || [];
                const hasLineFindings = lineFindings.length > 0;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (hasLineFindings) {
                        setSelectedFindingId(lineFindings[0].id);
                      }
                    }}
                    className={`flex items-start px-4 transition-all duration-150 ${highlightClass} ${
                      hasLineFindings ? "cursor-pointer hover:bg-slate-900/50" : ""
                    }`}
                  >
                    <span className="w-8 text-right pr-3 select-none text-slate-600 font-mono text-[10px] border-r border-slate-900 mr-4">
                      {lineNum}
                    </span>
                    <span className="flex-1 whitespace-pre font-mono text-[11px] select-text">
                      {line || " "}
                    </span>
                    {hasLineFindings && (
                      <span className="ml-2 h-4 w-4 rounded-full flex items-center justify-center bg-red-500/20 text-red-500 text-[10px] font-extrabold shadow-sm animate-pulse">
                        !
                      </span>
                    )}
                  </div>
                );
              })}
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* Selected Finding Detail Viewer */}
      {selectedFinding && (
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col sm:flex-row justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                {getSeverityBadge(selectedFinding.severity)}
                <Badge variant="outline" className="font-semibold text-slate-500 dark:text-slate-400 capitalize">
                  {selectedFinding.agent_source === "security_vulnerability" ? "🛡️ Security Vulnerability" : "⚙️ Code Quality Smell"}
                </Badge>
                {selectedFinding.cwe_id && (
                  <Badge variant="secondary" className="font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800">
                    {selectedFinding.cwe_id}
                  </Badge>
                )}
                {selectedFinding.owasp_category && (
                  <Badge variant="secondary" className="font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800">
                    {selectedFinding.owasp_category}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">{selectedFinding.title}</CardTitle>
            </div>
            <div className="text-sm font-mono font-bold text-slate-500 text-right sm:self-center">
              {selectedFinding.line_number != null ? `Line: ${selectedFinding.line_number}` : "Global Scope"}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label className="text-xs uppercase font-bold text-slate-400 tracking-wider">Analysis Findings & Impact</Label>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mt-1">{selectedFinding.description}</p>
            </div>
            {/* Standard Category */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
              <div>
                <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Category Identifier</Label>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 capitalize">
                  {selectedFinding.category.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Detector Agent</Label>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 capitalize">
                  {selectedFinding.agent_source.replace(/_/g, " ")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
