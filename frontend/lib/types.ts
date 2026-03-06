export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "student" | "teacher";
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  description: string;
  /** Java statement(s) placed in generated main() for this test case */
  javaSnippet?: string;
  /** C++ statement(s) placed in generated main() for this test case */
  cppSnippet?: string;
}

export interface Question {
  id: string;
  title: string;
  topicId: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  starterCode: Record<string, string>;
  testCases: TestCase[];
  concepts: string[];
  estimatedTime: number;
}

export interface Topic {
  id: string;
  name: string;
  order: number;
  description: string;
  questionIds: string[];
  questionCount: number;
}

export interface UserProgress {
  user_id: string;
  question_id: string;
  topic_id: string;
  status: "mastered" | "in_progress" | "locked";
  viva_score: number;
  viva_verdict: "pass" | "weak" | "fail";
  attempts: number;
  time_spent_seconds: number;
  test_cases_passed: number;
  test_cases_total: number;
  completed_at: string | null;
}

export interface EditorContext {
  idle_seconds: number;
  backspace_rate: number;
  paste_count: number;
  run_count: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface FailedTestCase {
  input: string;
  expected_output: string;
  actual_output: string;
  error: string;
}

export interface ChatRequest {
  thread_id: string;
  mode: "hint" | "chat" | "viva_start" | "viva_answer" | "generate_problem" | "generate_tests";
  user_message: string;
  current_code?: string;
  compiler_output?: string;
  frustration_score?: number;
  problem_description?: string;
  failed_test_cases?: FailedTestCase[];
  editor_context?: EditorContext;
  language?: string;
  starter_code?: string;
  // Generation-specific fields
  generate_difficulty?: string;
  sample_solution?: string;
  num_cases?: number;
}

export interface VivaQuestion {
  id: string;
  question_text: string;
  difficulty: number;
}

export interface VivaData {
  session_id?: string;
  questions?: VivaQuestion[];
  score?: number;
  feedback?: string;
  matched_concepts?: string[];
  missing_concepts?: string[];
  is_acceptable?: boolean;
  verdict?: string;
  average_score?: number;
  message?: string;
  question_breakdown?: Array<{
    question: string;
    score: number;
    feedback: string;
  }>;
}

export interface ChatResponse {
  thread_id: string;
  response: string;
  turn_count: number;
  tool_used: string;
  ast_metadata: Record<string, unknown>;
  teaching_focus: string;
  viva_data: VivaData | null;
  generate_data?: Record<string, unknown> | null;
}

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

export interface TestResult {
  input: string;
  expectedOutput?: string;
  actualOutput: string;
  passed: boolean;
  description: string;
  error?: string;
}

export interface SessionData {
  user_id: string;
  thread_id: string;
  conversation_history: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }>;
  current_question_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegisterRequest {
  full_name: string;
  email: string;
  password: string;
  role?: "student" | "teacher";
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface ProgressCompleteRequest {
  user_id: string;
  question_id: string;
  topic_id: string;
  viva_score: number;
  viva_verdict: "pass" | "weak" | "fail";
  time_spent_seconds: number;
  test_cases_passed: number;
  test_cases_total: number;
  code_snapshot: string;
}

export interface TopicStatus {
  id: string;
  name: string;
  order: number;
  description: string;
  status: "locked" | "unlocked" | "mastered";
  completion_rate: number;
  mastered_count: number;
  total_count: number;
}
