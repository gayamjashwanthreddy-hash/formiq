import { NextResponse } from "next/server";
import { getFormById, getFormResponses, getAIInsights, saveAIInsights } from "@/lib/db";
import { generateAIResponseIntelligence } from "@/lib/ai/response-intelligence";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    let insights = await getAIInsights(id);

    // Auto-generate if not yet cached or empty
    if (!insights || insights.length === 0) {
      const form = await getFormById(id);
      if (form) {
        const responses = await getFormResponses(id);
        const questions = form.questions || [];
        insights = await generateAIResponseIntelligence(form, questions, responses);
        if (insights && insights.length > 0) {
          await saveAIInsights(id, insights);
        }
      }
    }

    return NextResponse.json(insights || []);
  } catch (error) {
    console.error("GET /api/forms/[id]/insights error:", error);
    return NextResponse.json({ error: "Failed to fetch insights" }, { status: 500 });
  }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const form = await getFormById(id);
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const responses = await getFormResponses(id);
    const questions = form.questions || [];

    const newInsights = await generateAIResponseIntelligence(form, questions, responses);
    await saveAIInsights(id, newInsights);

    return NextResponse.json(newInsights);
  } catch (error) {
    console.error("POST /api/forms/[id]/insights error:", error);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}
