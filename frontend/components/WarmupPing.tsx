"use client";

import { useEffect } from "react";

/**
 * Client component that pings Render free-tier backends on first load
 * to wake them up (they sleep after 15min idle).
 */
export default function WarmupPing() {
  useEffect(() => {
    const AUTH = process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:8000";
    const AI = (process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8003/api").replace(/\/api$/, "");
    fetch(`${AUTH}/health`).catch(() => {});
    fetch(`${AI}/health`).catch(() => {});
  }, []);

  return null;
}
