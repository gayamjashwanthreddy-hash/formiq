import { NextResponse } from "next/server";
import { updateResponseStatus } from "@/lib/db";

export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string; responseId: string }> }
) {
  try {
    const { responseId } = await props.params;
    const body = await req.json();
    const { status, notes } = body;

    const updated = await updateResponseStatus(responseId, status, notes);
    if (!updated) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/forms/[id]/responses/[responseId] error:", error);
    return NextResponse.json({ error: "Failed to update response" }, { status: 500 });
  }
}

export const PATCH = PUT;
