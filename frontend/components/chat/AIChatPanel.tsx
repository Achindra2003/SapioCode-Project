"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { X, Send, Trash2, Code2, Terminal, AlertTriangle, Brain, Zap } from "lucide-react";
import { ChatRequest, ChatMessage } from "@/lib/types";
import { aiApi } from "@/lib/api/ai";
import { sessionApi } from "@/lib/api/auth";
import { calculateFrustration, getFrustrationLevel } from "@/lib/frustration";

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  problemDescription: string;
  threadId: string;
  userId: string;
  editorContext: {
    idle_seconds: number;
    backspace_rate: number;
    paste_count: number;
    run_count: number;
  };
  compilerOutput?: string;
  failedTestCases?: Array<{
    input: string;
    expected_output: string;
    actual_output: string;
    error: string;
  }>;
  language?: string;
  starterCode?: string;
}

// ── Simple markdown-ish renderer for AI responses ──
function FormattedMessage({ content, role }: { content: string; role: "user" | "assistant" }) {
  if (role === "user") {
    return <span className="whitespace-pre-wrap break-words">{content}</span>;
  }

  // For assistant messages, render basic markdown
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={j} className="text-white font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      // Italic: *text*
      const italicParts = part.split(/(\*[^*]+\*)/g);
      return italicParts.map((ip, k) => {
        if (ip.startsWith("*") && ip.endsWith("*") && ip.length > 2) {
          return (
            <em key={`${j}-${k}`} className="text-[#44f91f]/80">
              {ip.slice(1, -1)}
            </em>
          );
        }
        return <span key={`${j}-${k}`}>{ip}</span>;
      });
    });

    // Bullet points
    if (line.match(/^\s*[-•]\s/)) {
      elements.push(
        <div key={i} className="flex gap-2 ml-2 my-0.5">
          <span className="text-[#44f91f]/60 shrink-0">•</span>
          <span>{rendered}</span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <div key={i} className="my-0.5">
          {rendered}
        </div>
      );
    }
  });

  return <div className="whitespace-pre-wrap break-words leading-relaxed">{elements}</div>;
}

