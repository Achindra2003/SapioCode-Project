"use client";

import { TestResult } from "@/lib/types";

interface OutputConsoleProps {
  output: string;
  error: string | null;
  executionTime: string | null;
  status: "idle" | "running" | "success" | "error";
  testResults?: TestResult[];
}

export default function OutputConsole({
  output,
  error,
  executionTime,
  status,
  testResults,
}: OutputConsoleProps) {
  return (
    <div className="h-full flex flex-col bg-[#0d1117] text-[#e6edf3] font-mono text-sm overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {status === "running" && (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-2 h-2 bg-[#44f91f] rounded-full animate-pulse" />
            <span>Running...</span>
          </div>
        )}

        {testResults && testResults.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
              Test Results
            </div>
            {testResults.map((result, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border ${
                  result.passed
                    ? "bg-[#44f91f]/10 border-[#44f91f]/20"
                    : "bg-red-500/10 border-red-500/20"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-bold ${
                      result.passed ? "text-[#44f91f]" : "text-red-400"
                    }`}
                  >
                    {result.passed ? "✓ PASS" : "✗ FAIL"}
                  </span>
                  <span className="text-xs text-gray-500">Test {i + 1}</span>
                </div>
                <div className="text-xs text-gray-400 mb-1">
                  Input: {result.input}
                </div>
                <div className="text-xs text-gray-400">
                  Output: {result.actualOutput || "(empty)"}
                </div>
                {!result.passed && result.error && (
                  <div className="text-xs text-red-400 mt-1">{result.error}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {output && (
          <pre className="whitespace-pre-wrap break-words text-gray-300">{output}</pre>
        )}

        {error && (
          <div className="text-red-400">
            <span className="font-bold">Error: </span>
            {error}
          </div>
        )}

        {status === "idle" && !output && !error && (!testResults || testResults.length === 0) && (
          <div className="text-gray-500 italic">
            Click &quot;Run&quot; to execute your code...
          </div>
        )}
      </div>

      {executionTime && (
        <div className="border-t border-white/5 px-4 py-2 text-xs text-gray-500">
          Execution time: {executionTime}
        </div>
      )}
    </div>
  );
}
