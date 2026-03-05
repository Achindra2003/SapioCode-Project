"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function HomePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      if (isAuthenticated) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [isMounted, isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d130e]">
      <div className="animate-pulse text-[#44f91f]/60">Loading...</div>
    </div>
  );
}
