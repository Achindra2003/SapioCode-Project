import { NextRequest, NextResponse } from "next/server";

const AI_BACKEND =
  process.env.AI_API_URL ||
  process.env.NEXT_PUBLIC_AI_API_URL ||
  "http://localhost:8003/api";

/**
 * Proxy a POST request to the AI backend with retry + timeout for cold-start
 * resilience. Used by all /api/ai/* Next.js route handlers.
 */
export async function proxyToAI(request: NextRequest, backendPath: string) {
  try {
    const body = await request.json();
    let lastError = "AI proxy error";

    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 3000));

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60_000);

      try {
        const response = await fetch(`${AI_BACKEND}${backendPath}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if ((response.status === 502 || response.status === 503) && attempt < 1) {
          lastError = `AI backend returned ${response.status}`;
          continue;
        }

        let data;
        try {
          data = await response.json();
        } catch {
          return NextResponse.json(
            { error: "ai_proxy_error", detail: `AI returned non-JSON (${response.status})` },
            { status: 502 }
          );
        }

        if (!response.ok) {
          return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
      } catch (err: unknown) {
        clearTimeout(timer);
        lastError = err instanceof Error ? err.message : "AI proxy error";
        if (err instanceof DOMException && err.name === "AbortError") {
          lastError = "AI request timed out — service may be starting up";
          if (attempt < 1) continue;
        }
      }
    }

    return NextResponse.json(
      { error: "ai_proxy_error", detail: lastError },
      { status: 502 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI proxy error";
    return NextResponse.json(
      { error: "ai_proxy_error", detail: message },
      { status: 502 }
    );
  }
}
