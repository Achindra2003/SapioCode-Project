import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { LANGUAGES, MAX_CODE_LENGTH, MAX_STDIN_LENGTH, JDOODLE_API_URL } from "@/lib/constants";
import { CompileResponse } from "@/lib/types";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
    try {
        console.log(">>> [API/Compile] Request received");
        try {
            fs.appendFileSync("api_diagnostics.log", `[${new Date().toISOString()}] POST /api/compile received\n`);
        } catch (e) {
            console.error("Failed to write to log file:", e);
        }

        // ── Rate limit ──
        const ip = req.headers.get("x-forwarded-for") ?? "unknown";
        const { allowed, retryAfterMs } = checkRateLimit(`compile:${ip}`, 20, 20 / 60);
        if (!allowed) {
            return NextResponse.json(
                { success: false, output: "", error: "Rate limited. Try again shortly.", executionTime: null },
                { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
            );
        }

        // ... rest of the logic ...
        let body: { code?: string; language?: string; stdin?: string };
        try {
            body = await req.json();
        } catch {
            return NextResponse.json(
                { success: false, output: "", error: "Invalid JSON body.", executionTime: null } as CompileResponse,
                { status: 400 }
            );
        }

        const { code, language, stdin } = body;

        if (!code || typeof code !== "string") {
            return NextResponse.json(
                { success: false, output: "", error: "Code is required.", executionTime: null } as CompileResponse,
                { status: 400 }
            );
        }

        if (code.length > MAX_CODE_LENGTH) {
            return NextResponse.json(
                { success: false, output: "", error: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters.`, executionTime: null } as CompileResponse,
                { status: 400 }
            );
        }

        if (stdin && typeof stdin === "string" && stdin.length > MAX_STDIN_LENGTH) {
            return NextResponse.json(
                { success: false, output: "", error: `Stdin exceeds maximum length of ${MAX_STDIN_LENGTH} characters.`, executionTime: null } as CompileResponse,
                { status: 400 }
            );
        }

        if (!language || !LANGUAGES[language]) {
            return NextResponse.json(
                { success: false, output: "", error: `Unsupported language. Supported: ${Object.keys(LANGUAGES).join(", ")}`, executionTime: null } as CompileResponse,
                { status: 400 }
            );
        }

        const langConfig = LANGUAGES[language];
        const clientId = process.env.JDOODLE_CLIENT_ID;
        const clientSecret = process.env.JDOODLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return NextResponse.json(
                { success: false, output: "", error: "Server configuration error: JDoodle credentials missing.", executionTime: null } as CompileResponse,
                { status: 500 }
            );
        }

        // ── Call JDoodle API ──
        const jdoodlePayload = {
            clientId,
            clientSecret,
            script: code,
            stdin: stdin || "",
            language: langConfig.language,
            versionIndex: langConfig.versionIndex,
        };

        let response: Response | null = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 15000);

                response = await fetch(JDOODLE_API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(jdoodlePayload),
                    signal: controller.signal,
                });

                clearTimeout(timeout);

                if (response.status === 429 && attempt === 0) {
                    await new Promise((r) => setTimeout(r, 1500));
                    continue;
                }
                break;
            } catch (err: unknown) {
                if (attempt === 0) {
                    await new Promise((r) => setTimeout(r, 1000));
                    continue;
                }
                throw err;
            }
        }

        if (!response || !response.ok) {
            const statusText = response ? `${response.status} ${response.statusText}` : "No response";
            return NextResponse.json(
                { success: false, output: "", error: `JDoodle API error: ${statusText}`, executionTime: null } as CompileResponse,
                { status: 502 }
            );
        }

        const data = await response.json();
        const hasError = data.error || (data.statusCode && data.statusCode !== 200);
        const output = (data.output || "").trim();
        const cpuTime = data.cpuTime ?? null;

        return NextResponse.json({
            success: !hasError,
            output,
            error: hasError ? (data.error || data.output || "Execution error") : null,
            executionTime: cpuTime !== null ? `${cpuTime}s` : null,
        } as CompileResponse);

    } catch (err: any) {
        console.error("FATAL: Unhandled error in /api/compile:", err);
        return NextResponse.json(
            { success: false, output: "", error: `Internal Server Error: ${err.message}`, executionTime: null } as CompileResponse,
            { status: 500 }
        );
    }
}
