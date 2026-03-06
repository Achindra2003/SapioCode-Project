import { NextRequest } from "next/server";
import { proxyToAI } from "@/lib/api/ai-proxy";

/** POST /api/ai/generate → AI backend /api/problems/generate */
export async function POST(request: NextRequest) {
  return proxyToAI(request, "/problems/generate");
}
