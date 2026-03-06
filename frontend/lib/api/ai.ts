import { ChatRequest, ChatResponse } from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8003/api";

/** Timeout for AI requests (ms) — balanced: fast enough to fail, long enough for cold-starts */
const AI_TIMEOUT_MS = 45_000;
/** Max retries for transient (network / 502 / 503) failures */
const MAX_RETRIES = 2;

/**
 * The actual running backend is SapioCode Intelligence Engine v2.4.0
 * at sapiocode-unified/backend/ai/ with a SINGLE unified endpoint:
 *   POST /api/agent/chat  (mode: hint | chat | viva_start | viva_answer)
 *
 * All interactions (hints, chat, viva) go through this one endpoint.
 */

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Back off before retries (0, 2s, 4s)
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Retry on 502/503 (Render waking up or overloaded)
      if ((response.status === 502 || response.status === 503) && attempt < MAX_RETRIES) {
        lastError = new Error(`AI service temporarily unavailable (${response.status})`);
        continue;
      }

      let data: Record<string, unknown>;
      try {
        data = await response.json();
      } catch {
        throw new Error(response.ok ? "Empty response" : `AI service error (${response.status})`);
      }

      if (!response.ok) {
        throw new Error((data.detail as string) || (data.error as string) || "AI service error");
      }

      return data as T;
    } catch (err) {
      clearTimeout(timer);

      if (err instanceof DOMException && err.name === "AbortError") {
        lastError = new Error("AI request timed out. The service may be busy — please try again.");
        if (attempt < MAX_RETRIES) continue;
      } else if (err instanceof TypeError && /fetch|network/i.test(err.message)) {
        // Network-level failure (server unreachable, DNS, etc.)
        lastError = new Error("Cannot reach the AI service. Please check your connection and try again.");
        if (attempt < MAX_RETRIES) continue;
      } else {
        // Non-retryable error (400, 422, structured error responses, etc.)
        throw err;
      }
    }
  }

  throw lastError ?? new Error("AI service unavailable after retries");
}

// ── Unified agent/chat response shape from the backend ──
interface AgentChatResponse {
  thread_id: string;
  response: string;
  turn_count: number;
  tool_used: string;
  ast_metadata: Record<string, unknown>;
  teaching_focus: string;
  viva_data: Record<string, unknown> | null;
  generate_data: Record<string, unknown> | null;
}

