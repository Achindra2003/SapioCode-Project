"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { X, Send, Trash2, Code2, Terminal, AlertTriangle, Brain, Zap, Minus } from "lucide-react";
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

  // For assistant messages, render markdown with code blocks, inline code, bold, italic, lists
  const elements: React.ReactNode[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block: ```lang ... ```
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <div key={elements.length} className="my-2 rounded-lg overflow-hidden border border-white/10">
          {lang && (
            <div className="px-3 py-1 bg-white/5 text-xs text-slate-500 font-mono">{lang}</div>
          )}
          <pre className="px-3 py-2 bg-black/40 text-[#e6edf3] text-xs font-mono overflow-x-auto whitespace-pre">
            {codeLines.join("\n")}
          </pre>
        </div>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={elements.length} className="h-2" />);
      i++;
      continue;
    }

    // Inline formatting helper
    const renderInline = (text: string): React.ReactNode[] => {
      // Process: **bold**, *italic*, `inline code`
      const tokens = text.split(/(```[^`]*```|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
      return tokens.map((tok, j) => {
        if (tok.startsWith("**") && tok.endsWith("**")) {
          return <strong key={j} className="text-white font-semibold">{tok.slice(2, -2)}</strong>;
        }
        if (tok.startsWith("`") && tok.endsWith("`") && tok.length > 2) {
          return (
            <code key={j} className="px-1.5 py-0.5 rounded bg-white/10 text-[#44f91f] text-xs font-mono">
              {tok.slice(1, -1)}
            </code>
          );
        }
        if (tok.startsWith("*") && tok.endsWith("*") && tok.length > 2) {
          return <em key={j} className="text-[#44f91f]/80">{tok.slice(1, -1)}</em>;
        }
        return <span key={j}>{tok}</span>;
      });
    };

    // Numbered list: 1. text, 2. text, etc.
    const numberedMatch = line.match(/^\s*(\d+)[.)]\s+(.*)/);
    if (numberedMatch) {
      elements.push(
        <div key={elements.length} className="flex gap-2 ml-2 my-0.5">
          <span className="text-[#44f91f]/60 shrink-0 font-mono text-xs mt-0.5">{numberedMatch[1]}.</span>
          <span>{renderInline(numberedMatch[2])}</span>
        </div>
      );
      i++;
      continue;
    }

    // Bullet points
    if (line.match(/^\s*[-•]\s/)) {
      elements.push(
        <div key={elements.length} className="flex gap-2 ml-2 my-0.5">
          <span className="text-[#44f91f]/60 shrink-0">•</span>
          <span>{renderInline(line.replace(/^\s*[-•]\s/, ""))}</span>
        </div>
      );
      i++;
      continue;
    }

    // Regular line
    elements.push(
      <div key={elements.length} className="my-0.5">
        {renderInline(line)}
      </div>
    );
    i++;
  }

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
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Store the last failed request so we can retry
  const lastFailedRef = useRef<{ text: string } | null>(null);

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

  // ── Track how long the AI has been thinking ──
  useEffect(() => {
    if (!isLoading) {
      setLoadingSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLoading]);

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

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    setChatHistory((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    lastFailedRef.current = null;

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
      lastFailedRef.current = { text: text.trim() };
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠ ${errMsg}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, threadId, userId, code, compilerOutput, frustrationScore, problemDescription, failedTestCases, editorContext, language, starterCode]);

  const send = useCallback(async () => {
    await sendMessage(input);
  }, [input, sendMessage]);

  const retryLast = useCallback(async () => {
    if (!lastFailedRef.current) return;
    const failedText = lastFailedRef.current.text;
    // Remove the error message from history
    setChatHistory((prev) => {
      const copy = [...prev];
      // Remove the last assistant error message
      if (copy.length && copy[copy.length - 1].role === "assistant") {
        copy.pop();
      }
      // Remove the user message too (sendMessage will re-add it)
      if (copy.length && copy[copy.length - 1].role === "user") {
        copy.pop();
      }
      return copy;
    });
    lastFailedRef.current = null;
    await sendMessage(failedText);
  }, [sendMessage]);

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
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const [minimized, setMinimized] = useState(false);

  // ── Drag-to-move support ──
  const [position, setPosition] = useState({ x: 0, y: 0 }); // offset from default bottom-right
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // Only handle left-click on the header area itself (not buttons)
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };

    const handleDragMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setPosition({
        x: dragRef.current.startPosX + dx,
        y: dragRef.current.startPosY + dy,
      });
    };

    const handleDragEnd = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
    };

    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);
  }, [position]);

  // Reset position when closing/reopening
  useEffect(() => {
    if (!isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // When minimized, show just a small pill
  if (isOpen && minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl glass-panel border-[#44f91f]/20 shadow-lg hover:bg-white/5 transition-all group"
      >
        <span className="w-2 h-2 rounded-full bg-[#44f91f] shadow-[0_0_6px_rgba(68,249,31,0.5)]" />
        <span className="text-sm font-semibold text-white">Socratic AI</span>
        {chatHistory.length > 0 && (
          <span className="ml-1 w-5 h-5 rounded-full bg-[#44f91f]/20 text-[#44f91f] text-[10px] font-bold flex items-center justify-center">
            {chatHistory.filter(m => m.role === "assistant").length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      className={`fixed bottom-4 right-4 z-50 w-[380px] max-h-[520px] flex flex-col
        glass-panel rounded-2xl border-[#44f91f]/15 shadow-2xl shadow-black/40
        ${isOpen ? "scale-100 opacity-100" : "scale-90 opacity-0 pointer-events-none"}`}
    >
      {/* ── Header (drag handle) ── */}
      <div
        onMouseDown={handleDragStart}
        className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#44f91f] shadow-[0_0_6px_rgba(68,249,31,0.5)]" />
          <span className="text-sm font-bold text-white">Socratic AI</span>
        </div>
        <div className="flex items-center gap-1">
          {chatHistory.length > 0 && (
            <button
              onClick={clearChat}
              title="Clear conversation"
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-all group"
            >
              <Trash2 className="w-3.5 h-3.5 text-gray-500 group-hover:text-red-400 transition-colors" />
            </button>
          )}
          <button
            onClick={() => setMinimized(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all"
            title="Close"
          >
            <X className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* ── Context pills (compact) ── */}
      {contextPills.length > 0 && (
        <div className="shrink-0 px-4 py-1.5 border-b border-white/5 flex items-center gap-1.5 flex-wrap">
          {contextPills.map((pill, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full border ${pill.color} transition-all`}
            >
              {pill.icon}
              {pill.label}
            </span>
          ))}
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0" style={{ maxHeight: "340px" }}>
        {/* Empty state */}
        {chatHistory.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-[#44f91f]/10 border border-[#44f91f]/10 flex items-center justify-center mb-3">
              <Brain className="w-5 h-5 text-[#44f91f]/60" />
            </div>
            <p className="text-xs text-white/30 max-w-[220px] leading-relaxed">
              I can see your code and test results. Ask me anything — I&apos;ll guide you with questions.
            </p>
          </div>
        )}

        {chatHistory.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
          >
            {m.role === "assistant" && (
              <div className="w-6 h-6 rounded-lg bg-[#44f91f]/10 flex items-center justify-center shrink-0 mt-1 mr-2">
                <Brain className="w-3 h-3 text-[#44f91f]/60" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                m.role === "user"
                  ? "bg-[#44f91f]/90 text-black font-medium rounded-br-sm"
                  : m.content.startsWith("⚠")
                    ? "bg-red-500/10 text-red-300/90 border border-red-500/20 rounded-bl-sm"
                    : "bg-white/5 text-white/80 border border-white/5 rounded-bl-sm"
              }`}
            >
              <FormattedMessage content={m.content} role={m.role} />
              {m.role === "assistant" && m.content.startsWith("⚠") && lastFailedRef.current && i === chatHistory.length - 1 && (
                <button
                  onClick={retryLast}
                  className="mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 text-white/70 hover:bg-white/15 hover:text-white transition-all border border-white/10"
                >
                  ↻ Retry
                </button>
              )}
              {m.role === "assistant" && !m.content.startsWith("⚠") && (
                <div className="text-[9px] text-white/20 mt-1">AI response</div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="w-6 h-6 rounded-lg bg-[#44f91f]/10 flex items-center justify-center shrink-0 mt-1 mr-2">
              <Brain className="w-3 h-3 text-[#44f91f]/60" />
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#44f91f] animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#44f91f] animate-bounce [animation-delay:0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#44f91f] animate-bounce [animation-delay:0.3s]" />
              </div>
              {loadingSeconds >= 8 && (
                <div className="text-[10px] text-white/30 mt-1.5">
                  {loadingSeconds >= 20
                    ? "Still working on it..."
                    : "Analyzing your code..."}
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      <div className="shrink-0 px-3 py-3 border-t border-white/5">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKey}
            placeholder="Type your answer..."
            rows={1}
            className="flex-1 bg-white/5 border border-white/5 rounded-xl px-3.5 py-2.5
              text-[13px] text-white placeholder-white/20 resize-none
              focus:outline-none focus:border-[#44f91f]/30 focus:bg-white/[0.06] transition-all"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || isLoading}
            className="h-10 w-10 shrink-0 rounded-xl bg-[#44f91f] flex items-center justify-center
              hover:brightness-110 active:scale-95 shadow-[0_0_12px_rgba(68,249,31,0.3)]
              disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
}
