"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d130e] px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center relative z-10 max-w-md">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">Something went wrong</h2>
        <p className="text-slate-400 mb-2">
          An unexpected error occurred. This has been logged.
        </p>
        {error.message && (
          <p className="text-sm text-red-400/70 bg-red-500/5 border border-red-500/10 rounded-lg px-4 py-2 mb-6 font-mono">
            {error.message}
          </p>
        )}

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#44f91f] text-black font-semibold rounded-xl hover:brightness-110 transition-all shadow-[0_0_20px_rgba(68,249,31,0.2)]"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 glass-panel rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
