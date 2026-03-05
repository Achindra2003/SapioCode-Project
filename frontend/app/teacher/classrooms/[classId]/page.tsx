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
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
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

      {/* Actions */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => router.push(`/teacher/problems/new?classId=${classId}`)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#44f91f] text-black font-semibold rounded-xl hover:brightness-110 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Assign Problem
        </button>
        <button
          onClick={() => router.push(`/teacher/analytics?classId=${classId}`)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          View Analytics
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Students */}
        <div>
          <h2 className="text-sm font-semibold text-[#44f91f]/60 uppercase tracking-wider mb-4">
            Students ({detail.students?.length || 0})
          </h2>
          {!detail.students || detail.students.length === 0 ? (
            <div className="glass-morphism rounded-2xl p-8 text-center">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">
                No students yet. Share the join code with your students.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {detail.students.map((s: { id: string; full_name: string; email: string }) => (
                <div
                  key={s.id}
                  className="glass-morphism rounded-xl p-4 flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-[#44f91f]/10 rounded-full flex items-center justify-center text-xs font-bold text-[#44f91f]">
                    {s.full_name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {s.full_name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{s.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Problems */}
        <div>
          <h2 className="text-sm font-semibold text-[#44f91f]/60 uppercase tracking-wider mb-4">
            Assigned Problems ({detail.problems?.length || 0})
          </h2>
          {!detail.problems || detail.problems.length === 0 ? (
            <div className="glass-morphism rounded-2xl p-8 text-center">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">
                No problems assigned yet. Click &quot;Assign Problem&quot; to add one.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {detail.problems.map(
                (p: { id: string; title: string; difficulty: string; topic: string }) => (
                  <div
                    key={p.id}
                    className="glass-morphism rounded-xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{p.title}</p>
                      <p className="text-xs text-slate-500">{p.topic}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
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
  );
}
