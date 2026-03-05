"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import RegisterForm from "@/components/auth/RegisterForm";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d130e] px-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#44f91f]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#44f91f]/3 rounded-full blur-3xl" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            sapio<span className="text-[#44f91f] neon-text">code</span>
          </h1>
          <p className="text-slate-400">Start your learning journey</p>
        </div>
        <div className="glass-panel rounded-2xl p-8">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
