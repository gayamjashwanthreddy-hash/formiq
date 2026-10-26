import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { path } = await req.json();

    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "Storage path is required" }, { status: 400 });
    }

    if (path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) {
      return NextResponse.json({ signedUrl: path });
    }

    // Verify workspace access: extract formId from path (first segment)
    const formId = path.split("/")[0];
    const { data: form } = await supabase
      .from("forms")
      .select("workspace_id")
      .eq("id", formId)
      .single();

    if (!form) {
      return NextResponse.json({ error: "Access denied to file" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from("formiq-attachments")
      .createSignedUrl(path, 3600); // 1 hour validity

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Failed to generate signed URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (error: any) {
    console.error("POST /api/files/signed-url error:", error);
    return NextResponse.json({ error: "Failed to generate file access URL" }, { status: 500 });
  }
}
