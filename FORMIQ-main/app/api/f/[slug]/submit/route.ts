import { NextResponse } from "next/server";
import { getFormBySlug, submitFormResponse } from "@/lib/db";

export async function POST(req: Request, props: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await props.params;
    const form = await getFormBySlug(slug);

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    if (form.status !== "published") {
      return NextResponse.json(
        { error: `This form is currently ${form.status} and not accepting submissions.` },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { answers, email, completionTimeSeconds } = body;

    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "Answers object is required" }, { status: 400 });
    }

    // Server-side validation of required questions
    if (form.questions) {
      for (const q of form.questions) {
        if (q.required) {
          const val = answers[q.id];
          if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
            return NextResponse.json(
              { error: `Missing required field: "${q.label}"` },
              { status: 400 }
            );
          }
        }
      }
    }

    const response = await submitFormResponse(
      form.id,
      answers,
      email,
      completionTimeSeconds || 140
    );

    return NextResponse.json(
      {
        success: true,
        responseId: response.id,
        message: form.settings.customThankYouMessage || "Your response has been recorded successfully.",
        title: form.settings.customThankYouTitle || "Submission Confirmed",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/f/[slug]/submit error:", error);
    return NextResponse.json({ error: "Failed to submit response" }, { status: 500 });
  }
}
