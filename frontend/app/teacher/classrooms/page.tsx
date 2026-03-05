"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This page just redirects to the dashboard which already shows classrooms
export default function ClassroomsPage() {
  const router = useRouter();
  useEffect(() => {
    router.push("/teacher");
  }, [router]);
  return null;
}
