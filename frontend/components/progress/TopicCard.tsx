"use client";

import { TopicStatus } from "@/lib/types";
import { Lock, CheckCircle, ChevronRight } from "lucide-react";
import ProgressCircle from "./ProgressCircle";

interface TopicCardProps {
  topic: TopicStatus;
  isSelected: boolean;
  onClick: () => void;
}

export default function TopicCard({ topic, isSelected, onClick }: TopicCardProps) {
  const isLocked = topic.status === "locked";
  const isMastered = topic.status === "mastered";

  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between
        ${
          isLocked
            ? "bg-black/20 border-white/5 cursor-not-allowed opacity-60"
            : isSelected
            ? "bg-[#44f91f]/5 border-[#44f91f]/30 shadow-[0_0_15px_rgba(68,249,31,0.1)] ring-1 ring-[#44f91f]/20"
            : "bg-black/30 border-white/5 hover:border-[#44f91f]/20 hover:bg-black/40"
        }
      `}
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isLocked
              ? "bg-white/5 text-slate-500"
              : isMastered
              ? "bg-[#44f91f]/10 text-[#44f91f] border border-[#44f91f]/20"
              : "bg-[#44f91f]/5 text-[#44f91f]/70"
          }`}
        >
          {isLocked ? (
            <Lock className="w-5 h-5" />
          ) : isMastered ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <span className="text-lg font-bold">{topic.order}</span>
          )}
        </div>
        <div>
          <p
            className={`font-semibold ${
              isLocked ? "text-slate-500" : isSelected ? "text-[#44f91f]" : "text-slate-200"
            }`}
          >
            {topic.name}
          </p>
          <p className="text-xs text-slate-500">
            {topic.description}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {topic.mastered_count}/{topic.total_count} questions completed
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {!isLocked && (
          <>
            <ProgressCircle percentage={topic.completion_rate * 100} size={44} strokeWidth={4} />
            <ChevronRight
              className={`w-5 h-5 transition-transform ${
                isSelected ? "rotate-90 text-[#44f91f]" : "text-slate-500"
              }`}
            />
          </>
        )}
      </div>
    </button>
  );
}
