"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LogOut,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const TABS = [
  { label: "Classes", href: "/teacher" },
  { label: "Dashboard", href: "/teacher/analytics" },
  { label: "Create Problem", href: "/teacher/problems/new" },
];

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isAuthenticated) {
      router.push("/login");
    } else if (isMounted && user && user.role !== "teacher") {
      router.push("/dashboard");
    }
  }, [isMounted, isAuthenticated, user, router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (!isMounted || !isAuthenticated || !user || user.role !== "teacher") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d130e]">
        <div className="animate-pulse text-[#44f91f]/60">Loading...</div>
      </div>
    );
  }

  const isTabActive = (href: string) => {
    if (href === "/teacher") {
      return pathname === "/teacher" || pathname.startsWith("/teacher/classrooms");
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#0d130e] flex flex-col">
      {/* Top Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
          {/* Logo */}
          <button onClick={() => router.push("/teacher")} className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">
              Sapio<span className="text-[#44f91f]">Code</span>
            </span>
          </button>

          {/* Tabs */}
          <nav className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
            {TABS.map((tab) => {
              const active = isTabActive(tab.href);
              return (
                <button
                  key={tab.href}
                  onClick={() => router.push(tab.href)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-[#44f91f] text-black shadow-[0_0_12px_rgba(68,249,31,0.3)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Profile */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#44f91f]/10 rounded-full flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-[#44f91f]" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-white leading-tight">{user.full_name}</p>
                <p className="text-[10px] text-slate-500">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-auto relative">
        <div className="absolute top-20 right-1/4 w-[600px] h-[300px] bg-[#44f91f]/3 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}
