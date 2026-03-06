"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Users, Copy, Check, GraduationCap, FileText } from "lucide-react";
import { teacherAPI, type Classroom } from "@/lib/api/teacher";

export default function ClassroomsPage() {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    teacherAPI.listClassrooms()
      .then(setClassrooms)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Classrooms</h1>
          <p className="text-sm text-slate-400">Manage all your classrooms</p>
        </div>
        <button
          onClick={() => router.push("/teacher/problems/new")}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#44f91f] text-black font-semibold rounded-xl hover:brightness-110 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          New Problem
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#44f91f]/30 border-t-[#44f91f] rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="glass-morphism rounded-2xl p-8 text-center">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button onClick={load} className="text-sm text-[#44f91f] hover:underline">Retry</button>
        </div>
      ) : classrooms.length === 0 ? (
        <div className="glass-morphism rounded-2xl p-12 text-center">
          <GraduationCap className="w-16 h-16 text-[#44f91f]/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Classrooms Yet</h3>
          <p className="text-slate-400">Create a classroom from the dashboard to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map((cls) => (
            <div
              key={cls.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/teacher/classrooms/${cls.id}`)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/teacher/classrooms/${cls.id}`); }}
              className="glass-morphism rounded-xl p-5 text-left hover:border-[#44f91f]/20 transition-all group cursor-pointer"
            >
              <h3 className="font-semibold text-white group-hover:text-[#44f91f] transition-colors mb-2">
                {cls.name}
              </h3>
              <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {cls.student_count ?? cls.student_ids?.length ?? 0} students
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {cls.problem_count ?? 0} problems
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#44f91f]/60 bg-[#44f91f]/5 px-2 py-1 rounded">
                  {cls.cohort_code}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(cls.cohort_code);
                    setCopiedCode(cls.id);
                    setTimeout(() => setCopiedCode(null), 1500);
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title="Copy class code"
                >
                  {copiedCode === cls.id ? (
                    <Check className="w-3.5 h-3.5 text-[#44f91f]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
