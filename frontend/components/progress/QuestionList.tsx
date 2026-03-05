"use client";

import { Question, UserProgress } from "@/lib/types";
import { CheckCircle2, Circle, Play, Lock } from "lucide-react";
import Link from "next/link";

interface QuestionListProps {
  questions: Question[];
  progress: UserProgress[];
  topicId: string;
  topicStatus?: "locked" | "unlocked" | "mastered";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function QuestionList({ questions, progress, topicId, topicStatus = "unlocked" }: QuestionListProps) {
  const isTopicLocked = topicStatus === "locked";

  const getQuestionStatus = (questionId: string): "mastered" | "in_progress" | "todo" => {
    const p = progress.find((prog) => prog.question_id === questionId);
    if (!p) return "todo";
    if (p.status === "mastered") return "mastered";
    if (p.status === "in_progress") return "in_progress";
    return "todo";
  };

  return (
    <div className="space-y-2">
      {questions.map((question, index) => {
        const status = getQuestionStatus(question.id);

        if (isTopicLocked) {
          return (
            <div
              key={question.id}
              className="flex items-center justify-between p-4 rounded-lg border border-transparent opacity-50 cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-slate-500 w-4">{index + 1}.</span>
                <div className="p-1.5 rounded-full bg-white/5 text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-500">{question.title}</h4>
                </div>
              </div>
            </div>
          );
        }

        return (
          <Link
            key={question.id}
            href={`/workbench?questionId=${question.id}`}
            className="group flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5"
          >
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono text-slate-500 w-4">{index + 1}.</span>
              <div
                className={`p-1.5 rounded-full ${
                  status === "mastered"
                    ? "bg-[#44f91f]/10 text-[#44f91f]"
                    : "bg-white/5 text-slate-500"
                }`}
              >
                {status === "mastered" ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </div>
              <div>
                <h4
                  className={`text-sm font-medium ${
                    status === "mastered" ? "text-white" : "text-slate-300"
                  }`}
                >
                  {question.title}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      question.difficulty === "easy"
                        ? "text-[#44f91f]/70"
                        : question.difficulty === "medium"
                        ? "text-amber-500"
                        : "text-red-500"
                    }`}
                  >
                    {question.difficulty}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    ~{question.estimatedTime} min
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {status === "mastered" ? (
                <span className="text-[10px] bg-[#44f91f]/10 text-[#44f91f] px-2 py-0.5 rounded-full font-bold border border-[#44f91f]/20 uppercase">
                  Mastered
                </span>
              ) : status === "in_progress" ? (
                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-bold border border-amber-500/20 uppercase">
                  In Progress
                </span>
              ) : (
                <span className="text-[10px] bg-white/5 text-slate-500 px-2 py-0.5 rounded-full font-bold border border-white/10 uppercase">
                  Todo
                </span>
              )}
              <Play className="w-4 h-4 text-slate-500 group-hover:text-[#44f91f] transition-colors" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
