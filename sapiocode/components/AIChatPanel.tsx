"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage, AssistantResponse } from "@/lib/types";

interface AIChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
    code: string;
    language: string;
    selectedSnippet: string;
}

export default function AIChatPanel({ isOpen, onClose, code, language, selectedSnippet }: AIChatPanelProps) {
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory, isLoading]);

    const send = async (msg?: string) => {
        const text = msg || input;
        if (!text.trim() || isLoading) return;

        const userMsg: ChatMessage = { role: "user", content: text };
        setChatHistory((prev) => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...chatHistory, userMsg],
                    codeContext: { code, language, selectedSnippet },
                }),
            });

            const data: AssistantResponse = await res.json();
            if (res.ok && data.content) {
                setChatHistory((prev) => [...prev, { role: "assistant", content: data.content }]);
            } else {
                throw new Error(data.error || "Failed to get response");
            }
        } catch (err: any) {
            setChatHistory((prev) => [...prev, { role: "assistant", content: `System Error: ${err.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    const shortcuts = [
        { label: "Debug System", msg: "Identify potential logic flaws in this code." },
        { label: "Optimize Runtime", msg: "Rewrite this for maximum execution efficiency." },
        { label: "Deconstruct Logic", msg: "Explain the architectural pattern used here." },
    ];

    return (
        <div className={`fixed top-0 right-0 h-full w-[540px] z-50 flex flex-col
                     bg-[#020408]/80 backdrop-blur-3xl border-l border-white/[0.08]
                     transform transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) shadow-[-32px_0_96px_-12px_rgba(0,0,0,0.9)]
                     ${isOpen ? "translate-x-0" : "translate-x-full"}`}>

            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-12 py-10 border-b border-white/5 bg-white/[0.01]">
                <div className="flex flex-col">
                    <span className="font-outfit text-xl font-black text-white tracking-tight">SapioBot</span>
                    <span className="font-outfit text-[10px] font-bold text-emerald-500/40 uppercase tracking-[0.4em] mt-1">Ready for Analysis</span>
                </div>
                <button onClick={onClose} className="w-12 h-12 rounded-lg glass-panel flex items-center justify-center hover:border-emerald-500/30 group transition-all">
                    <svg className="w-5 h-5 text-white/20 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-12 py-10 space-y-8 scrollbar-hide">
                {chatHistory.length === 0 && !isLoading && (
                    <div className="mt-8">
                        <p className="font-outfit text-xs font-black text-white/10 mb-8 uppercase tracking-[0.4em]">Initialize Conversation</p>
                        <div className="space-y-4">
                            {shortcuts.map((s) => (
                                <button
                                    key={s.label}
                                    onClick={() => send(s.msg)}
                                    className="w-full text-left px-8 py-6 rounded-xl glass-morphism border border-white/5
                             hover:bg-emerald-500/5 hover:border-emerald-500/20 group transition-all"
                                >
                                    <span className="font-outfit text-base font-bold text-white/40 group-hover:text-white transition-colors tracking-tight">{s.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {chatHistory.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
                        <div className={`max-w-[90%] rounded-xl px-8 py-6 text-base leading-relaxed shadow-2xl ${m.role === "user"
                            ? "bg-emerald-600 text-white font-bold font-outfit shadow-emerald-900/20"
                            : "glass-panel bg-white/[0.03] text-white/70 border-white/10 font-medium font-inter"
                            }`}>
                            <pre className="whitespace-pre-wrap break-words">{m.content}</pre>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="glass-panel border-white/5 rounded-lg px-8 py-5 flex items-center gap-4 bg-white/[0.02]">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-duration:0.6s]" />
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-duration:0.6s] [animation-delay:0.1s]" />
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-duration:0.6s] [animation-delay:0.2s]" />
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Deep Input Surface */}
            <div className="px-12 py-12 border-t border-white/5 bg-black/40">
                <div className="flex items-end gap-6">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="Command input signal..."
                        rows={1}
                        className="flex-1 bg-white/[0.03] border border-white/5 rounded-xl px-8 py-6
                       font-outfit text-lg font-bold text-white placeholder-white/5 resize-none
                       focus:outline-none focus:border-emerald-500/40 focus:bg-white/[0.05] transition-all leading-relaxed"
                        style={{ maxHeight: "200px" }}
                    />
                    <button
                        onClick={() => send()}
                        disabled={!input.trim() || isLoading}
                        className="h-16 w-16 shrink-0 rounded-xl bg-emerald-600 flex items-center justify-center
                       hover:bg-emerald-500 active:scale-90 shadow-[0_12px_48px_rgba(5,150,105,0.4)]
                       disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    >
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
