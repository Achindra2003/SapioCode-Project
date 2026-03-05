"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Users,
  BookOpen,
  TrendingUp,
  PlusCircle,
  Copy,
  Check,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { teacherAPI, type Classroom } from "@/lib/api/teacher";

export default function TeacherDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadClassrooms();
  }, []);

  const loadClassrooms = async () => {
    try {
      const data = await teacherAPI.listClassrooms();
      setClassrooms(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newClassName.trim()) return;
    setCreating(true);
    try {
      await teacherAPI.createClassroom(newClassName.trim());
      setNewClassName("");
      setShowCreate(false);
      loadClassrooms();
    } catch {
      // handle error
    } finally {
      setCreating(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const totalStudents = classrooms.reduce(
    (sum, c) => sum + (c.student_ids?.length || 0),
    0
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome, {user?.full_name}
        </h1>
        <p className="text-slate-400">
          Manage your classrooms, create problems, and track student progress.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          {
            label: "Classrooms",
            value: classrooms.length,
            icon: GraduationCap,
          },
          { label: "Total Students", value: totalStudents, icon: Users },
          {
            label: "Avg. Class Size",
            value:
              classrooms.length > 0
                ? Math.round(totalStudents / classrooms.length)
                : 0,
            icon: TrendingUp,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass-morphism rounded-2xl p-5 flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-[#44f91f]/10 rounded-xl flex items-center justify-center">
              <stat.icon className="w-6 h-6 text-[#44f91f]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Create Classroom Button / Form */}
      {showCreate ? (
        <div className="glass-morphism rounded-2xl p-6 mb-8">
          <h3 className="text-sm font-semibold text-[#44f91f]/60 uppercase tracking-wider mb-4">
            New Classroom
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="e.g. CS101 - Intro to Programming"
              className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-[#44f91f]/40 focus:outline-none transition-colors"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newClassName.trim()}
              className="px-6 py-3 bg-[#44f91f] text-black font-semibold rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-3 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="mb-8 flex items-center gap-2 px-5 py-3 bg-[#44f91f]/10 border border-[#44f91f]/20 rounded-xl text-[#44f91f] font-medium hover:bg-[#44f91f]/20 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Create Classroom
        </button>
      )}

      {/* Classrooms List */}
      <div>
        <h2 className="text-sm font-semibold text-[#44f91f]/60 uppercase tracking-wider mb-4">
          Your Classrooms
        </h2>

        {loading ? (
          <div className="text-center py-12 text-slate-500">
            Loading classrooms...
          </div>
        ) : classrooms.length === 0 ? (
          <div className="glass-morphism rounded-2xl p-12 text-center">
            <GraduationCap className="w-16 h-16 text-[#44f91f]/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              No Classrooms Yet
            </h3>
            <p className="text-slate-400 max-w-md mx-auto">
              Create your first classroom to start assigning problems and
              tracking student progress.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classrooms.map((cls) => (
              <div
                key={cls.id}
                className="glass-morphism rounded-2xl p-5 hover:border-[#44f91f]/20 transition-all cursor-pointer group"
                onClick={() => router.push(`/teacher/classrooms/${cls.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-[#44f91f] transition-colors">
                      {cls.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">Join code:</span>
                      <code className="text-xs font-mono text-[#44f91f] bg-[#44f91f]/10 px-2 py-0.5 rounded">
                        {cls.cohort_code}
                      </code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyCode(cls.cohort_code);
                        }}
                        className="p-1 hover:bg-white/5 rounded transition-colors"
                      >
                        {copiedCode === cls.cohort_code ? (
                          <Check className="w-3 h-3 text-[#44f91f]" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-500" />
                        )}
                      </button>
                    </div>
                  </div>
                  <BookOpen className="w-5 h-5 text-slate-600 group-hover:text-[#44f91f]/40 transition-colors" />
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {cls.student_ids?.length || 0} students
                  </span>
                  <span>
                    Created {new Date(cls.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
