import { NextRequest, NextResponse } from "next/server";

const AI_BACKEND =
  process.env.AI_API_URL ||
  process.env.NEXT_PUBLIC_AI_API_URL ||
  "http://localhost:8003/api";

/**
 * Proxy: POST /api/ai/generate → AI backend /api/problems/generate
 * Avoids CORS issues by keeping the browser→Next.js call same-origin.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${AI_BACKEND}/problems/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI proxy error";
    return NextResponse.json(
      { error: "ai_proxy_error", detail: message },
      { status: 502 }
    );
  }
}
