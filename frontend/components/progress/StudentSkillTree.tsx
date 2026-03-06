"use client";

import { useEffect, useState, useRef } from "react";
import {
  Lock,
  CheckCircle,
  Zap,
  ChevronRight,
  Trophy,
} from "lucide-react";
import { skillTreeApi, type SkillTreeNode, type SkillTreeData } from "@/lib/api/teacher";

interface StudentSkillTreeProps {
  userId: string;
  classId: string;
  onNodeClick?: (node: SkillTreeNode) => void;
}

export default function StudentSkillTree({
  userId,
  classId,
  onNodeClick,
}: StudentSkillTreeProps) {
  const [data, setData] = useState<SkillTreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    skillTreeApi
      .getSkillTree(userId, classId)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId, classId]);

  // Auto-scroll to current level
  useEffect(() => {
    if (!data || !containerRef.current) return;
    const currentIdx = data.nodes.findIndex((n) => n.status === "in_progress");
    if (currentIdx >= 0) {
      const el = containerRef.current.querySelector(
        `[data-node-idx="${currentIdx}"]`
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#44f91f]/30 border-t-[#44f91f] rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Loading skill tree...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-red-400 mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-[#44f91f] underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Lock className="w-12 h-12 text-slate-600 mb-4" />
        <h3 className="text-lg font-semibold text-slate-300 mb-2">
          No Problems Assigned Yet
        </h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Your teacher hasn&apos;t assigned any problems to your class yet. Join
          a class or check back later.
        </p>
      </div>
    );
  }

  const mastered = data.mastered_count;
  const total = data.total_problems;
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  return (
    <div className="w-full">
      {/* Header */}
      {data.class && (
        <div className="mb-6 glass-morphism rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#44f91f]/60 uppercase tracking-wider font-semibold">
                {data.class.name}
              </p>
              {data.class.teacher_name && (
                <p className="text-xs text-slate-500 mt-0.5">by {data.class.teacher_name}</p>
              )}
              <p className="text-sm text-slate-400 mt-1">
                Code: <span className="font-mono text-[#44f91f]">{data.class.cohort_code}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{pct}%</p>
                <p className="text-xs text-slate-500">{mastered}/{total} mastered</p>
              </div>
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                  <circle
                    cx="24" cy="24" r="20"
                    fill="none" stroke="rgba(68,249,31,0.1)" strokeWidth="4"
                  />
                  <circle
                    cx="24" cy="24" r="20"
                    fill="none" stroke="#44f91f" strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${(pct / 100) * 125.6} 125.6`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <Trophy className="absolute inset-0 m-auto w-4 h-4 text-[#44f91f]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Map */}
      <div ref={containerRef} className="relative flex flex-col items-center gap-0">
        {data.nodes.map((node, idx) => {
          const isMastered = node.status === "mastered";
          const isActive = node.status === "in_progress";
          const isLocked = node.status === "locked";
          const isLast = idx === data.nodes.length - 1;

          // Zigzag: even indexes left-aligned, odd right-aligned
          const side = idx % 2 === 0 ? "left" : "right";

          return (
            <div key={node.id} data-node-idx={idx} className="w-full max-w-lg">
              {/* Connector line from previous node */}
              {idx > 0 && (
                <div className="flex justify-center py-0">
                  <svg width="200" height="48" viewBox="0 0 200 48" className="overflow-visible">
                    <path
                      d={
                        side === "left"
                          ? "M 140 0 C 140 24 60 24 60 48"
                          : "M 60 0 C 60 24 140 24 140 48"
                      }
                      fill="none"
                      stroke={
                        data.nodes[idx - 1].status === "mastered"
                          ? "#44f91f"
                          : "rgba(255,255,255,0.08)"
                      }
                      strokeWidth="2"
                      strokeDasharray={
                        data.nodes[idx - 1].status === "mastered" ? "none" : "6 4"
                      }
                    />
                    {data.nodes[idx - 1].status === "mastered" && (
                      <circle r="3" fill="#44f91f">
                        <animateMotion
                          dur="2s"
                          repeatCount="indefinite"
                          path={
                            side === "left"
                              ? "M 140 0 C 140 24 60 24 60 48"
                              : "M 60 0 C 60 24 140 24 140 48"
                          }
                        />
                      </circle>
                    )}
                  </svg>
                </div>
              )}

              {/* Node */}
              <div
                className={`flex ${side === "right" ? "justify-end" : "justify-start"}`}
              >
                <button
                  onClick={() => !isLocked && onNodeClick?.(node)}
                  disabled={isLocked}
                  className={`
                    relative w-72 p-5 rounded-2xl border transition-all duration-300 text-left
                    ${
                      isMastered
                        ? "bg-[#44f91f]/5 border-[#44f91f]/40 shadow-neon-sm hover:shadow-neon"
                        : isActive
                        ? "bg-white/5 border-[#44f91f]/30 shadow-[0_0_20px_rgba(68,249,31,0.15)] animate-glow-pulse"
                        : "bg-white/[0.02] border-slate-800/60 opacity-50 cursor-not-allowed"
                    }
                    backdrop-blur-md
                  `}
                >
                  {/* Status icon */}
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={`
                        w-10 h-10 rounded-xl flex items-center justify-center
                        ${
                          isMastered
                            ? "bg-[#44f91f]/15 text-[#44f91f]"
                            : isActive
                            ? "bg-[#44f91f]/10 text-[#44f91f]"
                            : "bg-white/5 text-slate-600"
                        }
                      `}
                    >
                      {isMastered ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : isActive ? (
                        <Zap className="w-5 h-5" />
                      ) : (
                        <Lock className="w-5 h-5" />
                      )}
                    </div>

                    {/* Level badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full
                          ${
                            node.difficulty === "advanced"
                              ? "bg-red-500/10 text-red-400"
                              : node.difficulty === "intermediate"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-emerald-500/10 text-emerald-400"
                          }
                        `}
                      >
                        {node.difficulty}
                      </span>
                      <span className="text-xs text-slate-600 font-mono">
                        #{node.order}
                      </span>
                    </div>
                  </div>

                  {/* Title & description */}
                  <h3
                    className={`font-semibold text-sm mb-1 ${
                      isLocked ? "text-slate-600" : "text-white"
                    }`}
                  >
                    {node.title}
                  </h3>
                  {node.topic && (
                    <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider">
                      {node.topic}
                    </p>
                  )}

                  {/* Progress bar (for mastered / in-progress) */}
                  {!isLocked && (
                    <div className="mt-3">
                      {isMastered ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[#44f91f]/20 rounded-full overflow-hidden">
                            <div className="h-full bg-[#44f91f] rounded-full w-full" />
                          </div>
                          <span className="text-[10px] text-[#44f91f] font-semibold">
                            {Math.round(node.viva_score * 100)}%
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#44f91f]/50 rounded-full transition-all"
                              style={{
                                width: `${
                                  node.test_cases_total > 0
                                    ? (node.test_cases_passed /
                                        node.test_cases_total) *
                                      100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                          {node.attempts > 0 && (
                            <span className="text-[10px] text-slate-500">
                              {node.attempts} tries
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Active badge */}
                  {isActive && (
                    <div className="absolute -top-2 -right-2">
                      <span className="inline-flex items-center gap-1 bg-[#44f91f] text-black text-[10px] font-bold px-2.5 py-1 rounded-full shadow-neon-sm">
                        <Zap className="w-3 h-3" />
                        CURRENT
                      </span>
                    </div>
                  )}

                  {/* Click arrow for non-locked */}
                  {!isLocked && (
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  )}
                </button>
              </div>

              {/* Final node — trophy */}
              {isLast && isMastered && (
                <div className="flex justify-center mt-6">
                  <div className="flex flex-col items-center gap-2 glass-morphism rounded-2xl px-8 py-4">
                    <Trophy className="w-8 h-8 text-[#44f91f]" />
                    <span className="text-sm font-bold text-[#44f91f]">
                      All Levels Complete!
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
