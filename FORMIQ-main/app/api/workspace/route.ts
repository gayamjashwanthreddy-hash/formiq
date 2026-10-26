import { NextResponse } from "next/server";
import { getWorkspaceAndMembers, updateWorkspaceSettings } from "@/lib/db";

export async function GET() {
  try {
    const data = await getWorkspaceAndMembers();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/workspace error:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspace and team information" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const updated = await updateWorkspaceSettings({
      name: body.name,
      slug: body.slug,
      notifications: body.notifications,
    });
    return NextResponse.json({ success: true, workspace: updated.workspace, notifications: updated.notifications });
  } catch (error) {
    console.error("PATCH /api/workspace error:", error);
    return NextResponse.json(
      { error: "Failed to update workspace settings" },
      { status: 500 }
    );
  }
}
