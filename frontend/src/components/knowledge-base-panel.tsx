"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Database, Loader2, RefreshCw, Search } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getKnowledgeBaseStatus,
  indexKnowledgeBase,
  KnowledgeBaseStatus,
  queryKnowledgeBase,
  RetrievedChunk,
} from "@/lib/api";

export function KnowledgeBasePanel() {
  const [status, setStatus] = useState<KnowledgeBaseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIndexing, setIsIndexing] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RetrievedChunk[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getKnowledgeBaseStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load knowledge base status");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleIndex = async () => {
    setIsIndexing(true);
    setError(null);
    try {
      await indexKnowledgeBase();
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Indexing failed");
    } finally {
      setIsIndexing(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const data = await queryKnowledgeBase(query);
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Secure Coding Knowledge Base
            </CardTitle>
            <CardDescription>
              OWASP guidelines and best practices indexed via RAG (ChromaDB + BGE embeddings)
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleIndex} disabled={isIndexing}>
            {isIndexing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="mr-1 h-4 w-4" />
                {status?.is_indexed ? "Re-index" : "Index"}
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading status...
          </div>
        ) : status ? (
          <div className="flex flex-wrap gap-3">
            <Badge variant={status.is_indexed ? "default" : "secondary"}>
              {status.is_indexed ? "Indexed" : "Not Indexed"}
            </Badge>
            <Badge variant="outline">{status.total_documents} documents</Badge>
            <Badge variant="outline">{status.total_chunks} chunks</Badge>
          </div>
        ) : null}

        {status?.documents && status.documents.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Indexed Documents</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {status.documents.map((doc) => (
                <div key={doc.source_file} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.category} · {doc.chunk_count} chunks
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Test RAG Query</p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. How to prevent SQL injection in Python?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isSearching || !status?.is_indexed}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((chunk, i) => (
              <div key={i} className="rounded-md border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline">{chunk.source}</Badge>
                  <Badge variant="secondary">{chunk.category}</Badge>
                  {chunk.score != null && (
                    <span className="text-xs text-muted-foreground">score: {chunk.score.toFixed(3)}</span>
                  )}
                </div>
                <p className="line-clamp-4 text-sm text-muted-foreground">{chunk.content}</p>
              </div>
            ))}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
