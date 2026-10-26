import { NextResponse } from "next/server";
import { getFormBySlug } from "@/lib/db";

export async function GET(req: Request, props: { params: Promise<{ slug: string }> }) {
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

    // Return public-safe payload
    return NextResponse.json({
      id: form.id,
      title: form.title,
      description: form.description,
      type: form.type,
      status: form.status,
      slug: form.slug,
      settings: {
        anonymous: form.settings.anonymous,
        emailCollection: form.settings.emailCollection,
        customThankYouTitle: form.settings.customThankYouTitle,
        customThankYouMessage: form.settings.customThankYouMessage,
      },
      questions: form.questions || [],
    });
  } catch (error) {
    console.error("GET /api/f/[slug] error:", error);
    return NextResponse.json({ error: "Failed to fetch form" }, { status: 500 });
  }
}
