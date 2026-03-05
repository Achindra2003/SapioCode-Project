"use client";

interface OutputConsoleProps {
    output: string;
    error: string | null;
    executionTime: string | null;
    status: "idle" | "running" | "success" | "error" | "timeout";
}

const statusMap = {
    idle: { text: "Standby", color: "text-white/20", glow: "" },
    running: { text: "Executing", color: "text-emerald-400", glow: "shadow-[0_0_12px_rgba(16,185,129,0.5)]" },
    success: { text: "Completed", color: "text-emerald-400", glow: "" },
    error: { text: "Halted", color: "text-red-400", glow: "" },
    timeout: { text: "Timed Out", color: "text-amber-400", glow: "" },
};

export default function OutputConsole({ output, error, executionTime, status }: OutputConsoleProps) {
    const st = statusMap[status];

    return (
        <div className="h-full flex flex-col font-mono selection:bg-emerald-500/20 bg-[#0d1117]">
            {/* Console Feed */}
            <div className="flex-1 overflow-auto px-8 py-6 text-base leading-relaxed">
                {status === "idle" && !output && !error && (
                    <div className="flex flex-col gap-2">
                        <span className="text-white/5 uppercase tracking-[0.2em] font-bold text-xs animate-pulse">Initializing Interface...</span>
                        <span className="text-white/10 italic font-medium">Waiting for code execution signal.</span>
                    </div>
                )}

                {status === "running" && !output && !error && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4 text-emerald-400/60">
                            <span className="w-5 h-5 border-2 border-emerald-400/20 border-t-emerald-400 rounded-md animate-spin" />
                            <span className="font-bold tracking-widest text-xs uppercase animate-pulse">Processing Cluster Data...</span>
                        </div>
                    </div>
                )}

                {output && <pre className="whitespace-pre-wrap text-white/70 font-medium selection:text-white selection:bg-emerald-500/40">{output}</pre>}
                {error && <pre className="whitespace-pre-wrap text-red-400/80 font-bold bg-red-400/5 p-6 rounded-xl border border-red-500/10 mt-2">{error}</pre>}

                {(output || error) && status !== "running" && (
                    <div className="mt-8 pt-8 border-t border-white/5 flex items-center gap-4">
                        <span className="text-[10px] font-black text-white/10 uppercase tracking-widest">End of Stream</span>
                        <div className="flex-1 h-px bg-white/5" />
                    </div>
                )}
            </div>
        </div>
    );
}
