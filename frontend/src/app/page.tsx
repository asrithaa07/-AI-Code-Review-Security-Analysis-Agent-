"use client";

import { useState } from "react";
import { Shield, Sparkles, Terminal, LayoutDashboard, LogIn, LogOut } from "lucide-react";

import { CodeSubmissionForm, SubmissionResult } from "@/components/code-submission-form";
import { KnowledgeBasePanel } from "@/components/knowledge-base-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Submission } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth-modal";
import { Dashboard } from "@/components/dashboard";

export default function Home() {
  const { user, logout } = useAuth();
  const [latestSubmission, setLatestSubmission] = useState<Submission | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<"console" | "dashboard">("console");
  const [dashboardRefresh, setDashboardRefresh] = useState(0);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSubmissionComplete = (submission: Submission) => {
    setLatestSubmission(submission);
    setDashboardRefresh((prev) => prev + 1); // increment refresh key
    setTimeout(() => {
      scrollToSection("results-section");
    }, 150);
  };

  const handleSelectHistorySubmission = (submission: Submission) => {
    setLatestSubmission(submission);
    setCurrentView("console");
    setTimeout(() => {
      scrollToSection("results-section");
    }, 150);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/85 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/10">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Spotlight AI</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Secure Code Analysis Hub</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => { setCurrentView("console"); setTimeout(() => scrollToSection("analysis-portal"), 50); }}
              className={`text-sm font-semibold transition-colors ${
                currentView === "console" 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
              }`}
            >
              Analysis Console
            </button>
            
            {user && (
              <button
                onClick={() => setCurrentView("dashboard")}
                className={`text-sm font-semibold flex items-center gap-1.5 transition-colors ${
                  currentView === "dashboard" 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                User Dashboard
              </button>
            )}

            <button
              onClick={() => { setCurrentView("console"); setTimeout(() => scrollToSection("knowledge-base"), 50); }}
              className="text-sm font-semibold text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors"
            >
              Secure Knowledge Base
            </button>
            
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />

            {user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs text-slate-400">Welcome,</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{user.username}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={logout}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300"
                >
                  <LogOut className="mr-1.5 h-4 w-4 text-red-500" />
                  Logout
                </Button>
              </div>
            ) : (
              <Button 
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/10"
              >
                <LogIn className="mr-1.5 h-4 w-4" />
                Login / Signup
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-24 bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-950 dark:to-slate-900 border-b border-slate-200/50 dark:border-slate-800/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.06),transparent_50%)]"></div>
        <div className="mx-auto max-w-7xl px-6 relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50">
            <Sparkles className="h-3.5 w-3.5" />
            RAG-Powered Security Analysis
          </div>
          <h2 className="mx-auto max-w-4xl text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
            Next-Gen Automated Code Quality &amp;{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
              Security Reviews
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
            Instantly validate Python and Java source code against secure coding guidelines, OWASP Top 10 vulnerabilities, and standard code smell patterns.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button
              onClick={() => { setCurrentView("console"); setTimeout(() => scrollToSection("analysis-portal"), 50); }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-500/20 px-8 py-6 rounded-xl transition-all hover:scale-[1.02]"
            >
              Analyze Code
            </Button>
            <Button
              variant="outline"
              onClick={() => { setCurrentView("console"); setTimeout(() => scrollToSection("knowledge-base"), 50); }}
              className="border-slate-300 dark:border-slate-700 font-semibold px-8 py-6 rounded-xl transition-all hover:scale-[1.02] bg-transparent"
            >
              Search Guidelines
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-6 py-12 space-y-16">
        
        {currentView === "console" ? (
          <>
            {/* Code Analysis Section */}
            <section id="analysis-portal" className="space-y-8 scroll-mt-24">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                  <Terminal className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Analysis Console</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Submit code snippets or upload files for syntax validation</p>
                </div>
              </div>

              <div className="space-y-10">
                <CodeSubmissionForm onSubmissionComplete={handleSubmissionComplete} />

                {latestSubmission && (
                  <div id="results-section" className="scroll-mt-24 animate-in fade-in slide-in-from-bottom-6 duration-500">
                    <SubmissionResult submission={latestSubmission} />
                  </div>
                )}
              </div>
            </section>

            {/* Knowledge Base Section */}
            <section id="knowledge-base" className="scroll-mt-24">
              <KnowledgeBasePanel />
            </section>
          </>
        ) : (
          <Dashboard 
            onSelectSubmission={handleSelectHistorySubmission} 
            refreshTrigger={dashboardRefresh} 
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white dark:border-slate-900 dark:bg-slate-950 py-12 text-center">
        <div className="mx-auto max-w-7xl px-6 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span className="font-bold text-slate-900 dark:text-white">Spotlight AI</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            High-performance code scanner integrated with a secure-coding RAG pipeline for FastAPI + LangGraph.
          </p>
          <div className="pt-4 text-xs text-slate-400 dark:text-slate-600 font-medium">
            &copy; {new Date().getFullYear()} Spotlight AI. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
