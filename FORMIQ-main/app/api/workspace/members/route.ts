import { NextResponse } from "next/server";
import { getWorkspaceAndMembers, inviteWorkspaceMember } from "@/lib/db";
import { WorkspaceRole } from "@/types/formiq";

export async function GET() {
  try {
    const data = await getWorkspaceAndMembers();
    return NextResponse.json(data.members);
  } catch (error) {
    console.error("GET /api/workspace/members error:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, role, name } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }

    const validRoles: WorkspaceRole[] = ["Owner", "Editor", "Analyst", "Viewer"];
    const memberRole: WorkspaceRole = validRoles.includes(role) ? role : "Editor";

    const newMember = await inviteWorkspaceMember(email, memberRole, name);
    return NextResponse.json({ success: true, member: newMember }, { status: 201 });
  } catch (error) {
    console.error("POST /api/workspace/members error:", error);
    return NextResponse.json(
      { error: "Failed to invite team member" },
      { status: 500 }
    );
  }
}
