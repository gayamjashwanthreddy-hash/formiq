import { NextResponse } from "next/server";
import { getFormById } from "@/lib/db";
import { modifyFormWithAI } from "@/lib/ai/form-engine";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const form = await getFormById(id);
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const { command, currentQuestions } = await req.json();
    if (!command || typeof command !== "string") {
      return NextResponse.json({ error: "Command is required" }, { status: 400 });
    }

    const questionsToModify = currentQuestions || form.questions || [];
    const result = await modifyFormWithAI(form, questionsToModify, command);

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/forms/[id]/ai-edit error:", error);
    return NextResponse.json({ error: "Failed to process AI modification" }, { status: 500 });
  }
}
