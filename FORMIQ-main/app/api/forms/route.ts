import { NextResponse } from "next/server";
import { getForms, saveForm, getWorkspace } from "@/lib/db";
import { generateFormFromPrompt } from "@/lib/ai/form-engine";
import { Form, FormQuestion } from "@/types/formiq";

export async function GET() {
  try {
    const forms = await getForms();
    return NextResponse.json(forms);
  } catch (error) {
    console.error("GET /api/forms error:", error);
    return NextResponse.json({ error: "Failed to fetch forms" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const workspace = await getWorkspace();

    if (body.prompt) {
      // AI Form Generation
      const generated = await generateFormFromPrompt(body.prompt);
      const formId = `form-${Date.now()}`;
      const baseSlug =
        (generated.title || "custom-form")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "")
          .slice(0, 40) || "form";
      const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

      const newQuestions: FormQuestion[] = generated.questions.map((q, idx) => ({
        id: `q-${Date.now()}-${idx + 1}`,
        form_id: formId,
        question_key: q.question_key,
        type: q.type as any,
        label: q.label,
        description: q.description,
        options: q.options as any,
        required: q.required,
        validation: q.validation,
        position: idx + 1,
      }));

      const newForm: Form = {
        id: formId,
        workspace_id: workspace.id,
        title: generated.title,
        description: generated.description,
        type: generated.type as any,
        status: "draft",
        slug,
        settings: {
          anonymous: false,
          emailCollection: true,
          responseLimit: null,
          allowDuplicates: true,
          redirectUrl: null,
          notificationOnResponse: true,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        questions: newQuestions,
        response_count: 0,
      };

      const saved = await saveForm(newForm, newQuestions);
      return NextResponse.json(saved, { status: 201 });
    }

    // Direct form creation (e.g. from template or blank)
    const formId = `form-${Date.now()}`;
    const slug = (body.title || "untitled-form")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
      .slice(0, 40) + `-${Math.random().toString(36).substring(2, 6)}`;

    const questions: FormQuestion[] = (body.questions || []).map((q: any, idx: number) => ({
      id: q.id || `q-${Date.now()}-${idx + 1}`,
      form_id: formId,
      question_key: q.question_key || `field_${idx + 1}`,
      type: q.type || "text",
      label: q.label || `Question ${idx + 1}`,
      description: q.description,
      options: q.options || [],
      required: !!q.required,
      position: idx + 1,
    }));

    const newForm: Form = {
      id: formId,
      workspace_id: workspace.id,
      title: body.title || "Untitled Form",
      description: body.description || "",
      type: body.type || "general",
      status: body.status || "draft",
      slug,
      settings: body.settings || {
        anonymous: false,
        emailCollection: true,
        responseLimit: null,
        allowDuplicates: true,
        redirectUrl: null,
        notificationOnResponse: true,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      published_at: body.status === "published" ? new Date().toISOString() : undefined,
      questions,
      response_count: 0,
    };

    const saved = await saveForm(newForm, questions);
    return NextResponse.json(saved, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/forms error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create form" },
      { status: 500 }
    );
  }
}
