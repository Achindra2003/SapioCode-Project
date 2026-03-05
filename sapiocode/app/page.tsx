"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import LanguageSelector from "@/components/LanguageSelector";
import OutputConsole from "@/components/OutputConsole";
import AIChatPanel from "@/components/AIChatPanel";
import Dither from "@/components/Dither";
import { PROBLEMS, LANGUAGES } from "@/lib/constants";

const MonacoEditor = dynamic(() => import("@/components/MonacoEditor"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#020408]/50 animate-pulse" />,
});

function WorkbenchContent() {
  const searchParams = useSearchParams();
  const questionId = searchParams.get("questionId");

  const [language, setLanguage] = useState("python3");
  const [code, setCode] = useState(LANGUAGES.python3.starter);
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error" | "timeout">("idle");
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);

  const question = questionId ? PROBLEMS.find((p) => p.id === questionId) : null;
  const allQuestions = Object.values(PROBLEMS);

  useEffect(() => {
    const timer = setTimeout(() => setQuestionsLoaded(true), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (question) {
      setCode(question.starterCode[language] || LANGUAGES[language].starter);
    }
  }, [question, language, LANGUAGES]);

  const handleLanguageChange = useCallback((newLang: string) => {
    setLanguage(newLang);
    if (!questionId) {
      setCode(LANGUAGES[newLang as keyof typeof LANGUAGES].starter);
    }
  }, [questionId]);

  const handleRunCode = async () => {
    if (status === "running") return;
    setStatus("running");
    setOutput("");
    setError(null);
    setExecutionTime(null);

    const startTime = performance.now();

    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, stdin }),
      });
      const data = await res.json();
      const endTime = performance.now();
      setExecutionTime(`${(endTime - startTime).toFixed(2)}ms`);

      if (!res.ok) throw new Error(data.error || "Execution failed");
      setOutput(data.output || "");
      setError(data.error || null);
      setStatus(data.error ? "error" : "success");
    } catch (err: any) {
      setError(err.message);
      setStatus("error");
    }
  };

  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const monacoLanguage = LANGUAGES[language as keyof typeof LANGUAGES].monaco;

  return (
    <main className="h-screen w-screen bg-[#0d1117] text-[#e6edf3] font-inter flex flex-col overflow-hidden relative">
      {/* Background Dither (subtle layer) */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <Dither
          waveColor={[0.1, 0.2, 0.3]}
          disableAnimation={false}
          enableMouseInteraction
          mouseRadius={0.3}
          colorNum={4}
          waveAmplitude={0.2}
          waveFrequency={1.5}
          waveSpeed={0.01}
          pixelSize={1}
        />
      </div>

      {/* ═══ TOP NAVIGATION BAR ═══ */}
      <nav className="h-14 flex items-center justify-between px-4 border-b border-white/5 bg-[#0d1117]/80 backdrop-blur-md z-30 shrink-0">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/5 rounded-md transition-colors">
            <svg className="w-5 h-5 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="font-outfit text-xl font-black tracking-tight flex items-center gap-1">
              sapio<span className="text-emerald-500">code</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/5 rounded-md transition-colors">
            <svg className="w-5 h-5 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button className="px-5 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-black uppercase tracking-widest transition-all">Sign in</button>
        </div>
      </nav>

      {/* ═══ MAIN SPLIT WORKSPACE ═══ */}
      <div className="flex-1 flex overflow-hidden z-10">

        {/* ── Left Column: Problem Description ── */}
        <aside className="w-1/2 flex flex-col border-r border-white/5 bg-[#0d1117]">
          {/* Tabs Bar */}
          <div className="h-10 flex items-center px-4 border-b border-white/5 gap-6 shrink-0 bg-[#161b22]">
            <button className="h-full flex items-center gap-2 border-b-2 border-white px-2 text-xs font-bold tracking-tight">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Question
            </button>
            <button className="h-full flex items-center gap-2 text-white/40 hover:text-white transition-colors px-2 text-xs font-bold tracking-tight">
              <svg className="w-4 h-4 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Solution
            </button>
            <button className="h-full flex items-center gap-2 text-white/40 hover:text-white transition-colors px-2 text-xs font-bold tracking-tight">
              <svg className="w-4 h-4 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Solution
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-10 scrollbar-hide">
            {question ? (
              <div className="animate-fade-in max-w-2xl mx-auto lg:mx-0">
                <h1 className="text-3xl font-bold text-white mb-6 uppercase tracking-tight">{question.title}</h1>
                <div className="flex items-center gap-4 mb-8">
                  <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${question.difficulty === "easy" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    question.difficulty === "medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                      "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                    {question.difficulty}
                  </span>
                  <span className="text-xs font-bold text-white/20 bg-white/5 px-3 py-1 rounded-full border border-white/5 uppercase tracking-widest">Topics</span>
                  <span className="text-xs font-bold text-white/20 bg-white/5 px-3 py-1 rounded-full border border-white/5 uppercase tracking-widest">Companies</span>
                </div>

                <div className="prose prose-invert max-w-none">
                  <p className="text-[#e6edf3]/70 text-base leading-relaxed mb-10 whitespace-pre-wrap">
                    {question.description}
                  </p>

                  {/* NeetCode Style Example View */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <span className="text-sm font-black uppercase tracking-widest text-[#e6edf3]/30">Example 1:</span>
                      <div className="bg-white/[0.03] border border-white/5 rounded-lg p-6 font-mono text-sm">
                        <div className="flex gap-2">
                          <span className="text-emerald-400">Input:</span>
                          <span className="text-white/60">nums = [1, 2, 3, 3]</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <span className="text-emerald-400">Output:</span>
                          <span className="text-white/60">true</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <span className="text-xs font-black uppercase tracking-[.3em] text-white/20 mb-6 block">Problem Library</span>
                {!questionsLoaded ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-lg bg-white/[0.03] animate-pulse" />
                  ))
                ) : (
                  allQuestions.map((q, i) => (
                    <a
                      key={q.id}
                      href={`?questionId=${q.id}`}
                      className="group flex items-center justify-between p-6 rounded-lg bg-white/[0.01] border border-white/5 hover:bg-white/[0.04] transition-all"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors tracking-tight">{q.title}</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${q.difficulty === "easy" ? "text-emerald-500/40" : "text-amber-500/40"}`}>{q.difficulty}</span>
                      </div>
                      <svg className="w-5 h-5 text-white/5 group-hover:text-emerald-500 transition-colors" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M6 12.796L11.481 8 6 3.204v9.592zm.659-8.905L10.121 8l-3.462 4.109V3.891z" />
                      </svg>
                    </a>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ── Right Column: Code Editor ── */}
        <div className="w-1/2 flex flex-col bg-[#0d1117] relative">

          {/* Editor Header Toolbar */}
          <div className="h-10 flex items-center justify-between px-4 border-b border-white/5 shrink-0 bg-[#161b22]">
            <div className="flex items-center gap-4">
              <LanguageSelector value={language} onChange={handleLanguageChange} disabled={status === "running"} />
              <button className="p-1 hover:bg-white/5 rounded transition-colors" title="Info">
                <svg className="w-4 h-4 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setIsAIOpen(true)} className="flex items-center gap-3 h-10 px-5 bg-white/5 border border-white/5 hover:border-emerald-500/20 hover:bg-emerald-500/5 rounded-lg transition-all group">
                <div className="w-4 h-4 rounded-sm border border-emerald-500/40 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 group-hover:bg-emerald-500" />
                </div>
                <span className="text-[11px] font-black text-white/40 group-hover:text-emerald-400 uppercase tracking-widest leading-none">SapioBot</span>
              </button>
              <div className="w-px h-4 bg-white/5 mx-1" />
              <span className="text-[10px] font-bold text-white/10 uppercase tracking-widest tabular-nums">Ln 1, Col 1</span>
              <button className="p-1 hover:bg-white/5 rounded transition-colors text-white/40">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 bg-[#0d1117]">
            <MonacoEditor language={monacoLanguage} value={code} onChange={setCode} onRunCode={handleRunCode} />
          </div>

          {/* Collapsible Console Bar */}
          <div className={`transition-all duration-300 flex flex-col shrink-0 z-20 ${isConsoleOpen ? 'h-64' : 'h-12'}`}>
            <div className="h-12 border-t border-white/5 bg-[#161b22] px-6 flex items-center justify-between shrink-0">
              <button onClick={() => setIsConsoleOpen(!isConsoleOpen)} className="flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white transition-colors uppercase tracking-widest">
                Console
                <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${isConsoleOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                </svg>
              </button>

              <div className="flex items-center gap-4">
                <button
                  onClick={handleRunCode}
                  disabled={status === "running"}
                  className="min-w-[140px] h-12 bg-[#262626] border border-white/10 hover:border-white/20 hover:bg-[#333333] rounded-xl text-sm font-black text-white transition-all uppercase tracking-[0.15em] disabled:opacity-40 active:scale-95 flex items-center justify-center gap-3 shrink-0"
                >
                  <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {status === "running" ? "Running" : "Run"}
                </button>
                <button
                  disabled={status === "running"}
                  className="min-w-[140px] h-12 bg-[#2cbb5d] hover:bg-[#32d86c] rounded-xl text-sm font-black text-white transition-all uppercase tracking-[0.15em] disabled:opacity-40 active:scale-95 shadow-[0_4px_25px_rgba(44,187,93,0.3)] hover:shadow-[0_8px_30px_rgba(44,187,93,0.4)] flex items-center justify-center gap-3 shrink-0"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m-7 7l7-7 7 7" />
                  </svg>
                  Submit
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#0d1117] overflow-hidden">
              <OutputConsole output={output} error={error} executionTime={executionTime} status={status} />
            </div>
          </div>
        </div>
      </div>

      <AIChatPanel isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} code={code} language={language} selectedSnippet={""} />
    </main>
  );
}

export default function WorkbenchPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-[#020408]" />}>
      <WorkbenchContent />
    </Suspense>
  );
}
