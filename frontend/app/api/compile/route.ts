import { NextRequest, NextResponse } from "next/server";

const JDOODLE_API_URL = "https://api.jdoodle.com/v1/execute";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, language, versionIndex, stdin } = body;

    const clientId = process.env.JDOODLE_CLIENT_ID;
    const clientSecret = process.env.JDOODLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "JDoodle credentials not configured on server" },
        { status: 500 }
      );
    }

    const response = await fetch(JDOODLE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        clientSecret,
        script: code,
        stdin: stdin || "",
        language: language || "python3",
        versionIndex: versionIndex || "4",
      }),
    });

    const data = await response.json();

    const hasError = data.error || (data.statusCode && data.statusCode !== 200);
    const output = (data.output || "").trim();
    const cpuTime = data.cpuTime ?? null;

    return NextResponse.json({
      success: !hasError,
      output,
      error: hasError ? data.error || data.output || "Execution error" : null,
      executionTime: cpuTime !== null ? `${cpuTime}s` : null,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, output: "", error: err instanceof Error ? err.message : String(err), executionTime: null },
      { status: 500 }
    );
  }
}
