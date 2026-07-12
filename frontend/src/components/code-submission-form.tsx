"use client";

import { useCallback, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Upload } from "lucide-react";

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadSample = useCallback(() => {
    setSourceCode(language === "python" ? SAMPLE_PYTHON : SAMPLE_JAVA);
  }, [language]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Code for Review</CardTitle>
        <CardDescription>
          Paste source code or upload a Python (.py) or Java (.java) file. Syntax is validated on submission.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="paste" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="paste">Paste Code</TabsTrigger>
            <TabsTrigger value="upload">Upload File</TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filename">Filename (optional)</Label>
                <Input
                  id="filename"
                  placeholder={language === "python" ? "example.py" : "Example.java"}
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="source-code">Source Code</Label>
                <Button variant="ghost" size="sm" onClick={loadSample} type="button">
                  Load vulnerable sample
                </Button>
              </div>
              <Textarea
                id="source-code"
                placeholder="Paste your source code here..."
                className="min-h-[280px] font-mono text-sm"
                value={sourceCode}
                onChange={(e) => setSourceCode(e.target.value)}
              />
            </div>

            <Button onClick={handlePasteSubmit} disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                "Submit Code"
              )}
            </Button>
          </TabsContent>

          <TabsContent value="upload" className="mt-4 space-y-4">
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 transition-colors hover:border-muted-foreground/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFileUpload(file);
              }}
            >
              <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
              <p className="mb-2 text-sm font-medium">Drag & drop a source file here</p>
              <p className="mb-4 text-xs text-muted-foreground">Supports .py and .java files (max 500KB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".py,.java"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Browse Files"
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export function SubmissionResult({ submission }: { submission: Submission }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Submission Result</CardTitle>
          {submission.is_valid_syntax ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-600">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Valid Syntax
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="mr-1 h-3 w-3" />
              Syntax Errors
            </Badge>
          )}
        </div>
        <CardDescription>
          ID: {submission.id} · {submission.language.toUpperCase()} · {submission.submission_type}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {submission.validation_errors && submission.validation_errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Validation Errors</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {submission.validation_errors.map((err, i) => (
                  <li key={i} className="text-sm">
                    {err.line != null && `Line ${err.line}`}
                    {err.column != null && `, Col ${err.column}`}: {err.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {submission.is_valid_syntax && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Ready for Analysis</AlertTitle>
            <AlertDescription>
              Code passed syntax validation. Multi-agent analysis pipeline will run in Milestone 2.
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-md bg-muted p-4">
          <pre className="max-h-48 overflow-auto font-mono text-xs">{submission.source_code}</pre>
        </div>
      </CardContent>
    </Card>
  );
}
