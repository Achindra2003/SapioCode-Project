"use client";

import { useState, useEffect, useCallback } from "react";
import { UserProgress, TopicStatus, Topic } from "../lib/types";
import { progressApi, sessionApi } from "../lib/api/auth";
import { TOPICS, UNLOCK_THRESHOLD } from "../lib/constants";

export function useProgress(userId: string | null) {
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProgress = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const [progressData, sessionData] = await Promise.all([
        progressApi.getByUser(userId),
        sessionApi.get(userId),
      ]);
      setProgress(progressData);
      setThreadId(sessionData.thread_id);
    } catch (error) {
      console.error("Failed to fetch progress:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const createSession = useCallback(async () => {
    if (!userId) return null;

    try {
      const data = await sessionApi.create(userId);
      setThreadId(data.thread_id);
      return data.thread_id;
    } catch (error) {
      console.error("Failed to create session:", error);
      return null;
    }
  }, [userId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const getTopicCompletion = useCallback((topicId: string): number => {
    const topic = TOPICS.find((t) => t.id === topicId);
    if (!topic) return 0;

    const topicProgress = progress.filter((p) => p.topic_id === topicId);
    const masteredCount = topicProgress.filter((p) => p.status === "mastered").length;
    return masteredCount / topic.questionCount;
  }, [progress]);

  const getTopicStatus = useCallback((topic: Topic): TopicStatus => {
    const topicProgress = progress.filter((p) => p.topic_id === topic.id);
    const masteredCount = topicProgress.filter((p) => p.status === "mastered").length;
    const completionRate = masteredCount / topic.questionCount;

    let status: "locked" | "unlocked" | "mastered" = "locked";

    if (completionRate >= UNLOCK_THRESHOLD) {
      status = "mastered";
    } else if (topic.order === 1) {
      // First topic is always unlocked
      status = "unlocked";
    } else {
      const prevTopic = TOPICS.find((t) => t.order === topic.order - 1);
      if (!prevTopic || getTopicCompletion(prevTopic.id) >= UNLOCK_THRESHOLD) {
        status = "unlocked";
      }
    }

    return {
      id: topic.id,
      name: topic.name,
      order: topic.order,
      description: topic.description,
      status,
      completion_rate: completionRate,
      mastered_count: masteredCount,
      total_count: topic.questionCount,
    };
  }, [progress, getTopicCompletion]);

  const getAllTopicStatuses = useCallback((): TopicStatus[] => {
    return TOPICS.map((topic) => getTopicStatus(topic));
  }, [getTopicStatus]);

  const getUnlockedQuestions = useCallback((): string[] => {
    const statuses = getAllTopicStatuses();
    const unlockedTopics = statuses
      .filter((s) => s.status !== "locked")
      .map((s) => s.id);

    const unlockedQuestions: string[] = [];
    TOPICS.forEach((topic) => {
      if (unlockedTopics.includes(topic.id)) {
        unlockedQuestions.push(...topic.questionIds);
      }
    });

    return unlockedQuestions;
  }, [getAllTopicStatuses]);

  return {
    progress,
    threadId,
    isLoading,
    fetchProgress,
    createSession,
    getTopicStatus,
    getTopicCompletion,
    getAllTopicStatuses,
    getUnlockedQuestions,
  };
}
