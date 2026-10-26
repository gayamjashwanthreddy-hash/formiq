"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowRight, Layers, Check, Loader2 } from "lucide-react";
import AppHeader from "@/components/app/app-header";
import { FORM_TEMPLATES } from "@/lib/templates";

const QUICK_PROMPTS = [
  "Create a volunteer recruitment form for our college entrepreneurship event. We need students for marketing, technical, design, content and operations. Ask about their skills, previous experience, availability and motivation.",
  "Design a software engineering internship application form asking for university, graduation year, GitHub URL, tech stack, and resume PDF.",
  "Build a customer feedback survey evaluating usability, product reliability, friction points, and Net Promoter Score (NPS).",
  "Create a 36-hour hackathon team registration form collecting leader details, project track, and teammate info.",
];

export default function CreateFormPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (promptText?: string) => {
    const text = promptText || prompt;
    if (!text.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || errorData?.message || "Failed to generate form specification");
      }

      const form = await res.json();
      router.push(`/app/forms/${form.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong during generation. Please try again.");
      setIsGenerating(false);
    }
  };

  const handleInstantiateTemplate = async (templateId: string) => {
    const tpl = FORM_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    handleGenerate(tpl.prompt);
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppHeader
        title="Create a Form"
        subtitle="Describe what you need in natural language or start from a validated template."
      />

      <div className="p-8 space-y-10 max-w-5xl">
        {/* Natural Language Prompt Builder */}
        <div className="border border-[#E5E3DB] bg-[#FAFAF7] p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#E5E3DB] pb-4">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#090A0A]">
              <span className="w-2 h-2 bg-[#315CFF]" />
              <span>NATURAL LANGUAGE FORM SPECIFICATION</span>
            </div>
            <span className="font-mono text-[10px] text-[#8A8A82] uppercase">
              STRUCTURED ZOD VALIDATION
            </span>
          </div>

          <div>
            <label
              htmlFor="form-prompt-input"
              className="block font-bold text-sm text-[#090A0A] mb-2 font-sans"
            >
              Describe what you need
            </label>
            <textarea
              id="form-prompt-input"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Create a volunteer recruitment form for our college entrepreneurship event. We need students for marketing, technical, design, content and operations. Ask about their skills, previous experience, availability and motivation."
              className="w-full p-4 border border-[#E5E3DB] bg-[#F8F7F4] text-[#090A0A] placeholder-[#8A8A82] text-sm focus:outline-none focus:border-[#315CFF] resize-none font-sans"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 font-mono text-xs">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleGenerate()}
                disabled={isGenerating || !prompt.trim()}
                className="px-6 py-3 bg-[#090A0A] hover:bg-[#222422] disabled:opacity-50 text-[#F4F2EC] flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-wider transition-colors font-bold"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#315CFF]" />
                    <span>Inferring Schema & Questions...</span>
                  </>
                ) : (
                  <>
                    <span>Create form</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <Link
                href="/app/templates"
                className="px-4 py-3 border border-[#E5E3DB] hover:border-[#090A0A] text-[#090A0A] font-mono text-xs uppercase tracking-wider text-center transition-colors flex items-center justify-center gap-2"
              >
                <Layers className="w-3.5 h-3.5" />
                Start from template
              </Link>
            </div>

            <div className="font-mono text-[11px] text-[#8A8A82]">
              Est. time: ~1.8 seconds
            </div>
          </div>

          {/* Quick Prompt Ideas */}
          <div className="border-t border-[#E5E3DB] pt-6 space-y-3 font-sans">
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#5E605E]">
              Or click an example prompt to load instantly:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(qp)}
                  className="p-3 border border-[#E5E3DB] hover:border-[#315CFF] text-left text-xs text-[#222422] hover:bg-[#F2EFE9] transition-all bg-[#FAFAF7]"
                >
                  <p className="line-clamp-2">"{qp}"</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Featured Templates Row */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#090A0A]">Instant Workflows</h2>
            <Link
              href="/app/templates"
              className="font-mono text-xs text-[#315CFF] hover:underline uppercase tracking-wider"
            >
              Browse All Templates →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {FORM_TEMPLATES.slice(0, 3).map((tpl) => (
              <div
                key={tpl.id}
                className="border border-[#E5E3DB] bg-[#FAFAF7] p-5 flex flex-col justify-between space-y-4 hover:border-[#090A0A] transition-colors"
              >
                <div>
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 bg-[#E8E5DD] text-[#222422]">
                    {tpl.category}
                  </span>
                  <h3 className="font-bold text-sm text-[#090A0A] mt-2">{tpl.title}</h3>
                  <p className="text-xs text-[#5E605E] mt-1 line-clamp-2 font-sans">
                    {tpl.description}
                  </p>
                </div>

                <button
                  onClick={() => handleInstantiateTemplate(tpl.id)}
                  disabled={isGenerating}
                  className="w-full py-2 border border-[#E5E3DB] hover:border-[#090A0A] hover:bg-[#090A0A] hover:text-white font-mono text-[11px] uppercase tracking-wider transition-all text-center"
                >
                  Use Template
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
