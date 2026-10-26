"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, AlertCircle, Info, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/ui/logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) setError(decodeURIComponent(urlError));
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnconfirmedEmail(false);
    setResendStatus(null);

    try {
      const supabase = createClient();
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authErr) {
        if (authErr.message.toLowerCase().includes("email not confirmed")) {
          setUnconfirmedEmail(true);

          // Attempt auto-confirmation via database RPC
          try {
            const { error: rpcErr } = await supabase.rpc("confirm_user_email", { user_email: email });
            if (!rpcErr) {
              const { data: retryData, error: retryErr } = await supabase.auth.signInWithPassword({
                email,
                password,
              });
              if (!retryErr && retryData.user) {
                router.push("/app");
                router.refresh();
                return;
              }
            }
          } catch {
            // RPC not available yet, fall through to graceful UI alert
          }

          setError("Email not confirmed yet. Turn off 'Confirm email' in Supabase Auth or click Confirm User in dashboard.");
          setLoading(false);
          return;
        }
        throw authErr;
      }

      // Auto-ensure user profile and workspace are provisioned
      if (data.user) {
        const userName = data.user.user_metadata?.full_name || email.split("@")[0] || "FormIQ User";
        await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            name: userName,
            email: data.user.email || email,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

        const { data: member } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", data.user.id)
          .limit(1)
          .maybeSingle();

        if (!member) {
          const workspaceName = `${userName.split(" ")[0]}'s Workspace`;
          const slug = (email.split("@")[0] || "workspace") + "-" + Math.random().toString(36).substring(2, 6);
          const { data: ws } = await supabase
            .from("workspaces")
            .insert({
              name: workspaceName,
              slug,
              owner_id: data.user.id,
            })
            .select("id")
            .single();

          if (ws) {
            await supabase.from("workspace_members").insert({
              workspace_id: ws.id,
              user_id: data.user.id,
              role: "Owner",
            });
          }
        }
      }

      router.push("/app");
      router.refresh();
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Failed to authenticate. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    try {
      const supabase = createClient();
      const { error: resendErr } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (resendErr) {
        setResendStatus(`Resend failed: ${resendErr.message}`);
      } else {
        setResendStatus("Confirmation email dispatched! Check your inbox.");
      }
    } catch (e: any) {
      setResendStatus(e.message || "Failed to resend confirmation email.");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-auto border border-[#222422] bg-[#090A0A] p-8 md:p-10 space-y-6">
      <div className="space-y-1">
        <span className="font-mono text-[10px] text-[#315CFF] uppercase tracking-wider">
          SUPABASE AUTHENTICATION
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-[#F4F2EC]">Sign in to FormIQ</h1>
        <p className="text-xs text-[#B8B8B0]">
          Access your forms, response streams, and intelligence workspace.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {unconfirmedEmail && (
        <div className="p-4 bg-amber-950/60 border border-amber-800 text-amber-200 text-xs font-sans space-y-2.5">
          <div className="flex items-center gap-2 font-bold font-mono text-[11px] text-amber-300">
            <Info className="w-4 h-4 shrink-0" />
            <span>INSTANT FIX OPTIONS</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Your user account was created while email confirmation was active. Choose one of these options:
          </p>
          <div className="space-y-1.5 text-[11px] font-mono text-amber-100">
            <div className="p-2 bg-amber-900/40 border border-amber-700/50">
              <span className="font-bold">Option A (Instant in Dashboard):</span><br />
              In Supabase Dashboard → <strong>Authentication → Users</strong> → Click the <code>...</code> on your user → Click <strong>Confirm User</strong>.
            </div>
            <div className="p-2 bg-amber-900/40 border border-amber-700/50">
              <span className="font-bold">Option B (Resend Email):</span><br />
              <button
                type="button"
                onClick={handleResend}
                className="mt-1 text-white underline hover:text-amber-300 font-bold inline-flex items-center gap-1"
              >
                <MailCheck className="w-3.5 h-3.5" />
                Resend Confirmation Link
              </button>
              {resendStatus && <p className="mt-1 text-emerald-300">{resendStatus}</p>}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4 text-xs font-sans">
        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wider text-[#B8B8B0] mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-[#222422] bg-[#141614] text-[#F4F2EC] focus:outline-none focus:border-[#315CFF]"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block font-mono text-[11px] uppercase tracking-wider text-[#B8B8B0]">
              Password
            </label>
            <Link
              href="/auth/reset-password"
              className="font-mono text-[10px] text-[#315CFF] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-[#222422] bg-[#141614] text-[#F4F2EC] focus:outline-none focus:border-[#315CFF]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#F4F2EC] text-[#090A0A] hover:bg-white font-mono text-xs uppercase tracking-wider font-bold transition-colors flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#315CFF]" />
          ) : (
            <>
              <span>Sign In to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      <div className="pt-4 border-t border-[#222422] flex justify-between items-center font-mono text-[11px] text-[#8A8A82]">
        <span>Don't have an account?</span>
        <Link href="/auth/signup" className="text-[#315CFF] hover:underline font-semibold">
          Create account →
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#090A0A] text-[#F4F2EC] flex flex-col justify-between p-8 font-sans">
      <div className="flex justify-between items-center font-mono text-xs text-[#8A8A82] uppercase tracking-widest">
        <Logo size="sm" theme="dark" href="/" />
        <span>AUTH // VERIFY</span>
      </div>

      <Suspense
        fallback={
          <div className="w-full max-w-md mx-auto my-auto p-12 text-center font-mono text-xs text-[#8A8A82]">
            Loading authentication...
          </div>
        }
      >
        <LoginForm />
      </Suspense>

      <div className="text-center font-mono text-[10px] text-[#5E605E]">
        ROW LEVEL SECURITY ENFORCED • POSTGRESQL AUTH
      </div>
    </div>
  );
}
