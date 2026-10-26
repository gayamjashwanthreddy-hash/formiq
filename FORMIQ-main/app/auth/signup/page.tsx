"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, AlertCircle, Check, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/ui/logo";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitNotice, setRateLimitNotice] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRateLimitNotice(false);

    try {
      const supabase = createClient();
      const { data, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
        },
      });

      if (authErr) {
        if (authErr.message.toLowerCase().includes("rate limit") || authErr.status === 429) {
          setRateLimitNotice(true);
          setError("Supabase email rate limit reached (free tier limits confirmation emails). Turn OFF 'Confirm email' in Supabase to bypass instantly.");
          setLoading(false);
          return;
        }
        throw authErr;
      }

      // If Supabase has "Confirm email" disabled, session is active immediately!
      if (data.session && data.user) {
        // Upsert user profile
        await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            name: name || "FormIQ User",
            email: email,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

        // Auto-provision default workspace
        const workspaceName = `${name ? name.split(" ")[0] : "My"}'s Workspace`;
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

        router.push("/app");
        router.refresh();
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0A] text-[#F4F2EC] flex flex-col justify-between p-8 font-sans">
      <div className="flex justify-between items-center font-mono text-xs text-[#8A8A82] uppercase tracking-widest">
        <Logo size="sm" theme="dark" href="/" />
        <span>AUTH // SIGN UP</span>
      </div>

      <div className="w-full max-w-md mx-auto my-auto border border-[#222422] bg-[#090A0A] p-8 md:p-10 space-y-6">
        <div className="space-y-1">
          <span className="font-mono text-[10px] text-[#315CFF] uppercase tracking-wider">
            CREATE WORKSPACE
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[#F4F2EC]">Start with FormIQ</h1>
          <p className="text-xs text-[#B8B8B0]">
            Create forms, gather responses, and uncover actionable intelligence.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {rateLimitNotice && (
          <div className="p-4 bg-amber-950/60 border border-amber-800 text-amber-200 text-xs font-sans space-y-2">
            <div className="flex items-center gap-2 font-bold font-mono text-[11px] text-amber-300">
              <Info className="w-4 h-4 shrink-0" />
              <span>HOW TO FIX IN 10 SECONDS</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Supabase free projects limit confirmation emails to 3 per hour. To bypass this instantly for development:
            </p>
            <ol className="list-decimal pl-4 space-y-1 text-[11px] text-amber-100 font-mono">
              <li>Open your <strong>Supabase Dashboard</strong></li>
              <li>Go to <strong>Authentication → Providers → Email</strong></li>
              <li>Toggle <strong>"Confirm email"</strong> to <strong>OFF</strong></li>
              <li>Click <strong>Save</strong> and retry signing up below!</li>
            </ol>
          </div>
        )}

        {success ? (
          <div className="p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-start gap-2">
            <Check className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Account created successfully.</p>
              <p>Check your email (<span className="text-emerald-200">{email}</span>) for a confirmation link to activate your workspace.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[#B8B8B0] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full p-3 border border-[#222422] bg-[#141614] text-[#F4F2EC] focus:outline-none focus:border-[#315CFF]"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[#B8B8B0] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@domain.com"
                className="w-full p-3 border border-[#222422] bg-[#141614] text-[#F4F2EC] focus:outline-none focus:border-[#315CFF]"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[#B8B8B0] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
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
                  <span>Create Account & Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-[#222422] flex justify-between items-center font-mono text-[11px] text-[#8A8A82]">
          <span>Already have an account?</span>
          <Link href="/auth/login" className="text-[#315CFF] hover:underline font-semibold">
            Sign in →
          </Link>
        </div>
      </div>

      <div className="text-center font-mono text-[10px] text-[#5E605E]">
        ROW LEVEL SECURITY ENFORCED • POSTGRESQL AUTH
      </div>
    </div>
  );
}
