import { NextRequest, NextResponse } from "next/server";
import { Question } from "@/lib/types";
import questionsData from "@/lib/questions.json";

const questions: Question[] = questionsData as Question[];

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
        const question = questions.find((q) => q.id === id);
        if (!question) {
            return NextResponse.json({ error: "Question not found." }, { status: 404 });
        }
        return NextResponse.json(question);
    }

    // Return list of all questions (without starter code for lighter payload)
    const list = questions.map(({ id, title, description, difficulty }) => ({
        id,
        title,
        description,
        difficulty,
    }));

    return NextResponse.json(list);
}
