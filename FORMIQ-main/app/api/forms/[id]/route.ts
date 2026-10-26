import { NextResponse } from "next/server";
import { getFormById, saveForm, deleteForm } from "@/lib/db";
import { Form, FormQuestion } from "@/types/formiq";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const form = await getFormById(id);
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    return NextResponse.json(form);
  } catch (error) {
    console.error("GET /api/forms/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch form" }, { status: 500 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const existing = await getFormById(id);
    if (!existing) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const body = await req.json();
    const updatedForm: Form = {
      ...existing,
      title: body.title !== undefined ? body.title : existing.title,
      description: body.description !== undefined ? body.description : existing.description,
      type: body.type !== undefined ? body.type : existing.type,
      status: body.status !== undefined ? body.status : existing.status,
      slug: body.slug !== undefined ? body.slug : existing.slug,
      settings: body.settings !== undefined ? body.settings : existing.settings,
      published_at:
        body.status === "published" && !existing.published_at
          ? new Date().toISOString()
          : existing.published_at,
      updated_at: new Date().toISOString(),
    };

    let questions: FormQuestion[] | undefined = undefined;
    if (body.questions) {
      questions = body.questions.map((q: any, idx: number) => ({
        ...q,
        id: q.id || `q-${Date.now()}-${idx + 1}`,
        form_id: id,
        position: idx + 1,
      }));
    }

    const saved = await saveForm(updatedForm, questions);
    return NextResponse.json(saved);
  } catch (error) {
    console.error("PUT /api/forms/[id] error:", error);
    return NextResponse.json({ error: "Failed to update form" }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const ok = await deleteForm(id);
    if (!ok) {
      return NextResponse.json({ error: "Form not found or already deleted" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/forms/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete form" }, { status: 500 });
  }
}