function agentChat(body: {
  thread_id: string;
  mode: "hint" | "chat" | "viva_start" | "viva_answer" | "generate_problem" | "generate_tests";
  user_message: string;
  current_code?: string;
  compiler_output?: string;
  frustration_score?: number;
  problem_description?: string;
  failed_test_cases?: Array<{
    input: string;
    expected_output: string;
    actual_output: string;
    error: string;
  }>;
  editor_context?: {
    idle_seconds: number;
    backspace_rate: number;
    paste_count: number;
    run_count: number;
  };
  language?: string;
  viva_session_id?: string;
  starter_code?: string;
  // Generation-specific fields
  generate_difficulty?: string;
  sample_solution?: string;
  num_cases?: number;
}): Promise<AgentChatResponse> {
  return apiRequest<AgentChatResponse>("/agent/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ══════════════════════════════════════════════════════════════
//  AI Chat API (used by AIChatPanel)
// ══════════════════════════════════════════════════════════════

export const aiApi = {
  chat: async (request: ChatRequest): Promise<ChatResponse> => {
    const res = await agentChat({
      thread_id: request.thread_id,
      mode: request.mode === "hint" ? "hint" : "chat",
      user_message: request.user_message,
      current_code: request.current_code,
      compiler_output: request.compiler_output,
      frustration_score: Math.min(request.frustration_score ?? 0, 1.0),
      problem_description: request.problem_description,
      failed_test_cases: request.failed_test_cases,
      editor_context: request.editor_context,
      language: request.language || "python",
      starter_code: request.starter_code,
    });

    return {
      thread_id: res.thread_id,
      response: res.response || "I couldn't generate a response. Please try again.",
      turn_count: res.turn_count,
      tool_used: res.tool_used,
      ast_metadata: res.ast_metadata || {},
      teaching_focus: res.teaching_focus || "",
      viva_data: res.viva_data,
    };
  },

  analyze: (code: string, language: string = "python") =>
    apiRequest<{
      is_valid: boolean;
      algorithm_pattern: string;
      functions: string[];
      concepts: string[];
      issues: Array<{ type: string; line: number; description: string }>;
    }>("/analyze", {
      method: "POST",
      body: JSON.stringify({ code, language }),
    }),

  health: (): Promise<{ status: string; version: string }> => {
    // /health is mounted at app root, not under /api prefix
    const baseUrl = (process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8003/api").replace(/\/api$/, "");
    return fetch(`${baseUrl}/health`).then(r => r.json());
  },
};

// ══════════════════════════════════════════════════════════════
//  Viva Voce API — uses /agent/chat with mode=viva_start|viva_answer
// ══════════════════════════════════════════════════════════════

export interface VivaQuestion {
  id: string;
  question_text: string;
  difficulty: number;
}

export interface VivaStartResult {
  thread_id: string;
  session_id: string;
  questions: VivaQuestion[];
  first_question: string;
  response: string;
}

export interface VivaAnswerResult {
  thread_id: string;
  response: string;
  score: number;
  feedback: string;
  is_acceptable: boolean;
  matched_concepts: string[];
  missing_concepts: string[];
  is_complete: boolean;
  verdict?: string;
  average_score?: number;
  viva_data: Record<string, unknown> | null;
}

export interface TranscriptionResult {
  success: boolean;
  text: string;
  duration_seconds: number;
}

export const vivaApi = {
  /**
   * Transcribe audio via Groq Whisper (backend proxies to Groq API).
   * Accepts a Blob of audio (webm/wav/mp3).
   */
  transcribe: async (audioBlob: Blob): Promise<TranscriptionResult> => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("language", "en");

    return apiRequest<TranscriptionResult>("/viva/transcribe", {
      method: "POST",
      body: formData,
    });
  },

  /**
   * Start a viva voce session via mode="viva_start".
   * The backend generates questions from the student's code and returns them.
   */
  start: async (
    threadId: string,
    code: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _numQuestions = 3,
    language: string = "python"
  ): Promise<VivaStartResult> => {
    const res = await agentChat({
      thread_id: threadId,
      mode: "viva_start",
      user_message: "Start viva verification.",
      current_code: code,
      language,
    });

    const vivaData = (res.viva_data || {}) as Record<string, unknown>;
    const questions = (vivaData.questions || []) as VivaQuestion[];

    return {
      thread_id: res.thread_id,
      session_id: (vivaData.session_id as string) || res.thread_id,
      questions,
      first_question: questions[0]?.question_text || res.response,
      response: res.response,
    };
  },

  /**
   * Submit a viva answer via mode="viva_answer".
   * The backend evaluates the answer and returns feedback or a final verdict.
   */
  answer: async (
    threadId: string,
    answerText: string,
    code: string,
    language: string = "python",
    sessionId?: string
  ): Promise<VivaAnswerResult> => {
    const res = await agentChat({
      thread_id: threadId,
      mode: "viva_answer",
      user_message: answerText,
      current_code: code,
      language,
      viva_session_id: sessionId,
    });

    const vivaData = (res.viva_data || {}) as Record<string, unknown>;
    const isVerdict = res.tool_used === "viva_verdict";

    return {
      thread_id: res.thread_id,
      response: res.response,
      score: (vivaData.score as number) ?? (vivaData.average_score as number) ?? 0,
      feedback: (vivaData.feedback as string) || res.response,
      is_acceptable: (vivaData.is_acceptable as boolean) ?? isVerdict,
      matched_concepts: (vivaData.matched_concepts as string[]) || [],
      missing_concepts: (vivaData.missing_concepts as string[]) || [],
      is_complete: isVerdict,
      verdict: isVerdict ? (vivaData.verdict as string) : undefined,
      average_score: isVerdict ? (vivaData.average_score as number) : undefined,
      viva_data: vivaData,
    };
  },
};
