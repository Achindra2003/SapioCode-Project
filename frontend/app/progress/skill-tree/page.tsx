"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Map, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import StudentSkillTree from "@/components/progress/StudentSkillTree";
import type { SkillTreeNode } from "@/lib/api/teacher";

function SkillTreeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  const classId = searchParams.get("classId");
  const className = searchParams.get("className");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isAuthenticated) {
      router.push("/login");
    }
  }, [isMounted, isAuthenticated, router]);

  const handleNodeClick = (node: SkillTreeNode) => {
    // Navigate to the workbench with this problem
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
        <StudentSkillTree userId={user.id} classId={classId || undefined} onNodeClick={handleNodeClick} />
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
