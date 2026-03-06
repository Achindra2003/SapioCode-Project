/**
 * Teacher API — classes, problems, analytics.
 * Calls the auth backend (port 8000) at /teacher/* endpoints.
 */

import { authStorage } from "@/hooks/useAuth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:8000";

function getAuthHeaders(): HeadersInit {
  const token = authStorage.getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function teacherRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });
  let data: Record<string, unknown>;
  try {
    data = await response.json();
  } catch {
    if (response.ok) throw new Error("Empty response from server");
    throw new Error(`Server error (${response.status})`);
  }
  if (!response.ok) {
    throw new Error((data.detail as string) || "Teacher API error");
  }
  return data as T;
}

// ── Types ─────────────────────────────────────

export interface Classroom {
  id: string;
  name: string;
  cohort_code: string;
  student_ids: string[];
  student_count: number;
  problem_count: number;
  is_active: boolean;
  created_at: string;
}

export interface ClassDetail {
  id: string;
  name: string;
  cohort_code: string;
  students: Array<{ id: string; full_name: string; email: string }>;
  problems: Array<{
    id: string;
    title: string;
    difficulty: string;
    topic: string;
    status: string;
  }>;
  is_active: boolean;
  created_at: string;
}

export interface ProblemPayload {
  title: string;
  description: string;
  difficulty: string;
  topic: string;
  target_concepts: string[];
  test_cases: Array<{
    input: string;
    expected_output: string;
    is_hidden: boolean;
  }>;
  viva_questions: Array<{
    question: string;
    expected_answer_keywords: string[];
  }>;
  status: string;
  starter_code?: string | Record<string, string>;
}

export interface HeatmapColumn {
  problem_id: string;
  title: string;
  difficulty: string;
}

export interface HeatmapRow {
  student_id: string;
  student_name: string;
  email: string;
  cells: Array<{ status: string; viva_score: number; attempts: number }>;
  mastered_count: number;
  total_problems: number;
}

export interface HeatmapData {
  class_id: string;
  class_name: string;
  columns: HeatmapColumn[];
  rows: HeatmapRow[];
  student_count: number;
  problem_count: number;
}

export interface SkillTreeNode {
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
}

export interface SkillTreeData {
  user_id: string;
  class: { id: string; name: string; cohort_code: string; teacher_name?: string } | null;
  nodes: SkillTreeNode[];
  total_problems: number;
  mastered_count: number;
}

export interface GeneratedProblem {
  title: string;
  description: string;
  difficulty: string;
  topic: string;
  target_concepts: string[];
  test_cases: Array<{
    input: string;
    expected_output: string;
    is_hidden: boolean;
  }>;
  viva_questions: Array<{
    question: string;
    expected_answer_keywords: string[];
  }>;
  starter_code?: string | Record<string, string>;
}

// ── API Methods ───────────────────────────────

export const teacherAPI = {
  // Classes
  createClassroom: (name: string): Promise<Classroom & { message: string }> =>
    teacherRequest("/teacher/classes", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  listClassrooms: (): Promise<Classroom[]> =>
    teacherRequest("/teacher/classes"),

  getClassroom: (classId: string): Promise<ClassDetail> =>
    teacherRequest(`/teacher/classes/${classId}`),

  // Problems
  createProblem: (
    classId: string,
    problem: ProblemPayload
  ): Promise<{ message: string; problem_id: string }> =>
    teacherRequest(`/teacher/classes/${classId}/problems`, {
      method: "POST",
      body: JSON.stringify(problem),
    }),

  listProblems: (classId: string): Promise<ProblemPayload[]> =>
    teacherRequest(`/teacher/classes/${classId}/problems`),

  // Update a problem
  updateProblem: (
    classId: string,
    problemId: string,
    updates: Partial<ProblemPayload>
  ): Promise<{ message: string; problem_id: string }> =>
    teacherRequest(`/teacher/classes/${classId}/problems/${problemId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),

  // Delete a problem
  deleteProblem: (
    classId: string,
    problemId: string
  ): Promise<{ message: string; problem_id: string }> =>
    teacherRequest(`/teacher/classes/${classId}/problems/${problemId}`, {
      method: "DELETE",
    }),

  // Analytics
  getAnalytics: (classId: string): Promise<HeatmapData> =>
    teacherRequest(`/teacher/classes/${classId}/analytics`),

  // Student join (uses JWT auth, sends cohort_code in body)
  joinClass: (
    cohortCode: string
  ): Promise<{ message: string; class_id: string; class_name: string }> =>
    teacherRequest(`/teacher/join`, {
      method: "POST",
      body: JSON.stringify({ cohort_code: cohortCode }),
    }),

  // Fetch single problem by ID (for student workbench)
  getProblem: (
    problemId: string
  ): Promise<{
    id: string;
    title: string;
    description: string;
    difficulty: string;
    topic: string;
    target_concepts: string[];
    test_cases: Array<{ input: string; expected_output: string; is_hidden: boolean }>;
    viva_questions: Array<{ question: string; expected_answer_keywords: string[] }>;
    starter_code: string | Record<string, string>;
    status: string;
  }> => teacherRequest(`/teacher/problems/${problemId}`),

  // Fetch student chat transcript (teacher viewing student's session)
  getStudentTranscript: (
    studentId: string
  ): Promise<{
    history: Array<{ role: string; content: string; timestamp?: string }>;
  }> => teacherRequest(`/teacher/students/${studentId}/transcript`),

  // AI Problem Generation (proxied via Next.js /api/ai/generate to avoid CORS)
  generateProblem: async (prompt: string, difficulty: string = "intermediate"): Promise<GeneratedProblem> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          difficulty,
          language: "python",
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error(response.ok ? "Empty response from AI" : `AI service error (${response.status})`);
      }
      if (!response.ok) {
        throw new Error(data.detail || "AI generation failed");
      }
      return data;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error("Problem generation timed out — the AI service may be starting up. Please try again.");
      }
      throw err;
    }
  },

  // AI Test Case Generation (proxied via Next.js /api/ai/generate-tests to avoid CORS)
  generateTestCases: async (problemDescription: string, numCases: number = 5): Promise<{
    problem_title: string;
    language: string;
    test_cases: Array<{ input: string; expected_output: string; explanation: string; category: string }>;
    notes: string;
  }> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
    try {
      const response = await fetch("/api/ai/generate-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_description: problemDescription,
          language: "python3",
          num_cases: numCases,
          difficulty_spread: true,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error(response.ok ? "Empty response from AI" : `AI service error (${response.status})`);
      }
      if (!response.ok) {
        throw new Error(data.detail || "Test case generation failed");
      }
      return data;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error("Test generation timed out — the AI service may be starting up. Please try again.");
      }
      throw err;
    }
  },
};

// ── Student Skill Tree ────────────────────────

export const skillTreeApi = {
  getSkillTree: (userId: string, classId?: string): Promise<SkillTreeData> => {
    const url = classId
      ? `/progress/student/${userId}/skill-tree?class_id=${classId}`
      : `/progress/student/${userId}/skill-tree`;
    return teacherRequest(url);
  },
};

// ── Student Classes ────────────────────────

export interface StudentClass {
  id: string;
  name: string;
  cohort_code: string;
  problem_count: number;
  teacher_name: string;
}

export const studentApi = {
  getMyClasses: (userId: string): Promise<{ classes: StudentClass[] }> =>
    teacherRequest(`/progress/student/${userId}/classes`),
};
