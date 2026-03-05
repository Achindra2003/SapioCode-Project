"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  RefreshCw,
  X,
  MessageSquare,
  Loader2,
  Radio,
} from "lucide-react";
import {
  teacherAPI,
  type Classroom,
  type HeatmapData,
} from "@/lib/api/teacher";

const SSE_URL =
  (process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:8000") +
  "/progress/stream/live";

function AnalyticsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClassId = searchParams.get("classId") || "";

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(preselectedClassId);
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setLoadingClasses] = useState(true);

  // SSE live connection status
  const [isLive, setIsLive] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Transcript modal
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcriptStudent, setTranscriptStudent] = useState<{ id: string; name: string } | null>(null);
  const [transcriptMessages, setTranscriptMessages] = useState<Array<{ role: string; content: string; timestamp?: string }>>([]);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  const openTranscript = async (studentId: string, studentName: string) => {
    setTranscriptStudent({ id: studentId, name: studentName });
    setTranscriptOpen(true);
    setLoadingTranscript(true);
    try {
      const data = await teacherAPI.getStudentTranscript(studentId);
      setTranscriptMessages(data.history || []);
    } catch {
      setTranscriptMessages([]);
    } finally {
      setLoadingTranscript(false);
    }
  };

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

  useEffect(() => {
    if (!selectedClassId) return;
    fetchAnalytics();
  }, [selectedClassId]);

  const fetchAnalytics = useCallback(async () => {
    if (!selectedClassId) return;
    setLoading(true);
    try {
      const data = await teacherAPI.getAnalytics(selectedClassId);
      setHeatmap(data);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [selectedClassId]);

  // ── SSE: live progress stream from backend ───────────────
  useEffect(() => {
    const es = new EventSource(SSE_URL);
    eventSourceRef.current = es;

    es.onopen = () => setIsLive(true);

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === "progress_update") {
          setLastEvent(
            `${payload.viva_verdict} — ${new Date().toLocaleTimeString()}`
          );
          // Auto-refresh heatmap when any student makes progress
          if (selectedClassId) {
            fetchAnalytics();
          }
        }
      } catch {
        // ignore unparseable keepalive frames
      }
    };

    es.onerror = () => {
      setIsLive(false);
      // EventSource auto-reconnects
    };

    return () => {
      es.close();
      setIsLive(false);
    };
  }, [selectedClassId, fetchAnalytics]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "mastered":
        return "bg-[#44f91f]";
      case "in_progress":
        return "bg-[#44f91f]/40";
      case "attempted":
        return "bg-amber-500/60";
      default:
        return "bg-white/5";
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case "mastered":
        return "text-black";
      case "in_progress":
        return "text-white";
      case "attempted":
        return "text-white";
      default:
        return "text-slate-600";
    }
  };

  return (
    <div className="p-8 max-w-[90rem] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push("/teacher")}
          className="p-2 hover:bg-white/5 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#44f91f]" />
            Class Analytics
          </h1>
          <p className="text-sm text-slate-400">
            Student progress heatmap across assigned problems
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
            isLive
              ? "border-[#44f91f]/30 bg-[#44f91f]/10 text-[#44f91f]"
              : "border-white/10 bg-white/5 text-slate-500"
          }`}>
            <Radio className={`w-3 h-3 ${isLive ? "animate-pulse" : ""}`} />
            {isLive ? "LIVE" : "Connecting..."}
          </div>
          <button
            onClick={fetchAnalytics}
            disabled={loading || !selectedClassId}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300 hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Class selector */}
      <div className="mb-8">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
          Select Classroom
        </label>
        <div className="relative w-80">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#44f91f]/40 focus:outline-none appearance-none"
          >
            <option value="">Choose a classroom</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* Heatmap */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-pulse text-[#44f91f]/60">
            Loading analytics...
          </div>
        </div>
      ) : !heatmap ? (
        <div className="glass-morphism rounded-2xl p-12 text-center">
          <BarChart3 className="w-16 h-16 text-[#44f91f]/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Select a Classroom
          </h3>
          <p className="text-slate-400">
            Choose a classroom to view the student progress heatmap.
          </p>
        </div>
      ) : heatmap.rows.length === 0 ? (
        <div className="glass-morphism rounded-2xl p-12 text-center">
          <BarChart3 className="w-16 h-16 text-[#44f91f]/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No Student Data Yet
          </h3>
          <p className="text-slate-400">
            Students will appear here once they join and start working on
            problems.
          </p>
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className="flex items-center gap-6 mb-4">
            {[
              { label: "Mastered", color: "bg-[#44f91f]" },
              { label: "In Progress", color: "bg-[#44f91f]/40" },
              { label: "Attempted", color: "bg-amber-500/60" },
              { label: "Not Started", color: "bg-white/5" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${item.color}`} />
                <span className="text-xs text-slate-400">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Live event banner */}
          {lastEvent && (
            <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-[#44f91f]/5 border border-[#44f91f]/10 rounded-xl text-xs text-[#44f91f]/70 animate-fade-in">
              <Radio className="w-3 h-3" />
              Latest update: {lastEvent}
            </div>
          )}

          {/* Heatmap Grid */}
          <div className="glass-morphism rounded-2xl p-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-xs text-slate-500 font-semibold p-3 w-48 sticky left-0 bg-[#152016]/80 backdrop-blur-sm z-10">
                    Student
                  </th>
                  {heatmap.columns.map((col) => (
                    <th
                      key={col.problem_id}
                      className="text-center p-3 min-w-[100px]"
                    >
                      <div className="text-[10px] text-slate-500 truncate max-w-[100px]">
                        {col.title}
                      </div>
                      <span
                        className={`text-[9px] font-bold inline-block mt-1 px-1.5 py-0.5 rounded ${
                          col.difficulty === "advanced"
                            ? "bg-red-500/10 text-red-400"
                            : col.difficulty === "intermediate"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        {col.difficulty}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.rows.map((row) => (
                  <tr
                    key={row.student_id}
                    className="border-t border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="p-3 sticky left-0 bg-[#152016]/80 backdrop-blur-sm z-10">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate flex-1">
                          {row.student_name}
                        </p>
                        <button
                          onClick={() => openTranscript(row.student_id, row.student_name)}
                          className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"
                          title="View chat transcript"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#44f91f]/60" />
                        </button>
                      </div>
                    </td>
                    {row.cells.map((cell, ci) => (
                      <td key={ci} className="p-2 text-center">
                        <div
                          onClick={() => cell.status !== "not_started" && openTranscript(row.student_id, row.student_name)}
                          className={`
                            mx-auto w-14 h-14 rounded-xl flex flex-col items-center justify-center
                            ${getStatusColor(cell.status)}
                            transition-all hover:scale-110 ${cell.status !== "not_started" ? "cursor-pointer" : "cursor-default"}
                          `}
                          title={`${row.student_name}: ${heatmap.columns[ci]?.title || ""} — ${cell.status}${cell.status !== "not_started" ? " (click for transcript)" : ""}`}
                        >
                          <span
                            className={`text-xs font-bold ${getStatusTextColor(
                              cell.status
                            )}`}
                          >
                            {cell.status === "not_started"
                              ? "—"
                              : cell.status === "mastered"
                              ? `${Math.round(cell.viva_score * 100)}%`
                              : cell.attempts > 0
                              ? `${cell.attempts}`
                              : "—"}
                          </span>
                          {cell.status !== "not_started" && (
                            <span
                              className={`text-[8px] ${getStatusTextColor(
                                cell.status
                              )} opacity-70`}
                            >
                              {cell.status === "mastered"
                                ? "viva"
                                : cell.attempts > 0
                                ? "tries"
                                : ""}
                            </span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Transcript Modal */}
      {transcriptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[80vh] bg-[#152016] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Chat Transcript
                </h3>
                <p className="text-xs text-slate-400">
                  {transcriptStudent?.name}
                </p>
              </div>
              <button
                onClick={() => { setTranscriptOpen(false); setTranscriptMessages([]); }}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingTranscript ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-[#44f91f] animate-spin" />
                </div>
              ) : transcriptMessages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-white/10 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No chat messages yet for this student.</p>
                </div>
              ) : (
                transcriptMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                        msg.role === "user"
                          ? "bg-[#44f91f]/10 border border-[#44f91f]/20 text-white"
                          : "bg-white/5 border border-white/5 text-slate-300"
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 opacity-50">
                        {msg.role === "user" ? "Student" : "SapioBot"}
                      </span>
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      {msg.timestamp && (
                        <span className="text-[9px] text-slate-600 block mt-1">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading analytics...</div>}>
      <AnalyticsContent />
    </Suspense>
  );
}
