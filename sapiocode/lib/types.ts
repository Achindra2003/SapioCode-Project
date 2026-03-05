// ─── Compile API ────────────────────────────────────────────
export interface CompileRequest {
    code: string;
    language: string;
    stdin?: string;
}

export interface CompileResponse {
    success: boolean;
    output: string;
    error: string | null;
    executionTime: string | null;
}

// ─── AI Assistant API ───────────────────────────────────────
export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export interface AssistantRequest {
    code: string;
    language: string;
    lastOutput?: string;
    lastError?: string;
    chatHistory: ChatMessage[];
    userMessage: string;
}

export interface AssistantResponse {
    content: string;
    error?: string;
}

// ─── Questions ──────────────────────────────────────────────
export interface StarterCode {
    [language: string]: string;
}

export interface Question {
    id: string;
    title: string;
    description: string;
    difficulty: "easy" | "medium" | "hard";
    starterCode: StarterCode;
}

// ─── JDoodle ────────────────────────────────────────────────
export interface JDoodleLanguageConfig {
    language: string;
    versionIndex: string;
    label: string;
    monaco: string;
    starter: string;
}
