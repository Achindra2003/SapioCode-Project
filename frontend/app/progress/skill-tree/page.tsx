"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Map, BookOpen, GraduationCap, FileText, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import StudentSkillTree from "@/components/progress/StudentSkillTree";
import { studentApi, type SkillTreeNode, type StudentClass } from "@/lib/api/teacher";

function SkillTreeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  const classId = searchParams.get("classId");
  const className = searchParams.get("className");

  // State for class selection when no classId provided
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isAuthenticated) {
      router.push("/login");
    }
  }, [isMounted, isAuthenticated, router]);

  // If no classId, fetch the student's enrolled classes so they can pick one
  useEffect(() => {
    if (!user || classId) return;
    setLoadingClasses(true);
    studentApi
      .getMyClasses(user.id)
      .then((data) => {
        // If exactly one class, auto-select it
        if (data.classes.length === 1) {
          const c = data.classes[0];
          router.replace(`/progress/skill-tree?classId=${c.id}&className=${encodeURIComponent(c.name)}`);
        } else {
          setClasses(data.classes);
        }
      })
      .catch(() => setClasses([]))
      .finally(() => setLoadingClasses(false));
  }, [user, classId, router]);

  const handleNodeClick = (node: SkillTreeNode) => {
    router.push(`/workbench?problem=${node.id}${classId ? `&classId=${classId}` : ""}`);
  };

  if (!isMounted || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d130e]">
        <div className="animate-pulse text-[#44f91f]/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d130e] relative overflow-hidden">
      <div className="absolute top-20 left-1/3 w-[600px] h-[300px] bg-[#44f91f]/3 rounded-full blur-3xl pointer-events-none" />

      <header className="glass-panel border-x-0 border-t-0 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div className="flex items-center gap-2">
              <Map className="w-6 h-6 text-[#44f91f]" />
              <div>
                <h1 className="text-xl font-bold text-white">Skill Tree</h1>
                {className && (
                  <p className="text-xs text-slate-400">{className}</p>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-[#44f91f] transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        {classId ? (
          /* ── Per-class skill tree ── */
          <StudentSkillTree userId={user.id} classId={classId} onNodeClick={handleNodeClick} />
        ) : loadingClasses ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-[#44f91f] animate-spin" />
              <span className="text-sm text-slate-500">Loading your classes...</span>
            </div>
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <GraduationCap className="w-12 h-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No Classes Found</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-4">
              Join a classroom from the dashboard to see your skill tree.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 bg-[#44f91f] text-black font-semibold rounded-lg hover:brightness-110 transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          /* ── Class selector (multiple classes) ── */
          <div>
            <h2 className="text-sm font-semibold text-[#44f91f]/60 uppercase tracking-wider mb-4">
              Choose a Class
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Each class has its own skill tree. Select a class to see its learning path.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() =>
                    router.push(
                      `/progress/skill-tree?classId=${cls.id}&className=${encodeURIComponent(cls.name)}`
                    )
                  }
                  className="glass-panel rounded-xl p-5 text-left hover:bg-white/5 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-[#44f91f] transition-colors mb-1">
                        {cls.name}
                      </h3>
                      <p className="text-xs text-slate-500 mb-2">by {cls.teacher_name}</p>
                      <span className="flex items-center gap-1 text-sm text-slate-400">
                        <FileText className="w-3.5 h-3.5" />
                        {cls.problem_count} {cls.problem_count === 1 ? "problem" : "problems"}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-[#44f91f] transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SkillTreePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d130e]" />}>
      <SkillTreeContent />
    </Suspense>
  );
}
