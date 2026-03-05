"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  User,
  BookOpen,
  BarChart3,
  Flame,
  GraduationCap,
  Map,
  UserPlus,
  Check,
  Loader2,
  Plus,
  Users,
  FileText,
  Copy,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProgress } from "@/hooks/useProgress";
import { teacherAPI, studentApi, type Classroom, type StudentClass } from "@/lib/api/teacher";

export default function DashboardPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const { progress, getAllTopicStatuses } = useProgress(user?.id || null);

  // Join class state
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinResult, setJoinResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Student enrolled classes
  const [studentClasses, setStudentClasses] = useState<StudentClass[]>([]);
  const [loadingStudentClasses, setLoadingStudentClasses] = useState(false);

  // Teacher class state
  const [teacherClasses, setTeacherClasses] = useState<Classroom[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [creatingClass, setCreatingClass] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isAuthenticated) {
      router.push("/login");
    }
  }, [isMounted, isAuthenticated, router]);

  // Fetch teacher's classes
  useEffect(() => {
    if (!user || user.role !== "teacher") return;
    setLoadingClasses(true);
    teacherAPI.listClassrooms()
      .then(setTeacherClasses)
      .catch(() => {})
      .finally(() => setLoadingClasses(false));
  }, [user]);

  // Fetch student's enrolled classes
  const fetchStudentClasses = () => {
    if (!user || user.role === "teacher") return;
    setLoadingStudentClasses(true);
    studentApi.getMyClasses(user.id)
      .then((data) => setStudentClasses(data.classes))
      .catch(() => {})
      .finally(() => setLoadingStudentClasses(false));
  };

  useEffect(() => {
    fetchStudentClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleJoinClass = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinResult(null);
    try {
      const res = await teacherAPI.joinClass(joinCode.trim().toUpperCase());
      setJoinResult({ ok: true, message: `Joined "${res.class_name}" successfully!` });
      setJoinCode("");
      fetchStudentClasses(); // Refresh enrolled classes
      setTimeout(() => { setShowJoin(false); setJoinResult(null); }, 2000);
    } catch (err: unknown) {
      setJoinResult({ ok: false, message: err instanceof Error ? err.message : "Invalid code. Try again." });
    } finally {
      setJoining(false);
    }
  };

  if (!isMounted || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d130e]">
        <div className="animate-pulse text-[#44f91f]/60">Loading...</div>
      </div>
    );
  }

  const isTeacher = user.role === "teacher";
  const topicStatuses = getAllTopicStatuses();
  const unlockedCount = topicStatuses.filter((t) => t.status !== "locked").length;
  const masteredQuestions = progress.filter((p) => p.status === "mastered").length;
  const totalQuestions = topicStatuses.reduce((acc, t) => acc + t.total_count, 0);
  const overallPct = totalQuestions > 0 ? Math.round((masteredQuestions / totalQuestions) * 100) : 0;

  const stats = [
    { label: "Topics Unlocked", value: `${unlockedCount}/${topicStatuses.length}`, icon: BookOpen },
    { label: "Problems Solved", value: `${masteredQuestions}/${totalQuestions}`, icon: BarChart3 },
    { label: "Overall Mastery", value: `${overallPct}%`, icon: Flame },
  ];

  return (
    <div className="min-h-screen bg-[#0d130e] relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#44f91f]/3 rounded-full blur-3xl pointer-events-none" />

      <header className="glass-panel border-x-0 border-t-0 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-[#44f91f]" />
            <span className="text-xl font-bold text-white">
              sapio<span className="text-[#44f91f] neon-text">code</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{user.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12 relative z-10">
        <div className="glass-panel rounded-2xl p-8 mb-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 bg-[#44f91f]/10 border border-[#44f91f]/20 rounded-full flex items-center justify-center">
              {isTeacher ? (
                <GraduationCap className="w-10 h-10 text-[#44f91f]" />
              ) : (
                <User className="w-10 h-10 text-[#44f91f]" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Welcome, {user.full_name}!
              </h1>
              <p className="text-slate-400">
                {isTeacher
                  ? "Manage your classrooms and track student progress."
                  : "Ready to continue your learning journey?"}
              </p>
            </div>
          </div>

          {!isTeacher && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="p-4 bg-black/30 border border-white/5 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <stat.icon className="w-5 h-5 text-[#44f91f]/60" />
                  <span className="text-sm text-slate-400">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* ──────────── Student Section ──────────── */}
        {!isTeacher && (
          <>
            {/* Join Class */}
            {showJoin ? (
              <div className="glass-panel rounded-2xl p-6 mb-6">
                <h3 className="text-sm font-semibold text-[#44f91f]/60 uppercase tracking-wider mb-4">
                  Join a Classroom
                </h3>
                {joinResult && (
                  <div className={`mb-4 p-3 rounded-xl text-sm ${joinResult.ok ? "bg-[#44f91f]/10 border border-[#44f91f]/20 text-[#44f91f]" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
                    {joinResult.ok && <Check className="w-4 h-4 inline mr-2" />}
                    {joinResult.message}
                  </div>
                )}
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="Enter 6-digit class code"
                    className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-lg tracking-widest placeholder-slate-600 focus:border-[#44f91f]/40 focus:outline-none text-center uppercase"
                    maxLength={6}
                    onKeyDown={(e) => e.key === "Enter" && handleJoinClass()}
                    autoFocus
                  />
                  <button
                    onClick={handleJoinClass}
                    disabled={joining || joinCode.length < 4}
                    className="px-6 py-3 bg-[#44f91f] text-black font-semibold rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : "Join"}
                  </button>
                  <button
                    onClick={() => { setShowJoin(false); setJoinResult(null); }}
                    className="px-4 py-3 text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowJoin(true)}
                className="mb-6 flex items-center gap-2 px-5 py-3 glass-panel rounded-xl text-[#44f91f] font-medium hover:bg-white/5 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Join a Classroom
              </button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary: Skill Tree */}
              <button
                onClick={() => router.push("/progress/skill-tree")}
                className="p-8 bg-[#44f91f] hover:brightness-110 rounded-2xl text-left transition-all group shadow-[0_0_30px_rgba(68,249,31,0.2)] hover:shadow-[0_0_40px_rgba(68,249,31,0.3)]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Map className="w-6 h-6 text-black/70" />
                  <h2 className="text-xl font-bold text-black">Start Learning</h2>
                </div>
                <p className="text-black/70 mb-4">Open your assigned skill tree and start solving problems</p>
                <span className="text-black/60 group-hover:text-black font-medium">Open Skill Tree →</span>
              </button>

              {/* Secondary: Practice Library */}
              <button
                onClick={() => router.push("/progress")}
                className="p-8 glass-panel hover:bg-white/5 rounded-2xl text-left transition-all group"
              >
                <h2 className="text-xl font-bold text-white mb-2">Practice Mode</h2>
                <p className="text-slate-400 mb-4">Browse the built-in problem library and practice freely</p>
                <span className="text-[#44f91f] font-medium">Open Library →</span>
              </button>
            </div>

            {/* Enrolled Classes */}
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-[#44f91f]/60 uppercase tracking-wider mb-4">
                My Classes
              </h2>
              {loadingStudentClasses ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#44f91f]/30 border-t-[#44f91f] rounded-full animate-spin" />
                </div>
              ) : studentClasses.length === 0 ? (
                <div className="glass-panel rounded-2xl p-8 text-center">
                  <GraduationCap className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 mb-2">Not enrolled in any classes yet.</p>
                  <p className="text-slate-500 text-sm">
                    Ask your teacher for a class code and click &quot;Join a Classroom&quot; above.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {studentClasses.map((cls) => (
                    <div
                      key={cls.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push("/progress/skill-tree")}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push("/progress/skill-tree"); }}
                      className="glass-panel rounded-xl p-5 text-left hover:bg-white/5 transition-all group cursor-pointer"
                    >
                      <h3 className="font-semibold text-white group-hover:text-[#44f91f] transition-colors mb-1">
                        {cls.name}
                      </h3>
                      <p className="text-xs text-slate-500 mb-3">by {cls.teacher_name}</p>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-sm text-slate-400">
                          <FileText className="w-3.5 h-3.5" />
                          {cls.problem_count} {cls.problem_count === 1 ? "problem" : "problems"} assigned
                        </span>
                        <span className="text-xs text-[#44f91f] font-medium group-hover:translate-x-0.5 transition-transform">
                          Open →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ──────────── Teacher Section ──────────── */}
        {isTeacher && (
          <div className="space-y-6">
            {/* Quick actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => router.push("/teacher")}
                className="p-8 bg-[#44f91f] hover:brightness-110 rounded-2xl text-left transition-all group shadow-[0_0_30px_rgba(68,249,31,0.2)] hover:shadow-[0_0_40px_rgba(68,249,31,0.3)]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-6 h-6 text-black/70" />
                  <h2 className="text-xl font-bold text-black">Teacher Portal</h2>
                </div>
                <p className="text-black/70 mb-4">Manage classrooms, create problems, and view analytics</p>
                <span className="text-black/60 group-hover:text-black font-medium">Open Portal →</span>
              </button>

              <button
                onClick={() => router.push("/teacher/analytics")}
                className="p-8 glass-panel hover:bg-white/5 rounded-2xl text-left transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-6 h-6 text-[#44f91f]" />
                  <h2 className="text-xl font-bold text-white">Live Analytics</h2>
                </div>
                <p className="text-slate-400 mb-4">View student progress heatmap and chat transcripts</p>
                <span className="text-[#44f91f] font-medium">View Analytics →</span>
              </button>
            </div>

            {/* My Classrooms */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">My Classrooms</h2>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="New class name"
                    className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-[#44f91f]/40 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newClassName.trim()) {
                        setCreatingClass(true);
                        teacherAPI.createClassroom(newClassName.trim())
                          .then(() => {
                            setNewClassName("");
                            return teacherAPI.listClassrooms();
                          })
                          .then(setTeacherClasses)
                          .catch(() => {})
                          .finally(() => setCreatingClass(false));
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (!newClassName.trim()) return;
                      setCreatingClass(true);
                      teacherAPI.createClassroom(newClassName.trim())
                        .then(() => {
                          setNewClassName("");
                          return teacherAPI.listClassrooms();
                        })
                        .then(setTeacherClasses)
                        .catch(() => {})
                        .finally(() => setCreatingClass(false));
                    }}
                    disabled={creatingClass || !newClassName.trim()}
                    className="p-2 bg-[#44f91f] text-black rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {creatingClass ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loadingClasses ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-[#44f91f]/30 border-t-[#44f91f] rounded-full animate-spin" />
                </div>
              ) : teacherClasses.length === 0 ? (
                <div className="glass-panel rounded-2xl p-8 text-center">
                  <GraduationCap className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No classrooms yet. Create one to get started!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teacherClasses.map((cls) => (
                    <div
                      key={cls.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/teacher/classrooms/${cls.id}`)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/teacher/classrooms/${cls.id}`); }}
                      className="glass-panel rounded-xl p-5 text-left hover:bg-white/5 transition-all group cursor-pointer"
                    >
                      <h3 className="font-semibold text-white group-hover:text-[#44f91f] transition-colors mb-2">
                        {cls.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {cls.student_count} students
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {cls.problem_count} problems
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
          </div>
        )}
      </main>
    </div>
  );
}
