"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, AlertCircle, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (resetErr) throw resetErr;
      setSent(true);
    } catch (err: any) {
      console.error("Reset error:", err);
      setError(err.message || "Failed to initiate password reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0A] text-[#F4F2EC] flex flex-col justify-between p-8 font-sans">
      <div className="flex justify-between items-center font-mono text-xs text-[#8A8A82] uppercase tracking-widest">
        <Link href="/" className="font-sans font-bold text-sm tracking-tight text-[#F4F2EC] flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-[#315CFF]" />
          FORMIQ
        </Link>
        <span>AUTH // RECOVERY</span>
      </div>

      <div className="w-full max-w-md mx-auto my-auto border border-[#222422] bg-[#090A0A] p-8 md:p-10 space-y-6">
        <div className="space-y-1">
          <span className="font-mono text-[10px] text-[#315CFF] uppercase tracking-wider">
            PASSWORD RESET
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[#F4F2EC]">Reset your password</h1>
          <p className="text-xs text-[#B8B8B0]">
            Enter your email and we will send a password reset verification link.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {sent ? (
          <div className="p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-mono space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <Check className="w-4 h-4" />
              <span>Reset link dispatched</span>
            </div>
            <p className="text-[11px] text-emerald-200">
              Check your inbox for instructions to set a new password.
            </p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[#B8B8B0] mb-1.5">
                Account Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
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
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-[#222422] flex justify-between items-center font-mono text-[11px] text-[#8A8A82]">
          <Link href="/auth/login" className="text-[#315CFF] hover:underline">
            ← Return to sign in
          </Link>
        </div>
      </div>

      <div className="text-center font-mono text-[10px] text-[#5E605E]">
        ROW LEVEL SECURITY ENFORCED • POSTGRESQL AUTH
      </div>
    </div>
  );
}
