import { NextResponse } from "next/server";
import { getFormById, getFormResponses } from "@/lib/db";
import { processNaturalLanguageQuery } from "@/lib/ai/nl-query";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const form = await getFormById(id);
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query string is required" }, { status: 400 });
    }

    const responses = await getFormResponses(id);
    const questions = form.questions || [];

    const result = await processNaturalLanguageQuery(query, form, questions, responses);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/forms/[id]/nl-query error:", error);
    return NextResponse.json({ error: "Failed to process query" }, { status: 500 });
  }
}
