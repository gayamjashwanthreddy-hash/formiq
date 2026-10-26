import { NextResponse } from "next/server";
import { getFormResponses } from "@/lib/db";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const responses = await getFormResponses(id);
    return NextResponse.json(responses);
  } catch (error) {
    console.error("GET /api/forms/[id]/responses error:", error);
    return NextResponse.json({ error: "Failed to fetch responses" }, { status: 500 });
  }
}
