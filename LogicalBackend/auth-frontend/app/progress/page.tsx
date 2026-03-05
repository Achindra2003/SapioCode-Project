"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import {
    ChevronRight,
    BookOpen,
    CheckCircle2,
    Clock,
    ArrowLeft,
    Search,
    LayoutDashboard
} from "lucide-react";
import ProgressCircle from "@/components/ProgressCircle";

// Mock data for topics and questions
const TOPICS = [
    {
        id: "t1",
        name: "Python Basics",
        questions: [
            { id: "q1", title: "Variables & Data Types", completed: true },
            { id: "q2", title: "Lists & Dictionaries", completed: true },
            { id: "q3", title: "Loops: For & While", completed: false },
            { id: "q4", title: "Basic Functions", completed: false },
        ],
    },
    {
        id: "t2",
        name: "Advanced Python",
        questions: [
            { id: "q5", title: "Decorators & Generators", completed: false },
            { id: "q6", title: "Context Managers", completed: false },
            { id: "q7", title: "Multithreading", completed: false },
        ],
    },
    {
        id: "t3",
        name: "Web Frameworks",
        questions: [
            { id: "q8", title: "FastApp Setup", completed: true },
            { id: "q9", title: "Pydantic Models", completed: false },
            { id: "q10", title: "Dependency Injection", completed: false },
        ],
    },
];

export default function ProgressPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(TOPICS[0].id);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted || !user) return null;

    const selectedTopic = TOPICS.find((t) => t.id === selectedTopicId) || TOPICS[0];

    // Deterministic progress calculation: (completed / total) * 100
    const calculateProgress = (questions: any[]) => {
        const completed = questions.filter((q) => q.completed).length;
        return Math.round((completed / questions.length) * 100);
    };

    const overallProgress = Math.round(
        TOPICS.reduce((acc, t) => acc + calculateProgress(t.questions), 0) / TOPICS.length
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 p-4 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <BookOpen className="w-6 h-6 text-blue-600" />
                            Learning Progress
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-sm font-semibold">{user.full_name}</span>
                            <span className="text-xs text-gray-500">Overall: {overallProgress}%</span>
                        </div>
                        <ProgressCircle percentage={overallProgress} size={40} strokeWidth={4} />
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 flex flex-col md:flex-row gap-8">
                {/* Left Side: Stages/Topics */}
                <div className="w-full md:w-1/3 space-y-4">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Learning Stages</h2>
                    <div className="space-y-3">
                        {TOPICS.map((topic) => {
                            const progress = calculateProgress(topic.questions);
                            const isActive = selectedTopicId === topic.id;

                            return (
                                <button
                                    key={topic.id}
                                    onClick={() => setSelectedTopicId(topic.id)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between ${isActive
                                            ? "bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-100"
                                            : "bg-white border-gray-100 hover:border-blue-100 hover:bg-gray-50"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${isActive ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                                            <LayoutDashboard className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className={`font-semibold text-sm ${isActive ? "text-blue-900" : "text-gray-700"}`}>
                                                {topic.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {topic.questions.filter(q => q.completed).length}/{topic.questions.length} questions
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-bold ${progress === 100 ? "text-green-600" : "text-blue-600"}`}>
                                            {progress}%
                                        </span>
                                        <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? "rotate-90 text-blue-600" : "text-gray-300"}`} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Side: Questions Panel */}
                <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                        <h3 className="text-lg font-bold text-gray-900">{selectedTopic.name}</h3>
                        <p className="text-sm text-gray-500 italic">Select a question to view details or start practice.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                        <div className="space-y-1">
                            {selectedTopic.questions.map((q, index) => (
                                <div
                                    key={q.id}
                                    className="group flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-100"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-mono text-gray-400 w-4">{index + 1}.</span>
                                        <div className={`p-1.5 rounded-full ${q.completed ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className={`text-sm font-medium ${q.completed ? "text-gray-900" : "text-gray-600"}`}>
                                                {q.title}
                                            </h4>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Deterministic logic • ID: {q.id}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {q.completed ? (
                                            <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold border border-green-100 uppercase">Mastered</span>
                                        ) : (
                                            <span className="text-[10px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full font-bold border border-gray-100 uppercase">Todo</span>
                                        )}
                                        <button className="p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Search className="w-4 h-4 text-gray-400" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {selectedTopic.questions.length === 0 && (
                            <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                                <Clock className="w-12 h-12 text-gray-200" />
                                <p className="text-gray-500 italic">No questions found for this topic.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-blue-600 text-white flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Progress Algorithm</p>
                            <p className="text-sm font-bold">Standard Completion Mapping</p>
                        </div>
                        <button className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-1.5 rounded-lg text-xs font-bold transition-all">
                            Go to Sandbox
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
