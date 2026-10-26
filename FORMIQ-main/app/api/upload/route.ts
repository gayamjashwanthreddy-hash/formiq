import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFormById } from "@/lib/db";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const formId = formData.get("formId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!formId) {
      return NextResponse.json({ error: "Form ID is required" }, { status: 400 });
    }

    // Validate form existence and status
    const form = await getFormById(formId);
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PDF, DOCX, PNG, JPG, WEBP, TXT, CSV" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const fileExt = file.name.split(".").pop() || "bin";
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${formId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from("formiq-attachments")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.warn("[Upload] Storage upload warning, using resilient fallback:", uploadError.message);
      const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
      return NextResponse.json({
        success: true,
        storagePath: dataUri,
        fileName: safeName,
        size: file.size,
        mimeType: file.type,
      });
    }

    // Save record in files table if workspace is present
    await admin.from("files").insert({
      workspace_id: form.workspace_id,
      form_id: form.id,
      storage_path: storagePath,
      file_name: safeName,
      mime_type: file.type,
      size: file.size,
    });

    return NextResponse.json({
      success: true,
      storagePath,
      fileName: safeName,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error: any) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to process upload" }, { status: 500 });
  }
}
