import { NextResponse } from "next/server";
import { updateMemberRole, removeMember, getWorkspaceAndMembers } from "@/lib/db";
import { WorkspaceRole } from "@/types/formiq";

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const body = await req.json();
    const { role } = body;

    const validRoles: WorkspaceRole[] = ["Owner", "Editor", "Analyst", "Viewer"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role specified" },
        { status: 400 }
      );
    }

    const updated = await updateMemberRole(params.id, role as WorkspaceRole);
    if (!updated) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, member: updated });
  } catch (error) {
    console.error("PATCH /api/workspace/members/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const data = await getWorkspaceAndMembers();
    
    // Protect current user from self-deletion
    const targetMember = data.members.find((m) => m.id === params.id || m.user_id === params.id);
    if (targetMember?.isCurrentUser) {
      return NextResponse.json(
        { error: "Cannot remove yourself from the workspace" },
        { status: 400 }
      );
    }

    const removed = await removeMember(params.id);
    if (!removed) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Member removed from workspace" });
  } catch (error) {
    console.error("DELETE /api/workspace/members/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
