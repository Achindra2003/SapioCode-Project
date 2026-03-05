"use client";

import { TopicStatus } from "@/lib/types";
import TopicCard from "./TopicCard";

interface SkillTreeProps {
  topics: TopicStatus[];
  onTopicSelect: (topicId: string) => void;
  selectedTopicId: string | null;
}

export default function SkillTree({
  topics,
  onTopicSelect,
  selectedTopicId,
}: SkillTreeProps) {
  return (
    <div className="space-y-4">
      {topics.map((topic, index) => (
        <div key={topic.id} className="relative">
          {index < topics.length - 1 && (
            <div
              className={`absolute left-6 top-14 w-0.5 h-4 ${
                topic.status === "mastered"
                  ? "bg-[#44f91f] shadow-[0_0_6px_rgba(68,249,31,0.4)]"
                  : "bg-white/10"
              }`}
            />
          )}
          <TopicCard
            topic={topic}
            isSelected={selectedTopicId === topic.id}
            onClick={() => {
              if (topic.status !== "locked") {
                onTopicSelect(topic.id);
              }
            }}
          />
        </div>
      ))}
    </div>
  );
}
