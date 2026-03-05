"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, User as UserIcon } from "lucide-react";

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const [isMounted, setIsMounted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    if (!isMounted || !user) return null;

    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-white border-b border-gray-100 p-4">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2 font-bold text-xl text-blue-600">
                        <LayoutDashboard className="w-6 h-6" />
                        SapioCode
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/progress")}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-all"
                        >
                            View Progress
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full p-8 text-center space-y-8">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                            <UserIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{user.full_name || "Student"}</h1>
                            <p className="text-gray-500">{user.email}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-xl space-y-2">
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Role</p>
                            <p className="font-medium capitalize">{user.role}</p>
                        </div>
                        <div className="p-4 border rounded-xl space-y-2">
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">User ID</p>
                            <p className="font-mono text-sm">{user.id}</p>
                        </div>
                    </div>

                    <div className="pt-6 border-t">
                        <h2 className="text-lg font-semibold mb-2">Notice</h2>
                        <p className="text-gray-600">
                            This is the authentication frontend. Your session token is stored securely in an HTTP-only-ready cookie.
                            Feel free to navigate to the learning interface to start your sessions.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
