"use client";

import { useState } from "react";
import { Shield, Code2, Bot } from "lucide-react";

import { CodeSubmissionForm, SubmissionResult } from "@/components/code-submission-form";
import { KnowledgeBasePanel } from "@/components/knowledge-base-panel";
import { Badge } from "@/components/ui/badge";
import { Submission } from "@/lib/api";

export default function Home() {
  const [latestSubmission, setLatestSubmission] = useState<Submission | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">AI Code Review Agent</h1>
              <p className="text-xs text-muted-foreground">Security Analysis &amp; Quality Review</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Badge variant="outline" className="gap-1">
              <Code2 className="h-3 w-3" />
              Milestone 1
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Bot className="h-3 w-3" />
              Multi-Agent Pipeline
            </Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <section className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Developer Portal</h2>
          <p className="max-w-2xl text-muted-foreground">
            Submit Python or Java source code for automated syntax validation. The secure coding knowledge base
            is indexed with RAG for grounded guidance in upcoming milestones.
          </p>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <CodeSubmissionForm onSubmissionComplete={setLatestSubmission} />
          {latestSubmission ? (
            <SubmissionResult submission={latestSubmission} />
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed p-12 text-center text-muted-foreground">
              <div>
                <Code2 className="mx-auto mb-3 h-8 w-8 opacity-50" />
                <p className="text-sm">Submit code to see validation results here</p>
              </div>
            </div>
          )}
        </div>

        <KnowledgeBasePanel />
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        AI Code Review &amp; Security Analysis Agent · FastAPI + LangGraph + ChromaDB + Next.js
      </footer>
    </div>
  );
}
