"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  PlusCircle,
  BarChart3,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/teacher", icon: LayoutDashboard },
  { label: "Classrooms", href: "/teacher/classrooms", icon: GraduationCap },
  { label: "Create Problem", href: "/teacher/problems/new", icon: PlusCircle },
  { label: "Analytics", href: "/teacher/analytics", icon: BarChart3 },
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

  return (
    <div className="min-h-screen bg-[#0d130e] flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-black/20 backdrop-blur-md flex flex-col">
        <div className="p-6 border-b border-white/5">
          <span className="text-xl font-bold text-white">
            sapio<span className="text-[#44f91f] neon-text">code</span>
          </span>
          <p className="text-xs text-slate-500 mt-1">Teacher Portal</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/teacher" && pathname.startsWith(item.href));
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${
                    isActive
                      ? "bg-[#44f91f]/10 text-[#44f91f] border border-[#44f91f]/20"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }
                `}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {isActive && (
                  <ChevronRight className="w-3 h-3 ml-auto" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-[#44f91f]/10 rounded-full flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-[#44f91f]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.full_name}
              </p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-sm text-slate-500 hover:text-red-400 transition-colors px-3 py-2"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="absolute top-20 right-1/4 w-[600px] h-[300px] bg-[#44f91f]/3 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}
