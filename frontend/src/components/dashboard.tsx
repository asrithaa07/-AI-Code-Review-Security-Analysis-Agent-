"use client";

import React, { useEffect, useState } from "react";
import { getMySubmissions, Submission } from "@/lib/api";
import { 
  FileCode2, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ChevronRight,
  ShieldCheck,
  Code
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DashboardProps {
  onSelectSubmission: (submission: Submission) => void;
  refreshTrigger: number;
}

export function Dashboard({ onSelectSubmission, refreshTrigger }: DashboardProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMySubmissions(0, 100);
      setSubmissions(data.items);
      setTotalSubmissions(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [refreshTrigger]);

  // Compute stats locally from submissions list
  const pythonCount = submissions.filter(s => s.language === "python").length;
  const javaCount = submissions.filter(s => s.language === "java").length;
  const passCount = submissions.filter(s => s.is_valid_syntax).length;
  const passRate = submissions.length > 0 ? Math.round((passCount / submissions.length) * 100) : 0;
  
  const securityIssuesCount = submissions.reduce((acc, curr) => {
    return acc + (curr.findings?.filter(f => f.agent_source === "security_vulnerability").length || 0);
  }, 0);

  const codeSmellsCount = submissions.reduce((acc, curr) => {
    return acc + (curr.findings?.filter(f => f.agent_source === "code_analysis").length || 0);
  }, 0);

  const severeCount = submissions.reduce((acc, curr) => {
    return acc + (curr.findings?.filter(f => f.severity === "critical" || f.severity === "high").length || 0);
  }, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Banner & Refresh Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">User Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">Real-time code health summary and historical code reviews.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHistory} disabled={isLoading} className="rounded-xl font-semibold">
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Submissions */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-md rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Analyzed</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{totalSubmissions}</h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Terminal className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Security Vulnerabilities */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-md rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Security Vulnerabilities</p>
              <h3 className="text-3xl font-extrabold text-red-600 dark:text-red-400">{securityIssuesCount}</h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Code Smells */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-md rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Code Quality Smells</p>
              <h3 className="text-3xl font-extrabold text-amber-600 dark:text-amber-500">{codeSmellsCount}</h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-500 flex items-center justify-center">
              <Code className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Severe Findings */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-md rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Critical & High Vulnerabilities</p>
              <h3 className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">{severeCount}</h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review History Panel */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800/60 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Review History</CardTitle>
            <CardDescription className="text-sm mt-0.5 text-slate-500">Your historical code quality reports and submission runs.</CardDescription>
          </div>
          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-2.5 py-1">
            {submissions.length} Total Runs
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm font-semibold text-red-500">{error}</div>
          ) : submissions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              <ShieldCheck className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
              <p className="font-semibold text-base">No scan history found</p>
              <p className="text-sm mt-1">Submit your first code snippet or upload a file above to begin.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-950/20 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/60">
                    <th className="py-4 px-6">Scan ID</th>
                    <th className="py-4 px-6">Language</th>
                    <th className="py-4 px-6">Filename</th>
                    <th className="py-4 px-6">Submission Type</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Timestamp</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {submissions.map((sub) => {
                    const hasIssues = sub.validation_errors && sub.validation_errors.length > 0;
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-colors text-sm">
                        <td className="py-4 px-6 font-mono text-xs text-slate-500 dark:text-slate-400">
                          {sub.id.substring(0, 8)}...
                        </td>
                        <td className="py-4 px-6">
                          <Badge variant="outline" className="font-bold border-slate-200 dark:border-slate-800">
                            {sub.language === "python" ? "🐍 Python" : "☕ Java"}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">
                          {sub.filename || "pasted_snippet"}
                        </td>
                        <td className="py-4 px-6 capitalize text-slate-500 dark:text-slate-400">
                          {sub.submission_type}
                        </td>
                        <td className="py-4 px-6">
                          {sub.status === "pending" && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              Pending
                            </span>
                          )}
                          {sub.status === "analyzing" && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              Analyzing...
                            </span>
                          )}
                          {sub.status === "failed" && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Failed
                            </span>
                          )}
                          {sub.status === "completed" && (
                            <div className="flex flex-col gap-0.5">
                              {sub.findings && sub.findings.length > 0 ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  {sub.findings.length} findings
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Secure (0 issues)
                                </span>
                              )}
                              {sub.severity_scores && (
                                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                  Crit:{sub.severity_scores.critical} Hi:{sub.severity_scores.high} Med:{sub.severity_scores.medium} Lo:{sub.severity_scores.low}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-500 dark:text-slate-400">
                          {new Date(sub.created_at).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => onSelectSubmission(sub)}
                            className="font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl"
                          >
                            View Result
                            <ChevronRight className="ml-1 h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
