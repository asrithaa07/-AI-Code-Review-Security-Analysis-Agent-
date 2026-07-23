"use client";

import { useCallback, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Upload, Sparkles, AlertTriangle, FileCode, FileDown } from "lucide-react";

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
import { Language, Submission, submitPaste, submitUpload } from "@/lib/api";

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
                  className="min-h-[260px] font-mono text-sm bg-transparent border-0 resize-y focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-0"
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

export function SubmissionResult({ submission }: { submission: Submission }) {
  const containsSecurityIssues = submission.validation_errors && submission.validation_errors.length > 0;

  const downloadPdf = () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    window.open(`${API_URL}/api/v1/submissions/${submission.id}/pdf`, "_blank");
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm">
      <CardHeader className="space-y-3 p-6 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10">
              <FileCode className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Submission Result</CardTitle>
              <CardDescription className="text-sm text-slate-500 mt-0.5">
                ID: {submission.id.substring(0, 8)}... · {submission.language.toUpperCase()} · {submission.submission_type}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadPdf}
              className="rounded-xl border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 font-semibold text-xs py-1 h-8"
            >
              <FileDown className="mr-1.5 h-3.5 w-3.5 text-blue-500" />
              Download PDF
            </Button>
            {submission.is_valid_syntax ? (
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg px-2.5 py-1">
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Syntax OK
              </Badge>
            ) : (
              <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg px-2.5 py-1">
                <AlertCircle className="mr-1 h-3.5 w-3.5" />
                Errors Found
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {containsSecurityIssues && (
          <Alert variant="destructive" className="rounded-xl border border-red-200 dark:border-red-950 bg-red-50/50 dark:bg-red-950/20">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertTitle className="text-red-800 dark:text-red-400 font-bold">Detected Vulnerabilities &amp; Warnings</AlertTitle>
            <AlertDescription className="mt-3">
              <ul className="list-none space-y-3">
                {submission.validation_errors!.map((err, i) => (
                  <li key={i} className="text-sm text-slate-700 dark:text-slate-300 border-l-2 border-red-500 pl-3 py-0.5">
                    <span className="font-semibold text-red-600 dark:text-red-400 mr-2">
                      {err.line != null ? `Line ${err.line}` : "Warning"}:
                    </span>
                    {err.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {submission.is_valid_syntax && (
          <Alert className="rounded-xl border border-emerald-200 dark:border-emerald-950/80 bg-emerald-50/20 dark:bg-emerald-950/10">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <AlertTitle className="text-emerald-800 dark:text-emerald-400 font-bold">Ready for Deep Review</AlertTitle>
            <AlertDescription className="text-emerald-700 dark:text-slate-300 text-sm mt-1">
              Code passed initial syntax verification. Ready to process through our multi-agent vulnerability pipeline.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Submitted Code</Label>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-4 overflow-auto max-h-56">
            <pre className="font-mono text-xs text-slate-300 leading-relaxed">{submission.source_code}</pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
