import { NextRequest } from "next/server";
import { proxyToAI } from "@/lib/api/ai-proxy";

/** POST /api/ai/generate-tests → AI backend /api/problems/generate-tests */
export async function POST(request: NextRequest) {
  return proxyToAI(request, "/problems/generate-tests");
}
