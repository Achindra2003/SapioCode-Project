import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AssistantRequest, AssistantResponse } from "@/lib/types";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
    // ── Rate limit: 10 requests / minute per IP ──
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const { allowed, retryAfterMs } = checkRateLimit(`assistant:${ip}`, 10, 10 / 60);
    if (!allowed) {
        return NextResponse.json(
            { content: "Rate limited. Please wait a moment before asking again." } as AssistantResponse,
            { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
        );
    }

    // ── Parse body ──
    let body: AssistantRequest;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ content: "Invalid request." } as AssistantResponse, { status: 400 });
    }

    const { code, language, lastOutput, lastError, chatHistory, userMessage } = body;

    if (!code || !language) {
        return NextResponse.json({ content: "Code and language are required." } as AssistantResponse, { status: 400 });
    }

    if (code.length > 10_000) {
        return NextResponse.json({ content: "Code is too long for analysis." } as AssistantResponse, { status: 400 });
    }

    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ content: "AI service is not configured." } as AssistantResponse, { status: 500 });
    }

    // ── Build system prompt ──
    const systemPrompt = `You are an expert coding tutor and assistant. You help students learn to code by:
1. Explaining what their code does in simple, beginner-friendly terms
2. Detecting logical bugs and common mistakes
3. Suggesting specific improvements with explanations
4. Providing an optimized version when applicable
5. Explaining time and space complexity when relevant

Be concise but thorough. Use markdown formatting for code snippets.
Always be encouraging and educational — never condescending.

Current context:
- Language: ${language}
- Code:\n\`\`\`${language}\n${code}\n\`\`\`
${lastOutput ? `- Last Output:\n\`\`\`\n${lastOutput}\n\`\`\`` : ""}
${lastError ? `- Last Error:\n\`\`\`\n${lastError}\n\`\`\`` : ""}`;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Build conversation history for the model
        const contents = [
            { role: "user" as const, parts: [{ text: systemPrompt }] },
            { role: "model" as const, parts: [{ text: "I understand. I'm ready to help analyze the code. What would you like to know?" }] },
        ];

        // Add chat history
        if (chatHistory && chatHistory.length > 0) {
            for (const msg of chatHistory) {
                contents.push({
                    role: msg.role === "user" ? "user" as const : "model" as const,
                    parts: [{ text: msg.content }],
                });
            }
        }

        // Add current user message
        contents.push({
            role: "user" as const,
            parts: [{ text: userMessage || "Please analyze this code — explain what it does, find any bugs, suggest improvements, and provide an optimized version if possible." }],
        });

        const result = await model.generateContent({ contents });
        const content = result.response.text();

        return NextResponse.json({ content } as AssistantResponse);
    } catch (err: unknown) {
        console.error("AI Assistant error:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ content: `AI service error: ${message}` } as AssistantResponse, { status: 502 });
    }
}
