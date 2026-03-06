"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d130e] px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#44f91f]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center relative z-10">
        <h1 className="text-8xl font-black text-[#44f91f]/20 mb-2">404</h1>
        <h2 className="text-2xl font-bold text-white mb-3">Page Not Found</h2>
        <p className="text-slate-400 mb-8 max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#44f91f] text-black font-semibold rounded-xl hover:brightness-110 transition-all shadow-[0_0_20px_rgba(68,249,31,0.2)]"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-6 py-3 glass-panel rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
