"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import AppHeader from "@/components/app/app-header";
import { FORM_TEMPLATES } from "@/lib/templates";

const CATEGORIES = [
  "All",
  "Recruitment",
  "Registration",
  "Feedback",
  "Application",
  "Education",
  "Research",
];

export default function TemplatesPage() {
  const router = useRouter();
  const [selectedCat, setSelectedCat] = useState("All");
  const [isInstantiating, setIsInstantiating] = useState<string | null>(null);

  const handleUseTemplate = async (templateId: string) => {
    const tpl = FORM_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;

    setIsInstantiating(templateId);
    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: tpl.title,
          description: tpl.description,
          type: tpl.type,
          status: "draft",
          questions: tpl.suggestedQuestions.map((q, idx) => ({
            question_key: q.label.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
            type: q.type,
            label: q.label,
            required: q.required,
            options: q.options?.map((opt, oIdx) => ({
              id: `opt_${oIdx + 1}`,
              label: opt,
              value: opt,
            })),
            position: idx + 1,
          })),
        }),
      });

      if (res.ok) {
        const form = await res.json();
        router.push(`/app/forms/${form.id}`);
      }
    } catch (err) {
      console.error("Template creation failed:", err);
      setIsInstantiating(null);
    }
  };

  const filtered = FORM_TEMPLATES.filter(
    (t) => selectedCat === "All" || t.category === selectedCat
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F8F7F4]">
      <AppHeader
        title="Templates"
        subtitle="Pre-built, validated form architectures ready to instantiate and customize."
      />

      <div className="p-8 space-y-8 max-w-7xl w-full mx-auto">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-4 py-2 uppercase tracking-wider transition-colors ${
                selectedCat === cat
                  ? "bg-[#090A0A] text-[#F4F2EC] font-bold"
                  : "border border-[#E5E3DB] bg-[#FAFAF7] text-[#5E605E] hover:text-[#090A0A]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((tpl) => (
            <div
              key={tpl.id}
              className="border border-[#E5E3DB] bg-[#FAFAF7] p-6 flex flex-col justify-between space-y-6 hover:border-[#090A0A] transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 bg-[#E8E5DD] text-[#222422]">
                    {tpl.category}
                  </span>
                  <span className="font-mono text-[11px] text-[#8A8A82]">
                    {tpl.suggestedQuestions.length} fields
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#090A0A] tracking-tight">{tpl.title}</h3>
                <p className="text-xs text-[#5E605E] leading-relaxed font-sans">{tpl.description}</p>

                {/* Question List Preview */}
                <div className="pt-2 border-t border-[#E5E3DB] space-y-1.5 font-mono text-[11px] text-[#5E605E]">
                  {tpl.suggestedQuestions.slice(0, 4).map((q, idx) => (
                    <div key={idx} className="flex items-center gap-2 truncate">
                      <span className="text-[#8A8A82]">•</span>
                      <span className="truncate">{q.label}</span>
                      <span className="text-[10px] text-[#8A8A82] uppercase ml-auto">
                        [{q.type}]
                      </span>
                    </div>
                  ))}
                  {tpl.suggestedQuestions.length > 4 && (
                    <div className="text-[10px] text-[#8A8A82] italic pt-1">
                      + {tpl.suggestedQuestions.length - 4} more fields
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleUseTemplate(tpl.id)}
                disabled={isInstantiating === tpl.id}
                className="w-full py-2.5 bg-[#090A0A] hover:bg-[#222422] text-[#F4F2EC] font-mono text-xs uppercase tracking-wider font-bold transition-colors flex items-center justify-center gap-2"
              >
                {isInstantiating === tpl.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#315CFF]" />
                    <span>Instantiating...</span>
                  </>
                ) : (
                  <>
                    <span>Use this template</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
