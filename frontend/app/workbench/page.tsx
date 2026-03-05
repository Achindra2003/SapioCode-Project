"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Play, Send, Bot, ArrowLeft, Loader2, CheckCircle, XCircle, AlertTriangle, Trophy, RotateCcw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useProgress } from "@/hooks/useProgress";
import { getQuestionById, QUESTIONS } from "@/lib/questions";
import { TOPICS, LANGUAGES, DEFAULT_LANGUAGE } from "@/lib/constants";
import { TestResult, Question } from "@/lib/types";
import { executeCode } from "@/lib/api/compile";
import { progressApi } from "@/lib/api/auth";
import { teacherAPI } from "@/lib/api/teacher";
import { normalizeStarterCode } from "@/lib/starterCodeUtils";
import LanguageSelector from "@/components/editor/LanguageSelector";
import OutputConsole from "@/components/editor/OutputConsole";
import AIChatPanel from "@/components/chat/AIChatPanel";
import VivaModal from "@/components/editor/VivaModal";

const MonacoEditor = dynamic(() => import("@/components/editor/MonacoEditor"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#0d1117] animate-pulse" />,
});

function WorkbenchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { threadId, fetchProgress } = useProgress(user?.id || null);
  const { onKeystroke, onPaste, onRun, getEditorContext, getTimeSpent, reset: resetTelemetry } = useTelemetry();

  const questionId = searchParams.get("questionId");
  const problemId = searchParams.get("problem");

  // For hardcoded questions (legacy route)
  const hardcodedQuestion = questionId ? getQuestionById(questionId) : null;

  // For MongoDB problems (from skill tree / teacher-assigned)
  const [mongoProblem, setMongoProblem] = useState<Question | null>(null);
  const [loadingProblem, setLoadingProblem] = useState(false);

  useEffect(() => {
    if (problemId) {
      setLoadingProblem(true);
      teacherAPI
        .getProblem(problemId)
        .then((p) => {
          // Map MongoDB problem format → internal Question shape
          // starter_code may be a string (legacy) or dict { python3, java, cpp17, nodejs }
          const starterCode = normalizeStarterCode(p.starter_code, p.title);

          const mapped: Question = {
            id: p.id,
            title: p.title,
            topicId: p.topic,
            difficulty: p.difficulty as "easy" | "medium" | "hard",
            description: p.description,
            starterCode,
            testCases: (p.test_cases || []).map((tc, i) => ({
              input: tc.input,
              expectedOutput: tc.expected_output,
              description: `Test case ${i + 1}`,
            })),
            concepts: p.target_concepts || [],
            estimatedTime: 15,
          };
          setMongoProblem(mapped);
        })
        .catch((err) => console.error("Failed to load problem:", err))
        .finally(() => setLoadingProblem(false));
    }
  }, [problemId]);

  // Unified question: prefer MongoDB problem over hardcoded
  const question = mongoProblem || hardcodedQuestion;

  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [code, setCode] = useState(LANGUAGES[DEFAULT_LANGUAGE].starter);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isVivaOpen, setIsVivaOpen] = useState(false);
  const [vivaCountdown, setVivaCountdown] = useState<number | null>(null);

  // Post-viva result overlay
  const [vivaResult, setVivaResult] = useState<{
    verdict: "pass" | "weak" | "fail";
    score: number;
    countdown: number;
  } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (question) {
      setCode(question.starterCode[language] || LANGUAGES[language].starter);
      setOutput("");
      setError(null);
      setExecutionTime(null);
      setTestResults([]);
      setStatus("idle");
      setIsConsoleOpen(false);
      resetTelemetry();
    }
  }, [question]);

  const handleRunCode = async () => {
    if (status === "running") return;
    setStatus("running");
    setOutput("");
    setError(null);
    setExecutionTime(null);
    setTestResults([]);
    setIsConsoleOpen(true);
    onRun();

    try {
      const result = await executeCode(code, language);
      setOutput(result.output);
      setError(result.error);
      setExecutionTime(result.executionTime);
      setStatus(result.success ? "success" : "error");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  const validateTestCases = async (): Promise<boolean> => {
    if (!question) return false;

    setStatus("running");
    setTestResults([]);

    // Build a language-specific test runner script
    const delimiter = "===SAPIOCODE_TEST_DELIMITER===";

    // Extract function name from starter code so we can wrap bare-argument
    // test inputs (AI-generated problems store just args like "[1,2,3], 6"
    // instead of a complete call like "search([1,2,3], 6)").
    const starterSrc = question.starterCode?.[language] || "";
    let funcName: string | null = null;
    if (language === "python3") {
      const m = starterSrc.match(/def\s+(\w+)\s*\(/);
      if (m) funcName = m[1];
    } else if (language === "nodejs") {
      const m = starterSrc.match(/function\s+(\w+)\s*\(/);
      if (m) funcName = m[1];
    }

    const testExpressions = question.testCases.map((tc) => {
      const expr = tc.input.trim();
      // If the input already looks like a function call, use as-is
      if (/^\w+\s*\(/.test(expr)) return expr;
      // Otherwise wrap bare arguments with the detected function name
      if (funcName) return `${funcName}(${expr})`;
      return expr;
    });

    let testRunnerCode: string;

    if (language === "python3") {
      testRunnerCode = `import sys as _sys, io as _io
__name__ = "__test_runner__"
# Suppress any prints during student code loading
_orig_stdout = _sys.stdout
_sys.stdout = _io.StringIO()

${code}

# Restore stdout for test output
_sys.stdout = _orig_stdout

# --- SapioCode Test Runner ---
_test_expressions = ${JSON.stringify(testExpressions)}
_delimiter = "${delimiter}"
for _expr in _test_expressions:
    try:
        _result = eval(_expr)
        print(_result)
    except Exception as _e:
        print(f"ERROR: {_e}", file=_sys.stderr)
        print("")
    if _expr != _test_expressions[-1]:
        print(_delimiter)
`;
    } else if (language === "nodejs") {
      testRunnerCode = `// Suppress any console.log during student code loading
const _origLog = console.log;
console.log = () => {};

${code}

// Restore console.log for test output
console.log = _origLog;

// --- SapioCode Test Runner ---
const _testExpressions = ${JSON.stringify(testExpressions)};
const _delimiter = "${delimiter}";
for (let _i = 0; _i < _testExpressions.length; _i++) {
  try {
    const _result = eval(_testExpressions[_i]);
    console.log(_result);
  } catch (_e) {
    console.error("ERROR: " + _e.message);
    console.log("");
  }
  if (_i < _testExpressions.length - 1) console.log(_delimiter);
}
`;
    } else if (language === "java") {
      const snippets = question.testCases.map((tc) => tc.javaSnippet);
      if (snippets.every(Boolean)) {
        // Strip existing main() and inject a multi-test harness with delimiters
        const stripped = code.replace(/\s*public\s+static\s+void\s+main[\s\S]*/, "");
        const testLines = (snippets as string[])
          .map((s, i) => {
            const line = `        ${s}`;
            return i < snippets.length - 1
              ? `${line}\n        System.out.println("${delimiter}");`
              : line;
          })
          .join("\n");
        testRunnerCode = `${stripped}\n    public static void main(String[] args) {\n${testLines}\n    }\n}`;
      } else {
        testRunnerCode = code;
      }
    } else if (language === "cpp17") {
      const snippets = question.testCases.map((tc) => tc.cppSnippet);
      if (snippets.every(Boolean)) {
        // Strip existing int main() and inject a multi-test harness with delimiters
        const stripped = code.replace(/\s*int\s+main\s*\(\s*\)[\s\S]*/, "");
        const testLines = (snippets as string[])
          .map((s, i) => {
            const line = `    ${s}`;
            return i < snippets.length - 1
              ? `${line}\n    cout << "${delimiter}" << endl;`
              : line;
          })
          .join("\n");
        testRunnerCode = `${stripped}\nint main() {\n${testLines}\n    return 0;\n}`;
      } else {
        testRunnerCode = code;
      }
    } else {
      // Unknown language fallback
      testRunnerCode = code;
    }

    try {
      const result = await executeCode(testRunnerCode, language);
      const outputs = result.output.split(delimiter).map((s) => s.trim());
      const results: TestResult[] = [];

      for (let i = 0; i < question.testCases.length; i++) {
        const testCase = question.testCases[i];
        const actualOutput = (outputs[i] || "").trim();
        const expectedOutput = testCase.expectedOutput.trim();
        const passed = actualOutput === expectedOutput;

        results.push({
          input: testCase.input,
          actualOutput,
          passed,
          description: testCase.description,
          error: !passed && result.error ? result.error : undefined,
        });
      }

      setTestResults(results);
      const allPassed = results.every((r) => r.passed);
      setStatus(allPassed ? "success" : "error");
      return allPassed;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const results: TestResult[] = question.testCases.map((tc) => ({
        input: tc.input,
        actualOutput: "",
        passed: false,
        description: tc.description,
        error: errMsg,
      }));
      setTestResults(results);
      setStatus("error");
      return false;
    }
  };

  const handleSubmit = async () => {
    if (status === "running") return;
    setIsConsoleOpen(true);

    const allPassed = await validateTestCases();

    if (allPassed) {
      // Show test results for 3 seconds before starting viva
      setVivaCountdown(3);
      let count = 3;
      const interval = setInterval(() => {
        count -= 1;
        setVivaCountdown(count);
        if (count <= 0) {
          clearInterval(interval);
          setVivaCountdown(null);
          setIsVivaOpen(true);
        }
      }, 1000);
    }
  };

  const handleVivaComplete = async (verdict: "pass" | "weak" | "fail", score: number) => {
    setIsVivaOpen(false);

    if (user && question) {
      try {
        // Always record the attempt (pass, weak, or fail)
        await progressApi.complete({
          user_id: user.id,
          question_id: question.id,
          topic_id: question.topicId,
          viva_score: score,
          viva_verdict: verdict,
          time_spent_seconds: getTimeSpent(),
          test_cases_passed: question.testCases.length,
          test_cases_total: question.testCases.length,
          code_snapshot: code,
        });

        // Refresh progress data from DB to update unlock state
        await fetchProgress();
      } catch (err) {
        console.error("Failed to save progress:", err);
      }
    }

    // Show post-viva result overlay
    const autoNavSeconds = verdict === "pass" ? 5 : 8;
    setVivaResult({ verdict, score, countdown: autoNavSeconds });

    // Countdown then navigate/dismiss
    let remaining = autoNavSeconds;
    const interval = setInterval(() => {
      remaining -= 1;
      setVivaResult((prev) => prev ? { ...prev, countdown: remaining } : null);
      if (remaining <= 0) {
        clearInterval(interval);
        if (verdict === "pass") {
          resetTelemetry();
          setCode(question?.starterCode[language] || LANGUAGES[language].starter);
          setOutput("");
          setError(null);
          setTestResults([]);
          setStatus("idle");
          setVivaResult(null);
          router.push(mongoProblem ? "/progress/skill-tree" : "/progress");
        } else {
          // On weak/fail, dismiss overlay — student stays to retry
          setVivaResult(null);
        }
      }
    }, 1000);
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  const topic = question && !mongoProblem ? TOPICS.find((t) => t.id === question.topicId) : null;
  const editorContext = getEditorContext();

  return (
    <main className="h-screen w-screen bg-[#0d1117] text-[#e6edf3] flex flex-col overflow-hidden">
      <nav className="h-14 flex items-center justify-between px-4 border-b border-white/5 bg-[#0d1117]/80 backdrop-blur-md z-30 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(mongoProblem ? "/progress/skill-tree" : "/progress")}
            className="p-2 hover:bg-white/5 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5 opacity-40" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight">
              sapio<span className="text-[#44f91f] neon-text">code</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-white/40">{user.full_name}</span>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="px-5 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden z-10">
        <aside className="w-1/2 flex flex-col border-r border-white/5 bg-[#0d1117]">
          <div className="h-10 flex items-center px-4 border-b border-white/5 shrink-0 bg-[#161b22]">
            <button className="h-full flex items-center gap-2 border-b-2 border-white px-2 text-xs font-bold tracking-tight">
              Question
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            {question ? (
              <div className="animate-fade-in max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold text-white mb-4">{question.title}</h1>
                <div className="flex items-center gap-4 mb-6">
                  <span
                    className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                      question.difficulty === "easy"
                        ? "bg-[#44f91f]/10 text-[#44f91f] border-[#44f91f]/20"
                        : question.difficulty === "medium"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}
                  >
                    {question.difficulty}
                  </span>
                  {topic && (
                    <span className="text-xs font-bold text-white/40 bg-white/5 px-3 py-1 rounded-full border border-white/5 uppercase tracking-widest">
                      {topic.name}
                    </span>
                  )}
                  {mongoProblem && (
                    <span className="text-xs font-bold text-white/40 bg-white/5 px-3 py-1 rounded-full border border-white/5 uppercase tracking-widest">
                      {mongoProblem.topicId}
                    </span>
                  )}
                </div>

                <div className="prose prose-invert max-w-none">
                  <p className="text-[#e6edf3]/70 text-base leading-relaxed mb-6 whitespace-pre-wrap">
                    {question.description}
                  </p>

                  <div className="space-y-4">
                    <h4 className="text-sm font-black uppercase tracking-widest text-white/30">
                      Test Cases
                    </h4>
                    {question.testCases.map((tc, i) => (
                      <div key={i} className="bg-white/[0.03] border border-white/5 rounded-lg p-4 font-mono text-sm">
                        <div className="flex gap-2">
                          <span className="text-[#44f91f]">Input:</span>
                          <span className="text-white/60">{tc.input}</span>
                        </div>
                        <div className="text-xs text-white/30 mt-2">{tc.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : loadingProblem ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="w-8 h-8 text-[#44f91f] animate-spin" />
                <span className="text-sm text-white/40">Loading problem...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <span className="text-xs font-black uppercase tracking-[.3em] text-white/20 mb-6 block">
                  Problem Library
                </span>
                {QUESTIONS.map((q) => (
                  <a
                    key={q.id}
                    href={`?questionId=${q.id}`}
                    className="group flex items-center justify-between p-4 rounded-lg bg-white/[0.01] border border-white/5 hover:bg-white/[0.04] transition-all"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-base font-bold text-white group-hover:text-[#44f91f] transition-colors">
                        {q.title}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest ${
                          q.difficulty === "easy"
                            ? "text-[#44f91f]/40"
                            : q.difficulty === "medium"
                            ? "text-amber-500/40"
                            : "text-red-500/40"
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="w-1/2 flex flex-col bg-[#0d1117] relative">
          <div className="h-10 flex items-center justify-between px-4 border-b border-white/5 shrink-0 bg-[#161b22]">
            <div className="flex items-center gap-4">
              <LanguageSelector value={language} onChange={(lang) => { setLanguage(lang); setCode(question?.starterCode[lang] || LANGUAGES[lang].starter); }} disabled={status === "running"} />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAIOpen(true)}
                className="flex items-center gap-2 h-10 px-4 bg-white/5 border border-white/5 hover:border-[#44f91f]/20 hover:bg-[#44f91f]/5 rounded-lg transition-all group"
              >
                <Bot className="w-4 h-4 text-[#44f91f]/60 group-hover:text-[#44f91f]" />
                <span className="text-xs font-bold text-white/40 group-hover:text-[#44f91f] uppercase tracking-widest">
                  SapioBot
                </span>
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 bg-[#0d1117]">
            <MonacoEditor
              language={LANGUAGES[language].monaco}
              value={code}
              onChange={setCode}
              onKeystroke={onKeystroke}
              onPaste={onPaste}
            />
          </div>

          <div className={`transition-all duration-300 flex flex-col shrink-0 z-20 ${isConsoleOpen ? "h-64" : "h-12"}`}>
            <div className="h-12 border-t border-white/5 bg-[#161b22] px-6 flex items-center justify-between shrink-0">
              <button
                onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                className="flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white transition-colors uppercase tracking-widest"
              >
                Console
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-300 ${isConsoleOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                </svg>
              </button>

              <div className="flex items-center gap-4">
                <button
                  onClick={handleRunCode}
                  disabled={status === "running"}
                  className="min-w-[120px] h-10 bg-[#262626] border border-white/10 hover:border-white/20 hover:bg-[#333333] rounded-xl text-sm font-black text-white transition-all uppercase tracking-widest disabled:opacity-40 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 text-[#44f91f]" />
                  {status === "running" ? "Running" : "Run"}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={status === "running" || vivaCountdown !== null}
                  className="min-w-[120px] h-10 bg-[#44f91f] hover:brightness-110 rounded-xl text-sm font-black text-black transition-all uppercase tracking-widest disabled:opacity-40 active:scale-95 shadow-[0_0_20px_rgba(68,249,31,0.3)] hover:shadow-[0_0_30px_rgba(68,249,31,0.4)] flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {vivaCountdown !== null ? `Viva in ${vivaCountdown}...` : "Submit"}
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#0d1117] overflow-y-auto">
              <OutputConsole
                output={output}
                error={error}
                executionTime={executionTime}
                status={status}
                testResults={testResults}
              />
              {vivaCountdown !== null && (
                <div className="flex items-center gap-3 px-4 py-3 bg-[#44f91f]/10 border-t border-[#44f91f]/20 animate-pulse">
                  <Loader2 className="w-4 h-4 text-[#44f91f] animate-spin" />
                  <span className="text-sm text-[#44f91f] font-semibold">
                    All test cases passed! Starting viva verification in {vivaCountdown}...
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AIChatPanel
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        code={code}
        problemDescription={question?.description || ""}
        threadId={threadId || `user_${user.id}`}
        userId={user.id}
        editorContext={editorContext}
        compilerOutput={output || error || ""}
        language={LANGUAGES[language].monaco}
        starterCode={question?.starterCode[language] || ""}
        failedTestCases={testResults
          .filter((r) => !r.passed)
          .map((r) => ({
            input: r.input,
            expected_output: question?.testCases.find((tc) => tc.input === r.input)?.expectedOutput || "",
            actual_output: r.actualOutput,
            error: r.error || "",
          }))}
      />

      <VivaModal
        isOpen={isVivaOpen}
        onClose={() => setIsVivaOpen(false)}
        code={code}
        problemDescription={question?.description || ""}
        threadId={threadId || `user_${user.id}`}
        userId={user.id}
        onComplete={handleVivaComplete}
        language={LANGUAGES[language].monaco}
      />

      {/* ── Post-Viva Result Overlay ── */}
      {vivaResult && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md text-center animate-fade-in">
            {/* Icon */}
            <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
              vivaResult.verdict === "pass"
                ? "bg-[#44f91f]/20 shadow-[0_0_60px_rgba(68,249,31,0.3)]"
                : vivaResult.verdict === "weak"
                ? "bg-amber-500/20 shadow-[0_0_60px_rgba(245,158,11,0.2)]"
                : "bg-red-500/20 shadow-[0_0_60px_rgba(239,68,68,0.2)]"
            }`}>
              {vivaResult.verdict === "pass" ? (
                <Trophy className="w-12 h-12 text-[#44f91f]" />
              ) : vivaResult.verdict === "weak" ? (
                <AlertTriangle className="w-12 h-12 text-amber-400" />
              ) : (
                <XCircle className="w-12 h-12 text-red-400" />
              )}
            </div>

            {/* Title */}
            <h2 className={`text-3xl font-black mb-2 ${
              vivaResult.verdict === "pass"
                ? "text-[#44f91f]"
                : vivaResult.verdict === "weak"
                ? "text-amber-400"
                : "text-red-400"
            }`}>
              {vivaResult.verdict === "pass"
                ? "Problem Mastered!"
                : vivaResult.verdict === "weak"
                ? "Almost There!"
                : "Keep Trying!"}
            </h2>

            {/* Score */}
            <div className="text-5xl font-black text-white mb-2">
              {Math.round(vivaResult.score * 100)}%
            </div>
            <p className="text-sm text-slate-400 mb-6">Viva Voce Score</p>

            {/* Feedback */}
            <p className="text-slate-300 text-sm mb-8 max-w-xs mx-auto">
              {vivaResult.verdict === "pass"
                ? "Excellent! You demonstrated strong understanding. The next problem has been unlocked on your skill tree."
                : vivaResult.verdict === "weak"
                ? "You showed partial understanding. Review the concepts and try again — you're close!"
                : "Your answers didn't demonstrate enough understanding yet. Use SapioBot for hints and try again."}
            </p>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-4">
              {vivaResult.verdict === "pass" ? (
                <button
                  onClick={() => {
                    resetTelemetry();
                    setCode(question?.starterCode[language] || LANGUAGES[language].starter);
                    setOutput(""); setError(null); setTestResults([]); setStatus("idle");
                    setVivaResult(null);
                    router.push(mongoProblem ? "/progress/skill-tree" : "/progress");
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-[#44f91f] text-black font-bold rounded-xl hover:brightness-110 transition-all shadow-[0_0_20px_rgba(68,249,31,0.3)]"
                >
                  <CheckCircle className="w-5 h-5" />
                  Next Problem
                </button>
              ) : (
                <button
                  onClick={() => setVivaResult(null)}
                  className="flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all"
                >
                  <RotateCcw className="w-5 h-5" />
                  Try Again
                </button>
              )}
            </div>

            {/* Auto-nav countdown */}
            <p className="text-[10px] text-slate-600 mt-4 uppercase tracking-widest">
              {vivaResult.verdict === "pass"
                ? `Advancing to skill tree in ${vivaResult.countdown}s...`
                : `Returning to editor in ${vivaResult.countdown}s...`}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

export default function WorkbenchPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-[#0d1117]" />}>
      <WorkbenchContent />
    </Suspense>
  );
}
