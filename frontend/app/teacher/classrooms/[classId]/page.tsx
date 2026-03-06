"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Users,
  PlusCircle,
  BarChart3,
  Copy,
  Check,
  BookOpen,
} from "lucide-react";
import { teacherAPI, type ClassDetail } from "@/lib/api/teacher";

export default function ClassroomDetailPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;

  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!classId) return;
    teacherAPI
      .getClassroom(classId)
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [classId]);

  const copyCode = () => {
    if (detail) {
      navigator.clipboard.writeText(detail.cohort_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-pulse text-[#44f91f]/60">Loading classroom...</div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400">Classroom not found</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/teacher")}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{detail.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500">Join code:</span>
              <code className="text-sm font-mono text-[#44f91f] bg-[#44f91f]/10 px-2 py-0.5 rounded">
                {detail.cohort_code}
              </code>
              <button onClick={copyCode} className="p-1 hover:bg-white/5 rounded transition-colors">
                {copiedCode ? (
                  <Check className="w-3 h-3 text-[#44f91f]" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-500" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/teacher/problems/new?classId=${classId}`)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#44f91f] text-black font-semibold rounded-xl hover:brightness-110 transition-all text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Assign Problem
          </button>
          <button
            onClick={() => router.push(`/teacher/analytics?classId=${classId}`)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-colors text-sm"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Students */}
        <div className="lg:col-span-1">
          <div className="glass-morphism rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">
                Registered Students
              </h2>
              <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                {detail.students?.length || 0}
              </span>
            </div>
            {!detail.students || detail.students.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">
                  Share the join code to enroll students.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {detail.students.map((s: { id: string; full_name: string; email: string }) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="relative">
                      <div className="w-9 h-9 bg-[#44f91f]/10 rounded-full flex items-center justify-center text-xs font-bold text-[#44f91f]">
                        {s.full_name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {s.full_name}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">{s.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Curriculum / Problems */}
        <div className="lg:col-span-2">
          <div className="glass-morphism rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">
                Active Curriculum
              </h2>
              <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                {detail.problems?.length || 0} problems
              </span>
            </div>
            {!detail.problems || detail.problems.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400 mb-3">
                  No problems assigned yet.
                </p>
                <button
                  onClick={() => router.push(`/teacher/problems/new?classId=${classId}`)}
                  className="text-sm text-[#44f91f] hover:underline"
                >
                  Assign your first problem →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {detail.problems.map(
                  (p: { id: string; title: string; difficulty: string; topic: string }) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#44f91f]" />
                        <div>
                          <p className="text-sm font-medium text-white">{p.title}</p>
                          <p className="text-xs text-slate-500">{p.topic}</p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                          p.difficulty === "advanced"
                            ? "bg-red-500/10 text-red-400"
                            : p.difficulty === "intermediate"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        {p.difficulty}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
