"use client";

import React, { useState } from "react";
import { X, Shield, Loader2, Lock, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, signup } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (tab === "login") {
        await login(username, password);
      } else {
        await signup(username, password);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Banner */}
        <div className="p-6 pb-4 text-center border-b border-slate-100 dark:border-slate-800/60">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/10 mb-3">
            <Shield className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {tab === "login" ? "Welcome back!" : "Create your account"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Access secure code analysis dashboard, review history, and PDF reports.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 dark:border-slate-800/60 p-1.5 bg-slate-50 dark:bg-slate-950/40">
          <button
            onClick={() => { setTab("login"); setError(null); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
              tab === "login"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => { setTab("signup"); setError(null); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
              tab === "signup"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auth-username" className="text-xs font-bold uppercase tracking-wider text-slate-500">Username</Label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                id="auth-username"
                type="text"
                placeholder="developer"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 rounded-xl border-slate-200 dark:border-slate-800 bg-transparent py-5"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-password" className="text-xs font-bold uppercase tracking-wider text-slate-500">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                id="auth-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 rounded-xl border-slate-200 dark:border-slate-800 bg-transparent py-5"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-950 rounded-xl">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-5 rounded-xl shadow-lg shadow-blue-500/10 transition-all mt-6"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : tab === "login" ? (
              "Log In"
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
