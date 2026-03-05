"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, LayoutDashboard, Map } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProgress } from "@/hooks/useProgress";
import { getQuestionsByTopic } from "@/lib/questions";
import SkillTree from "@/components/progress/SkillTree";
import QuestionList from "@/components/progress/QuestionList";
import ProgressCircle from "@/components/progress/ProgressCircle";

export default function ProgressPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { progress, getAllTopicStatuses } = useProgress(user?.id || null);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isAuthenticated) {
      router.push("/login");
    }
  }, [isMounted, isAuthenticated, router]);

  const topicStatuses = getAllTopicStatuses();
  const selectedTopic = topicStatuses.find((t) => t.id === selectedTopicId);
  const selectedQuestions = selectedTopicId ? getQuestionsByTopic(selectedTopicId) : [];

  const overallProgress =
    topicStatuses.reduce((acc, t) => acc + t.completion_rate, 0) / topicStatuses.length;

  if (!isMounted || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d130e]">
        <div className="animate-pulse text-[#44f91f]/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d130e] relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-20 right-1/4 w-[600px] h-[300px] bg-[#44f91f]/3 rounded-full blur-3xl pointer-events-none" />

      <header className="glass-panel border-x-0 border-t-0 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-[#44f91f]" />
              <h1 className="text-xl font-bold text-white">Learning Progress</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/progress/skill-tree")}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#44f91f]/10 border border-[#44f91f]/20 rounded-lg text-sm text-[#44f91f] hover:bg-[#44f91f]/20 transition-colors"
            >
              <Map className="w-4 h-4" />
              Game Map
            </button>
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-semibold text-white">{user.full_name}</span>
              <span className="text-xs text-slate-400">Overall: {Math.round(overallProgress * 100)}%</span>
            </div>
            <ProgressCircle percentage={overallProgress * 100} size={40} strokeWidth={4} />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/3">
            <h2 className="text-sm font-semibold text-[#44f91f]/60 uppercase tracking-wider mb-4">
              Learning Stages
            </h2>
            <SkillTree
              topics={topicStatuses}
              selectedTopicId={selectedTopicId}
              onTopicSelect={setSelectedTopicId}
            />
          </div>

          <div className="flex-1">
            {selectedTopic ? (
              <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-black/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">{selectedTopic.name}</h3>
                      <p className="text-sm text-slate-400">{selectedTopic.description}</p>
                    </div>
                    <ProgressCircle
                      percentage={selectedTopic.completion_rate * 100}
                      size={60}
                      strokeWidth={5}
                    />
                  </div>
                </div>
                <div className="p-4">
                  <QuestionList
                    questions={selectedQuestions}
                    progress={progress}
                    topicId={selectedTopic.id}
                    topicStatus={selectedTopic.status}
                  />
                </div>
              </div>
            ) : (
              <div className="glass-panel rounded-2xl p-12 text-center">
                <LayoutDashboard className="w-16 h-16 text-[#44f91f]/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Select a Topic
                </h3>
                <p className="text-slate-400">
                  Choose a topic from the left to view its questions and start learning.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
