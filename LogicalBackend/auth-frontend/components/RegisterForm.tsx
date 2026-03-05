"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterSchema, RegisterInput } from "@/lib/validation";
import { authApi } from "@/lib/api";
import { authStorage } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function RegisterForm() {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterInput>({
        resolver: zodResolver(RegisterSchema),
    });

    const onSubmit = async (data: RegisterInput) => {
        setIsLoading(true);
        setError(null);
        try {
            // Remove confirm_password before sending to API
            const { confirm_password, ...payload } = data;
            const response: any = await authApi.register(payload);
            authStorage.setToken(response.access_token);
            authStorage.setUser(response.user);
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message || "Registration failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Create Account</h1>
                <p className="text-sm text-gray-500">Join SapioCode to start your learning journey</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg border border-red-100">
                        {error}
                    </div>
                )}

                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700" htmlFor="full_name">
                        Full Name
                    </label>
                    <input
                        {...register("full_name")}
                        id="full_name"
                        type="text"
                        placeholder="John Doe"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                    {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700" htmlFor="email">
                        Email
                    </label>
                    <input
                        {...register("email")}
                        id="email"
                        type="email"
                        placeholder="student@example.com"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700" htmlFor="password">
                        Password
                    </label>
                    <input
                        {...register("password")}
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                    {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700" htmlFor="confirm_password">
                        Confirm Password
                    </label>
                    <input
                        {...register("confirm_password")}
                        id="confirm_password"
                        type="password"
                        placeholder="••••••••"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                    {errors.confirm_password && <p className="text-xs text-red-500">{errors.confirm_password.message}</p>}
                </div>

                <button
                    disabled={isLoading}
                    type="submit"
                    className="w-full py-2.5 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all flex items-center justify-center gap-2"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign Up"}
                </button>
            </form>

            <p className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <a href="/login" className="font-semibold text-blue-600 hover:underline">
                    Sign In
                </a>
            </p>
        </div>
    );
}
