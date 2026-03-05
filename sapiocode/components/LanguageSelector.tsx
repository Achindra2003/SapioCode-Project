"use client";

import { useState, useRef, useEffect } from "react";
import { LANGUAGES } from "@/lib/constants";

interface LanguageSelectorProps {
    value: string;
    onChange: (language: string) => void;
    disabled?: boolean;
}

export default function LanguageSelector({ value, onChange, disabled }: LanguageSelectorProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = Object.entries(LANGUAGES).find(([key]) => key === value)?.[1];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={ref} className="relative">
            {/* Precision Trigger */}
            <button
                onClick={() => !disabled && setOpen(!open)}
                disabled={disabled}
                className="group flex items-center gap-3 h-10 px-4 glass-panel rounded-lg
                   border-white/5 hover:border-white/20 transition-all active:scale-95
                   disabled:opacity-30 disabled:cursor-not-allowed"
            >
                <span className="font-outfit text-sm font-bold text-white tracking-tight">
                    {selected?.label || value}
                </span>
                <svg className={`w-3.5 h-3.5 text-white/40 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
            </button>

            {/* Glass Selection Dial */}
            {open && (
                <div className="absolute top-[calc(100%+1rem)] left-0 w-72 glass-panel rounded-xl py-6 z-50 animate-slide-up [animation-duration:0.2s] border-white/10">
                    <div className="px-8 pb-4 mb-4 border-b border-white/5">
                        <span className="font-outfit text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Select Protocol</span>
                    </div>
                    <div className="px-3 space-y-1">
                        {Object.entries(LANGUAGES).map(([key, config]) => (
                            <button
                                key={key}
                                onClick={() => {
                                    onChange(key);
                                    setOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-6 py-4 rounded-lg transition-all
                           ${value === key
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        : "hover:bg-white/[0.03] text-white/40 hover:text-white/80 border border-transparent hover:border-white/5"}`}
                            >
                                <div className="flex flex-col items-start">
                                    <span className="font-outfit text-base font-bold tracking-tight">{config.label}</span>
                                </div>
                                {value === key && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
