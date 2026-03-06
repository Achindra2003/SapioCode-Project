import { AuthResponse, RegisterRequest, LoginRequest, UserProgress, ProgressCompleteRequest } from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:8000";

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data: Record<string, unknown>;
  try {
    data = await response.json();
  } catch {
    throw new Error(response.ok ? "Empty response" : `Server error (${response.status})`);
  }

  if (!response.ok) {
    throw new Error((data.detail as string) || "Something went wrong");
  }

  return data as T;
}

export const authApi = {
  register: (data: RegisterRequest): Promise<AuthResponse> =>
    apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: LoginRequest): Promise<AuthResponse> =>
    apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const progressApi = {
  complete: (data: ProgressCompleteRequest): Promise<{ status: string }> =>
    apiRequest("/progress/complete", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getByUser: (userId: string): Promise<UserProgress[]> =>
    apiRequest(`/progress/${userId}`),

  getByTopic: (userId: string, topicId: string): Promise<UserProgress[]> =>
    apiRequest(`/progress/${userId}/topic/${topicId}`),

  getSkillTree: (userId: string): Promise<{
    user_id: string;
    class: { id: string; name: string; cohort_code: string } | null;
    nodes: Array<{
      id: string;
      title: string;
      description: string;
      difficulty: string;
      topic: string;
      order: number;
      status: "locked" | "in_progress" | "mastered";
      viva_score: number;
      attempts: number;
      test_cases_passed: number;
      test_cases_total: number;
    }>;
    total_problems: number;
    mastered_count: number;
  }> => apiRequest(`/progress/student/${userId}/skill-tree`),
};

export const sessionApi = {
  create: (userId: string): Promise<{ thread_id: string }> =>
    apiRequest("/sessions/create", {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }),

  get: (userId: string): Promise<{ thread_id: string; conversation_history: Array<{ role: string; content: string }> }> =>
    apiRequest(`/sessions/${userId}`),

  addMessage: (userId: string, role: "user" | "assistant", content: string): Promise<{ status: string }> =>
    apiRequest(`/sessions/${userId}/message`, {
      method: "PUT",
      body: JSON.stringify({ role, content }),
    }),

  clear: (userId: string): Promise<{ status: string }> =>
    apiRequest(`/sessions/${userId}/clear`, {
      method: "DELETE",
    }),

  getHistory: (userId: string): Promise<{ history: Array<{ role: string; content: string; timestamp?: string }> }> =>
    apiRequest(`/sessions/${userId}/history`),
};