export default function AIChatPanel({
  isOpen,
  onClose,
  code,
  problemDescription,
  threadId,
  userId,
  editorContext,
  compilerOutput = "",
  failedTestCases = [],
  language = "python",
  starterCode = "",
}: AIChatPanelProps) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Context awareness indicators (computed from props) ──
  const frustrationScore = useMemo(() => calculateFrustration(editorContext), [editorContext]);
  const frustrationLevel = useMemo(() => getFrustrationLevel(frustrationScore), [frustrationScore]);

  const contextPills = useMemo(() => {
    const pills: Array<{ icon: React.ReactNode; label: string; color: string }> = [];

    if (code.trim().length > 20) {
      pills.push({
        icon: <Code2 className="w-3 h-3" />,
        label: "Code loaded",
        color: "text-[#44f91f]/70 bg-[#44f91f]/10 border-[#44f91f]/10",
      });
    }

    if (compilerOutput) {
      pills.push({
        icon: <Terminal className="w-3 h-3" />,
        label: "Output captured",
        color: "text-blue-400/70 bg-blue-500/10 border-blue-500/10",
      });
    }

    if (failedTestCases.length > 0) {
      pills.push({
        icon: <AlertTriangle className="w-3 h-3" />,
        label: `${failedTestCases.length} failing test${failedTestCases.length > 1 ? "s" : ""}`,
        color: "text-red-400/70 bg-red-500/10 border-red-500/10",
      });
    }

    if (frustrationLevel === "high") {
      pills.push({
        icon: <Zap className="w-3 h-3" />,
        label: "High frustration",
        color: "text-amber-400/70 bg-amber-500/10 border-amber-500/10",
      });
    } else if (frustrationLevel === "medium") {
      pills.push({
        icon: <Brain className="w-3 h-3" />,
        label: "Moderate effort",
        color: "text-amber-400/50 bg-amber-500/5 border-amber-500/10",
      });
    }

    return pills;
  }, [code, compilerOutput, failedTestCases, frustrationLevel]);

  // ── Focus management ──
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // ── Load existing chat history from MongoDB on mount ──
  const [historyLoaded, setHistoryLoaded] = useState(false);
  useEffect(() => {
    if (!userId || historyLoaded) return;
    sessionApi
      .get(userId)
      .then((session) => {
        if (session.conversation_history?.length) {
          setChatHistory(
            session.conversation_history.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            }))
          );
        }
      })
      .catch(() => {
        // No existing session — start fresh
      })
      .finally(() => setHistoryLoaded(true));
  }, [userId, historyLoaded]);

  // ── Auto-scroll on new messages ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isLoading]);

  const send = useCallback(async () => {
    const text = input;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    setChatHistory((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Persist user message to MongoDB (fire-and-forget)
    sessionApi.addMessage(userId, "user", text.trim()).catch(() => {});

    try {
      const request: ChatRequest = {
        thread_id: threadId || `chat-${userId}`,
        mode: "chat",
        user_message: text.trim(),
        current_code: code,
        compiler_output: compilerOutput,
        frustration_score: Math.min(frustrationScore, 1.0),
        problem_description: problemDescription,
        failed_test_cases: failedTestCases,
        editor_context: editorContext,
        language: language || "python",
        starter_code: starterCode || undefined,
      };

      const response = await aiApi.chat(request);

      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: response.response },
      ]);

      // Persist assistant response to MongoDB (fire-and-forget)
      sessionApi.addMessage(userId, "assistant", response.response).catch(() => {});
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Please try again.";
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I couldn't reach the AI service. ${errMsg}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, threadId, userId, code, compilerOutput, frustrationScore, problemDescription, failedTestCases, editorContext, language, starterCode]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    setChatHistory([]);
    // Clear server-side history too
    if (userId) {
      sessionApi.clear(userId).catch(() => {});
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[540px] z-50 flex flex-col
        bg-[#0d130e]/95 backdrop-blur-3xl border-l border-[#44f91f]/10
        transform transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)
        ${isOpen ? "translate-x-0" : "translate-x-full pointer-events-none"}`}
    >
      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between px-8 py-5 border-b border-white/5 bg-white/[0.01]">
        <div className="flex flex-col">
          <span className="text-lg font-bold text-white tracking-tight">SapioBot</span>
          <span className="text-[10px] font-bold text-[#44f91f]/40 uppercase tracking-[0.3em] mt-0.5">
            Socratic Tutor
          </span>
        </div>
        <div className="flex items-center gap-2">
          {chatHistory.length > 0 && (
            <button
              onClick={clearChat}
              title="Clear conversation"
              className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/20 border border-white/10 transition-all group"
            >
              <Trash2 className="w-4 h-4 text-gray-500 group-hover:text-red-400 transition-colors" />
            </button>
          )}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center hover:border-[#44f91f]/30 border border-white/10 transition-all"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* ── Live context pills ── */}
      {contextPills.length > 0 && (
        <div className="shrink-0 px-8 py-2.5 border-b border-white/5 bg-white/[0.01] flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest mr-1">Context</span>
          {contextPills.map((pill, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${pill.color} transition-all`}
            >
              {pill.icon}
              {pill.label}
            </span>
          ))}
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
        {/* Empty state */}
        {chatHistory.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-[#44f91f]/10 border border-[#44f91f]/10 flex items-center justify-center mb-6">
              <Brain className="w-8 h-8 text-[#44f91f]/60" />
            </div>
            <h3 className="text-base font-bold text-white/60 mb-2">Ask me anything</h3>
            <p className="text-sm text-white/25 max-w-xs leading-relaxed">
              I can see your code, test results, and how you&apos;re working.
              I&apos;ll guide you with questions — never give away the answer.
            </p>
          </div>
        )}

        {chatHistory.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
          >
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-[#44f91f]/10 flex items-center justify-center shrink-0 mt-1 mr-3">
                <Brain className="w-3.5 h-3.5 text-[#44f91f]/60" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-[14px] leading-relaxed ${
                m.role === "user"
                  ? "bg-[#44f91f]/90 text-black font-medium rounded-br-md"
                  : "bg-white/[0.04] text-white/75 border border-white/[0.06] rounded-bl-md"
              }`}
            >
              <FormattedMessage content={m.content} role={m.role} />
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="w-7 h-7 rounded-lg bg-[#44f91f]/10 flex items-center justify-center shrink-0 mt-1 mr-3">
              <Brain className="w-3.5 h-3.5 text-[#44f91f]/60" />
            </div>
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-md px-5 py-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#44f91f] animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#44f91f] animate-bounce [animation-delay:0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#44f91f] animate-bounce [animation-delay:0.3s]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      <div className="shrink-0 px-8 py-5 border-t border-white/5 bg-black/30">
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKey}
            placeholder="Ask about your code..."
            rows={1}
            className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-5 py-3.5
              text-[14px] font-medium text-white placeholder-white/15 resize-none
              focus:outline-none focus:border-[#44f91f]/30 focus:bg-white/[0.06] transition-all"
            style={{ maxHeight: "160px" }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || isLoading}
            className="h-12 w-12 shrink-0 rounded-xl bg-[#44f91f] flex items-center justify-center
              hover:brightness-110 active:scale-95 shadow-[0_0_20px_rgba(68,249,31,0.3)]
              disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-5 h-5 text-black" />
          </button>
        </div>
        <p className="text-[10px] text-white/10 mt-2 text-center">
          Every message includes your latest code &amp; editor state
        </p>
      </div>
    </div>
  );
}
