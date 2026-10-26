import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Supabase Auth Callback Handler
 *
 * This route is called after:
 * - Email confirmation (signup)
 * - Magic link authentication
 * - OAuth provider callbacks
 *
 * It exchanges the one-time code for a session, then:
 * 1. Creates a profile record for new users
 * 2. Creates a default workspace for new users
 * 3. Adds them as Owner in workspace_members
 * 4. Redirects to the app dashboard
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    console.error("[Auth Callback] Error:", error, errorDescription);
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(errorDescription ?? error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_code`);
  }

  const supabase = await createClient();

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.user) {
    console.error("[Auth Callback] Exchange error:", exchangeError?.message);
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(exchangeError?.message ?? "auth_error")}`
    );
  }

  const user = data.user;

  // Upsert profile
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      name:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email?.split("@")[0] ??
        "FormIQ User",
      email: user.email ?? "",
      avatar_url: user.user_metadata?.avatar_url ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  // Check if user already has a workspace
  const { data: existingMembership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!existingMembership) {
    // Create default workspace for new user
    const workspaceName =
      user.user_metadata?.name
        ? `${user.user_metadata.name}'s Workspace`
        : `${user.email?.split("@")[0] ?? "My"} Workspace`;

    const workspaceSlug =
      (user.email?.split("@")[0] ?? "workspace") +
      "-" +
      Math.random().toString(36).substring(2, 6);

    const { data: workspace } = await supabase
      .from("workspaces")
      .insert({
        name: workspaceName,
        slug: workspaceSlug,
        owner_id: user.id,
      })
      .select("id")
      .single();

    if (workspace) {
      await supabase.from("workspace_members").insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: "Owner",
      });
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${next}`);
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  } else {
    return NextResponse.redirect(`${origin}${next}`);
  }
}
