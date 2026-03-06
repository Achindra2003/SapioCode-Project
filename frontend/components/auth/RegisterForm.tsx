"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, User, GraduationCap, BookOpen } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { authStorage } from "@/hooks/useAuth";

export default function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student" as "student" | "teacher",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.register({
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });

      authStorage.setToken(response.access_token);
      authStorage.setUser(response.user);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Role Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            I am a
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: "student" })}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                formData.role === "student"
                  ? "bg-[#44f91f]/10 border-[#44f91f]/40 text-[#44f91f]"
                  : "bg-black/30 border-white/10 text-slate-400 hover:border-white/20"
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-sm font-semibold">Student</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: "teacher" })}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                formData.role === "teacher"
                  ? "bg-[#44f91f]/10 border-[#44f91f]/40 text-[#44f91f]"
                  : "bg-black/30 border-white/10 text-slate-400 hover:border-white/20"
              }`}
            >
              <GraduationCap className="w-5 h-5" />
              <span className="text-sm font-semibold">Teacher</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-[#44f91f]/40 focus:border-[#44f91f]/50 outline-none transition-all"
              placeholder="John Doe"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-[#44f91f]/40 focus:border-[#44f91f]/50 outline-none transition-all"
              placeholder="you@example.com"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full pl-10 pr-12 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-[#44f91f]/40 focus:border-[#44f91f]/50 outline-none transition-all"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type={showPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-[#44f91f]/40 focus:border-[#44f91f]/50 outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-[#44f91f] hover:brightness-110 text-black font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(68,249,31,0.3)] hover:shadow-[0_0_25px_rgba(68,249,31,0.4)]"
      >
        {isLoading ? "Creating account..." : "Create Account"}
      </button>

      <p className="text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="text-[#44f91f] hover:text-[#44f91f]/80 font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );
}
