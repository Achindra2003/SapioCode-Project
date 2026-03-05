"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  Save,
  Eye,
  EyeOff,
  Loader2,
  ChevronDown,
  BookOpen,
  Search,
} from "lucide-react";
import {
  teacherAPI,
  type ProblemPayload,
  type Classroom,
  type GeneratedProblem,
} from "@/lib/api/teacher";
import { QUESTIONS } from "@/lib/questions";

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
const TOPICS = [
  "variables-basics",
  "conditionals",
  "loops",
  "arrays",
  "strings",
  "functions",
  "oop",
  "recursion",
] as const;

function NewProblemContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClassId = searchParams.get("classId") || "";

  // Class selection
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(preselectedClassId);
  const [, setLoadingClasses] = useState(true);

  // Problem fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<string>("beginner");
  const [topic, setTopic] = useState<string>("variables-basics");
  const [targetConcepts, setTargetConcepts] = useState<string[]>([]);
  const [conceptInput, setConceptInput] = useState("");
  const [starterCode, setStarterCode] = useState("");
  // Store the full multi-language starter code dict (from AI or library)
  const [multiLangStarter, setMultiLangStarter] = useState<Record<string, string> | null>(null);
  const [testCases, setTestCases] = useState<
    { input: string; expected_output: string; is_hidden: boolean }[]
  >([{ input: "", expected_output: "", is_hidden: false }]);
  const [vivaQuestions, setVivaQuestions] = useState<
    { question: string; expected_answer_keywords: string[] }[]
  >([]);

  // AI generation
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [showAI, setShowAI] = useState(false);

  // Library picker
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState("");

  const filteredLibrary = QUESTIONS.filter((q) => {
    const term = libraryFilter.toLowerCase();
    return (
      q.title.toLowerCase().includes(term) ||
      q.topicId.toLowerCase().includes(term) ||
      q.difficulty.toLowerCase().includes(term)
    );
  });

  const pickFromLibrary = (q: typeof QUESTIONS[0]) => {
    setTitle(q.title);
    setDescription(q.description);
    setDifficulty(
      q.difficulty === "easy"
        ? "beginner"
        : q.difficulty === "hard"
        ? "advanced"
        : "intermediate"
    );
    setTopic(q.topicId);
    setTargetConcepts(q.concepts || []);
    setStarterCode(q.starterCode?.python3 || "");
    if (q.testCases?.length) {
      setTestCases(
        q.testCases.map((tc) => ({
          input: tc.input,
          expected_output: tc.expectedOutput,
          is_hidden: false,
        }))
      );
    }
    setShowLibrary(false);
  };

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    teacherAPI
      .listClassrooms()
      .then((data) => {
        setClassrooms(data);
        if (!preselectedClassId && data.length > 0) {
          setSelectedClassId(data[0].id);
        }
      })
      .finally(() => setLoadingClasses(false));
  }, [preselectedClassId]);

  // --- AI Generator ---
  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const gen: GeneratedProblem = await teacherAPI.generateProblem(aiPrompt);
      // Fill form from AI response
      setTitle(gen.title || "");
      setDescription(gen.description || "");
      setDifficulty(gen.difficulty || "beginner");
      setTopic(gen.topic || "variables-basics");
      setTargetConcepts(gen.target_concepts || []);
      setStarterCode(
        typeof gen.starter_code === "object" && gen.starter_code
          ? (gen.starter_code.python3 || "")
          : (gen.starter_code as string || "")
      );
      // Store the full multi-language dict if the AI returned one
      if (typeof gen.starter_code === "object" && gen.starter_code) {
        setMultiLangStarter(gen.starter_code as Record<string, string>);
      } else {
        setMultiLangStarter(null);
      }
      if (gen.test_cases?.length) {
        setTestCases(
          gen.test_cases.map((tc) => ({
            input: tc.input || "",
            expected_output: tc.expected_output || "",
            is_hidden: tc.is_hidden ?? false,
          }))
        );
      }
      if (gen.viva_questions?.length) {
        setVivaQuestions(
          gen.viva_questions.map((vq) => ({
            question: vq.question || "",
            expected_answer_keywords: vq.expected_answer_keywords || [],
          }))
        );
      }
      setShowAI(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "AI generation failed");
    } finally {
      setGenerating(false);
    }
  };

  // --- Test Cases ---
  const addTestCase = () =>
    setTestCases([...testCases, { input: "", expected_output: "", is_hidden: false }]);

  const removeTestCase = (i: number) =>
    setTestCases(testCases.filter((_, idx) => idx !== i));

  const updateTestCase = (i: number, field: string, value: string | boolean) =>
    setTestCases(testCases.map((tc, idx) => (idx === i ? { ...tc, [field]: value } : tc)));

  // --- Concepts ---
  const addConcept = () => {
    if (conceptInput.trim() && !targetConcepts.includes(conceptInput.trim())) {
      setTargetConcepts([...targetConcepts, conceptInput.trim()]);
      setConceptInput("");
    }
  };

  const removeConcept = (c: string) =>
    setTargetConcepts(targetConcepts.filter((x) => x !== c));

  // --- Viva Questions ---
  const addVivaQuestion = () =>
    setVivaQuestions([
      ...vivaQuestions,
      { question: "", expected_answer_keywords: [] },
    ]);

  const removeVivaQuestion = (i: number) =>
    setVivaQuestions(vivaQuestions.filter((_, idx) => idx !== i));

  const updateVivaQuestion = (
    i: number,
    field: string,
    value: string | string[]
  ) =>
    setVivaQuestions(
      vivaQuestions.map((vq, idx) => (idx === i ? { ...vq, [field]: value } : vq))
    );

  // --- Submit ---
  const handleSubmit = async () => {
    if (!selectedClassId) {
      setError("Please select a classroom");
      return;
    }
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload: ProblemPayload = {
        title,
        description,
        difficulty,
        topic,
        target_concepts: targetConcepts,
        test_cases: testCases.filter((tc) => tc.input || tc.expected_output),
        viva_questions: vivaQuestions.filter((vq) => vq.question),
        starter_code: multiLangStarter
          ? { ...multiLangStarter, python3: starterCode }
          : starterCode,
        status: "published",
      };
      await teacherAPI.createProblem(selectedClassId, payload);
      setSuccess(true);
      setTimeout(() => {
        router.push(`/teacher/classrooms/${selectedClassId}`);
      }, 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create problem");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-white/5 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Problem</h1>
          <p className="text-sm text-slate-400">
            Manually define or use AI to generate a problem
          </p>
        </div>
      </div>

      {/* AI Generator Panel */}
      <div className="mb-8">
        <button
          onClick={() => setShowAI(!showAI)}
          className="flex items-center gap-2 px-4 py-3 w-full glass-morphism rounded-2xl text-left hover:border-[#44f91f]/20 transition-all"
        >
          <Sparkles className="w-5 h-5 text-[#44f91f]" />
          <span className="flex-1 text-sm font-semibold text-white">
            AI Problem Generator
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${
              showAI ? "rotate-180" : ""
            }`}
          />
        </button>

        {showAI && (
          <div className="mt-2 glass-morphism rounded-2xl p-6">
            <p className="text-xs text-slate-500 mb-3">
              Describe the type of problem you want. The AI will generate title,
              description, test cases, and viva questions.
            </p>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Create a beginner-level problem about for-loops that asks students to sum an array of integers. Include edge cases for empty arrays."
              rows={4}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-[#44f91f]/40 focus:outline-none resize-none text-sm"
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleGenerate}
                disabled={generating || !aiPrompt.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#44f91f] text-black font-semibold rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pick from Library Panel */}
      <div className="mb-8">
        <button
          onClick={() => setShowLibrary(!showLibrary)}
          className="flex items-center gap-2 px-4 py-3 w-full glass-morphism rounded-2xl text-left hover:border-[#44f91f]/20 transition-all"
        >
          <BookOpen className="w-5 h-5 text-[#44f91f]" />
          <span className="flex-1 text-sm font-semibold text-white">Pick from Predefined Library</span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showLibrary ? "rotate-180" : ""}`} />
        </button>

        {showLibrary && (
          <div className="mt-2 glass-morphism rounded-2xl p-6">
            <p className="text-xs text-slate-500 mb-3">
              Choose from the built-in question bank. Selecting a question will auto-fill all form fields.
            </p>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={libraryFilter}
                onChange={(e) => setLibraryFilter(e.target.value)}
                placeholder="Search by title, topic, or difficulty..."
                className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-[#44f91f]/40 focus:outline-none"
              />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
              {filteredLibrary.slice(0, 30).map((q) => (
                <button
                  key={q.id}
                  onClick={() => pickFromLibrary(q)}
                  className="w-full flex items-center justify-between p-3 bg-black/20 border border-white/5 rounded-xl hover:bg-white/5 hover:border-[#44f91f]/10 transition-all text-left"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-white">{q.title}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                      {q.topicId.replace("-", " ")}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                    q.difficulty === "easy"
                      ? "text-[#44f91f]/60 bg-[#44f91f]/5 border-[#44f91f]/10"
                      : q.difficulty === "medium"
                      ? "text-amber-400/60 bg-amber-500/5 border-amber-500/10"
                      : "text-red-400/60 bg-red-500/5 border-red-500/10"
                  }`}>
                    {q.difficulty}
                  </span>
                </button>
              ))}
              {filteredLibrary.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No matching questions found</p>
              )}
              {filteredLibrary.length > 30 && (
                <p className="text-xs text-slate-500 text-center py-2">Showing 30 of {filteredLibrary.length} results. Narrow your search.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error / Success */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-[#44f91f]/10 border border-[#44f91f]/20 rounded-xl text-sm text-[#44f91f]">
          Problem created successfully! Redirecting...
        </div>
      )}

      {/* Form */}
      <div className="space-y-6">
        {/* Class selection */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
            Assign to Classroom *
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#44f91f]/40 focus:outline-none"
          >
            <option value="">Select a classroom</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.cohort_code})
              </option>
            ))}
          </select>
        </div>

        {/* Title & Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sum of Array Elements"
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-[#44f91f]/40 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#44f91f]/40 focus:outline-none"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                Topic
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#44f91f]/40 focus:outline-none"
              >
                {TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("-", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Write a function that takes an array of integers and returns their sum..."
            rows={4}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-[#44f91f]/40 focus:outline-none resize-none text-sm"
          />
        </div>

        {/* Target Concepts */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
            Target Concepts
          </label>
          <div className="flex gap-2 mb-2 flex-wrap">
            {targetConcepts.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 bg-[#44f91f]/10 text-[#44f91f] text-xs px-2.5 py-1 rounded-full"
              >
                {c}
                <button
                  onClick={() => removeConcept(c)}
                  className="hover:text-red-400"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={conceptInput}
              onChange={(e) => setConceptInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addConcept())}
              placeholder="e.g. for-loops, iteration"
              className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-600 focus:border-[#44f91f]/40 focus:outline-none"
            />
            <button
              onClick={addConcept}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300 hover:bg-white/10"
            >
              Add
            </button>
          </div>
        </div>

        {/* Starter Code */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
            Starter Code
          </label>
          <textarea
            value={starterCode}
            onChange={(e) => setStarterCode(e.target.value)}
            placeholder="def sum_array(arr):&#10;    # Your code here&#10;    pass"
            rows={5}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-[#44f91f]/40 focus:outline-none resize-none font-mono text-sm"
          />
        </div>

        {/* Test Cases */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Test Cases
            </label>
            <button
              onClick={addTestCase}
              className="flex items-center gap-1 text-xs text-[#44f91f] hover:text-[#44f91f]/80"
            >
              <Plus className="w-3 h-3" />
              Add Test Case
            </button>
          </div>
          <div className="space-y-3">
            {testCases.map((tc, i) => (
              <div
                key={i}
                className="glass-morphism rounded-xl p-4 relative"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">
                      Input
                    </label>
                    <input
                      type="text"
                      value={tc.input}
                      onChange={(e) => updateTestCase(i, "input", e.target.value)}
                      placeholder="[1, 2, 3]"
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-[#44f91f]/30 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">
                      Expected Output
                    </label>
                    <input
                      type="text"
                      value={tc.expected_output}
                      onChange={(e) =>
                        updateTestCase(i, "expected_output", e.target.value)
                      }
                      placeholder="6"
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-[#44f91f]/30 focus:outline-none font-mono"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => updateTestCase(i, "is_hidden", !tc.is_hidden)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
                  >
                    {tc.is_hidden ? (
                      <EyeOff className="w-3 h-3" />
                    ) : (
                      <Eye className="w-3 h-3" />
                    )}
                    {tc.is_hidden ? "Hidden" : "Visible"}
                  </button>
                  {testCases.length > 1 && (
                    <button
                      onClick={() => removeTestCase(i)}
                      className="text-xs text-red-400/60 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Viva Questions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Viva Questions (Optional)
            </label>
            <button
              onClick={addVivaQuestion}
              className="flex items-center gap-1 text-xs text-[#44f91f] hover:text-[#44f91f]/80"
            >
              <Plus className="w-3 h-3" />
              Add Question
            </button>
          </div>
          <div className="space-y-3">
            {vivaQuestions.map((vq, i) => (
              <div
                key={i}
                className="glass-morphism rounded-xl p-4 relative"
              >
                <div className="mb-2">
                  <label className="text-[10px] text-slate-500 mb-1 block">
                    Question
                  </label>
                  <input
                    type="text"
                    value={vq.question}
                    onChange={(e) =>
                      updateVivaQuestion(i, "question", e.target.value)
                    }
                    placeholder="Explain why you chose this approach..."
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-[#44f91f]/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">
                    Expected Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={vq.expected_answer_keywords.join(", ")}
                    onChange={(e) =>
                      updateVivaQuestion(
                        i,
                        "expected_answer_keywords",
                        e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    placeholder="iteration, loop, accumulator"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-[#44f91f]/30 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => removeVivaQuestion(i)}
                  className="absolute top-3 right-3 text-red-400/60 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4 pt-4 border-t border-white/5">
          <button
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !selectedClassId}
            className="flex items-center gap-2 px-6 py-3 bg-[#44f91f] text-black font-semibold rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(68,249,31,0.2)]"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {submitting ? "Saving..." : "Create & Assign Problem"}
          </button>
          <button
            onClick={() => router.back()}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
export default function NewProblemPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading...</div>}>
      <NewProblemContent />
    </Suspense>
  );
}