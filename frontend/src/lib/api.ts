const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Language = "python" | "java";

export interface ValidationError {
  line: number | null;
  column: number | null;
  message: string;
}

export interface Submission {
  id: string;
  language: Language;
  source_code: string;
  filename: string | null;
  submission_type: "paste" | "upload";
  is_valid_syntax: boolean;
  validation_errors: ValidationError[] | null;
  status: "pending" | "analyzing" | "completed" | "failed";
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  username: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface KnowledgeBaseStatus {
  is_indexed: boolean;
  total_documents: number;
  total_chunks: number;
  collection_name: string;
  documents: Array<{
    title: string;
    source_file: string;
    category: string;
    chunk_count: number;
    indexed_at: string | null;
  }>;
}

export interface RetrievedChunk {
  content: string;
  source: string;
  category: string;
  score: number | null;
}

// Utility to construct headers, automatically appending JWT token
function getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("spotlight_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function loginUser(data: any): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<AuthResponse>(response);
}

export async function signupUser(data: any): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/v1/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<AuthResponse>(response);
}

export async function getMe(): Promise<User> {
  const response = await fetch(`${API_URL}/api/v1/auth/me`, {
    headers: getHeaders(),
  });
  return handleResponse<User>(response);
}

export async function submitPaste(data: {
  source_code: string;
  language: Language;
  filename?: string;
}): Promise<Submission> {
  const response = await fetch(`${API_URL}/api/v1/submissions/paste`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  return handleResponse<Submission>(response);
}

export async function submitUpload(file: File): Promise<Submission> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_URL}/api/v1/submissions/upload`, {
    method: "POST",
    headers: getHeaders(), // Don't set Content-Type, fetch will set multipart/form-data boundary
    body: formData,
  });
  return handleResponse<Submission>(response);
}

export async function getMySubmissions(skip = 0, limit = 50): Promise<{ items: Submission[]; total: number }> {
  const response = await fetch(`${API_URL}/api/v1/submissions/my-submissions?skip=${skip}&limit=${limit}`, {
    headers: getHeaders(),
  });
  return handleResponse<{ items: Submission[]; total: number }>(response);
}

export async function getKnowledgeBaseStatus(): Promise<KnowledgeBaseStatus> {
  const response = await fetch(`${API_URL}/api/v1/knowledge-base/status`, {
    headers: getHeaders(),
  });
  return handleResponse<KnowledgeBaseStatus>(response);
}

export async function indexKnowledgeBase(): Promise<{ message: string; documents_indexed: number; chunks_created: number }> {
  const response = await fetch(`${API_URL}/api/v1/knowledge-base/index`, {
    method: "POST",
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function queryKnowledgeBase(query: string, topK = 4): Promise<{ query: string; results: RetrievedChunk[] }> {
  const response = await fetch(`${API_URL}/api/v1/knowledge-base/query`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ query, top_k: topK }),
  });
  return handleResponse(response);
}

export async function checkHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_URL}/health`);
  return handleResponse(response);
}
