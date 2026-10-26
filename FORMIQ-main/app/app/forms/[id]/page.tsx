"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Save,
  Globe,
  Smartphone,
  Monitor,
  Share2,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Plus,
  Settings,
  Sliders,
  Eye,
  Check,
  QrCode,
  ExternalLink,
  ChevronDown,
  AlertCircle,
  Loader2,
  FileText,
  BarChart3,
  Inbox,
  Lightbulb,
  Calendar,
} from "lucide-react";
import AppHeader from "@/components/app/app-header";
import { Form, FormQuestion, QuestionType, FormLogic } from "@/types/formiq";
import QRCode from "qrcode";

interface NormalizedOption {
  id: string;
  label: string;
  value: string;
}

function getNormalizedOptions(options?: any[]): NormalizedOption[] {
  if (!options || !Array.isArray(options)) return [];
  return options.map((opt, idx) => {
    if (typeof opt === "string") {
      return { id: `opt-${idx}`, label: opt, value: opt };
    }
    if (opt && typeof opt === "object") {
      const val = opt.value !== undefined ? String(opt.value) : (opt.label || `Option ${idx + 1}`);
      const lbl = opt.label || opt.value || `Option ${idx + 1}`;
      return {
        id: opt.id || `opt-${idx}`,
        label: lbl,
        value: val,
      };
    }
    return { id: `opt-${idx}`, label: String(opt), value: String(opt) };
  });
}

function formatDateDisplay(dateString?: string) {
  if (!dateString) return null;
  try {
    const parts = dateString.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      }
    }
    return dateString;
  } catch {
    return dateString;
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FormBuilderPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [form, setForm] = useState<Form | null>(null);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [logic, setLogic] = useState<FormLogic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Active View Tab: 'builder' | 'logic' | 'preview' | 'settings'
  const [activeTab, setActiveTab] = useState<"builder" | "logic" | "preview" | "settings">("builder");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // AI Command Bar
  const [aiCommand, setAiCommand] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiProposal, setAiProposal] = useState<{
    summary: string;
    updatedQuestions: FormQuestion[];
    added: string[];
    removed: string[];
    modified: string[];
  } | null>(null);

  // Question editing modal/drawer state
  const [editingQuestion, setEditingQuestion] = useState<FormQuestion | null>(null);

  // Publishing / Share Modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Preview test response state
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
  const [previewSubmitted, setPreviewSubmitted] = useState(false);

  useEffect(() => {
    fetchForm();
  }, [id]);

  const fetchForm = async () => {
    try {
      const res = await fetch(`/api/forms/${id}`);
      if (res.ok) {
        const data: Form = await res.json();
        setForm(data);
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error("Failed to fetch form:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedQuestions?: FormQuestion[], updatedStatus?: Form["status"]) => {
    if (!form) return;
    setIsSaving(true);
    try {
      const payload: Partial<Form> = {
        title: form.title,
        description: form.description,
        type: form.type,
        status: updatedStatus || form.status,
        settings: form.settings,
        slug: form.slug,
        questions: (updatedQuestions || questions).map((q, idx) => ({ ...q, position: idx + 1 })),
      };

      const res = await fetch(`/api/forms/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const saved = await res.json();
        setForm(saved);
        if (saved.questions) setQuestions(saved.questions);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error("Failed to save changes:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddQuestion = () => {
    const newQ: FormQuestion = {
      id: `q-${Date.now()}`,
      form_id: id,
      question_key: `field_${questions.length + 1}`,
      type: "text",
      label: "New Question",
      description: "",
      required: false,
      position: questions.length + 1,
    };
    const updated = [...questions, newQ];
    setQuestions(updated);
    setEditingQuestion(newQ);
  };

  const handleDeleteQuestion = (qId: string) => {
    const updated = questions.filter((q) => q.id !== qId);
    setQuestions(updated);
    if (editingQuestion?.id === qId) setEditingQuestion(null);
  };

  const handleDuplicateQuestion = (q: FormQuestion) => {
    const duplicated: FormQuestion = {
      ...q,
      id: `q-${Date.now()}`,
      question_key: `${q.question_key}_copy`,
      label: `${q.label} (Copy)`,
      position: q.position + 1,
    };
    const idx = questions.findIndex((item) => item.id === q.id);
    const updated = [...questions];
    updated.splice(idx + 1, 0, duplicated);
    setQuestions(updated);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const updated = [...questions];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setQuestions(updated);
  };

  // AI Command Bar Handler
  const handleAiCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiCommand.trim()) return;

    setIsAiProcessing(true);
    try {
      const res = await fetch(`/api/forms/${id}/ai-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: aiCommand,
          currentQuestions: questions,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setAiProposal(result);
      }
    } catch (err) {
      console.error("AI edit error:", err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const applyAiProposal = () => {
    if (!aiProposal) return;
    setQuestions(aiProposal.updatedQuestions);
    handleSave(aiProposal.updatedQuestions);
    setAiProposal(null);
    setAiCommand("");
  };

  // Generate QR Code on opening share modal
  const openShareModal = async () => {
    if (!form) return;
    const url = `${window.location.origin}/f/${form.slug}`;
    try {
      const qr = await QRCode.toDataURL(url, { width: 300, margin: 2 });
      setQrDataUrl(qr);
    } catch (err) {
      console.error("QR Code generation error:", err);
    }
    setShowShareModal(true);
  };

  const copyPublicLink = () => {
    if (!form) return;
    const url = `${window.location.origin}/f/${form.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading || !form) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 font-mono text-xs text-[#8A8A82]">
        Loading form editor...
      </div>
    );
  }

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/f/${form.slug}` : `/f/${form.slug}`;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F8F7F4]">
      {/* Top Header */}
      <header className="px-8 py-4 border-b border-[#E5E3DB] bg-[#FAFAF7] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/app/forms"
            className="font-mono text-xs text-[#8A8A82] hover:text-[#090A0A] uppercase tracking-wider"
          >
            ← Forms
          </Link>
          <div className="h-4 w-[1px] bg-[#E5E3DB]" />
          <div>
            <h1 className="text-lg font-bold text-[#090A0A] tracking-tight">{form.title}</h1>
            <div className="flex items-center gap-3 font-mono text-[11px] text-[#5E605E]">
              <span>/f/{form.slug}</span>
              <span>•</span>
              <span className="uppercase text-[#315CFF] font-semibold">{form.type}</span>
              <span>•</span>
              <span className="capitalize">{form.status}</span>
            </div>
          </div>
        </div>

        {/* Form Level Navigation and Actions */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <Link
            href={`/app/forms/${form.id}/responses`}
            className="px-3 py-2 border border-[#E5E3DB] hover:bg-[#F2EFE9] text-[#090A0A] flex items-center gap-1.5"
          >
            <Inbox className="w-3.5 h-3.5 text-[#8A8A82]" />
            <span>Responses ({form.response_count || 0})</span>
          </Link>

          <Link
            href={`/app/forms/${form.id}/analytics`}
            className="px-3 py-2 border border-[#E5E3DB] hover:bg-[#F2EFE9] text-[#090A0A] flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#8A8A82]" />
            <span>Analytics</span>
          </Link>

          <Link
            href={`/app/forms/${form.id}/insights`}
            className="px-3 py-2 bg-[#E0F2FE] border border-[#BAE6FD] hover:bg-[#BAE6FD] text-[#0369A1] font-semibold flex items-center gap-1.5"
          >
            <Lightbulb className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>Intelligence</span>
          </Link>

          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="px-4 py-2 bg-[#090A0A] hover:bg-[#222422] text-[#F4F2EC] flex items-center gap-2 uppercase tracking-wider transition-colors"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{saveSuccess ? "Saved" : "Save"}</span>
          </button>

          <button
            onClick={openShareModal}
            className="px-4 py-2 bg-[#315CFF] hover:bg-[#2548CC] text-white flex items-center gap-1.5 uppercase tracking-wider transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Publish / Share</span>
          </button>
        </div>
      </header>

      {/* Editor Sub-Navigation Tabs */}
      <div className="px-8 border-b border-[#E5E3DB] bg-[#FAFAF7] flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-8">
          <button
            onClick={() => setActiveTab("builder")}
            className={`py-3 border-b-2 uppercase tracking-wider transition-colors ${
              activeTab === "builder"
                ? "border-[#315CFF] text-[#090A0A] font-bold"
                : "border-transparent text-[#8A8A82] hover:text-[#090A0A]"
            }`}
          >
            Build ({questions.length} Questions)
          </button>
          <button
            onClick={() => setActiveTab("logic")}
            className={`py-3 border-b-2 uppercase tracking-wider transition-colors ${
              activeTab === "logic"
                ? "border-[#315CFF] text-[#090A0A] font-bold"
                : "border-transparent text-[#8A8A82] hover:text-[#090A0A]"
            }`}
          >
            Conditional Logic
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`py-3 border-b-2 uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
              activeTab === "preview"
                ? "border-[#315CFF] text-[#090A0A] font-bold"
                : "border-transparent text-[#8A8A82] hover:text-[#090A0A]"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`py-3 border-b-2 uppercase tracking-wider transition-colors ${
              activeTab === "settings"
                ? "border-[#315CFF] text-[#090A0A] font-bold"
                : "border-transparent text-[#8A8A82] hover:text-[#090A0A]"
            }`}
          >
            Settings
          </button>
        </div>

        {activeTab === "preview" && (
          <div className="flex items-center gap-2 py-2">
            <button
              onClick={() => setPreviewDevice("desktop")}
              className={`p-1.5 border transition-colors ${
                previewDevice === "desktop"
                  ? "bg-[#090A0A] text-white border-[#090A0A]"
                  : "border-[#E5E3DB] text-[#5E605E]"
              }`}
              title="Desktop View"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPreviewDevice("mobile")}
              className={`p-1.5 border transition-colors ${
                previewDevice === "mobile"
                  ? "bg-[#090A0A] text-white border-[#090A0A]"
                  : "border-[#E5E3DB] text-[#5E605E]"
              }`}
              title="Mobile View"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 p-8 max-w-7xl w-full mx-auto">
        {/* TAB 1: BUILDER */}
        {activeTab === "builder" && (
          <div className="space-y-8">
            {/* Form Title & Description Card */}
            <div className="border border-[#E5E3DB] bg-[#FAFAF7] p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E5E3DB] pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#315CFF]" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#090A0A]">
                    Form Title & Editorial Description
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-[#8A8A82]">Type:</span>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                    className="p-1 border border-[#E5E3DB] bg-white text-[#090A0A] uppercase font-semibold text-[10px]"
                  >
                    <option value="recruitment">Recruitment</option>
                    <option value="registration">Registration</option>
                    <option value="feedback">Feedback</option>
                    <option value="survey">Survey</option>
                    <option value="research">Research</option>
                    <option value="application">Application</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 font-sans">
                <div>
                  <label className="block font-mono text-[11px] font-bold text-[#090A0A] uppercase tracking-wider mb-1.5">
                    Form Title
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Enter form title..."
                    className="w-full px-3.5 py-2.5 border border-[#E5E3DB] bg-white text-base font-bold text-[#090A0A] focus:outline-none focus:border-[#315CFF]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] font-bold text-[#090A0A] uppercase tracking-wider mb-1.5">
                    Description & Instructions (Displayed to respondents)
                  </label>
                  <textarea
                    rows={2}
                    value={form.description || ""}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Provide context, instructions, or deadlines for your respondents..."
                    className="w-full px-3.5 py-2.5 border border-[#E5E3DB] bg-white text-xs text-[#090A0A] focus:outline-none focus:border-[#315CFF] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* AI Command Input ("Ask FormIQ to change something...") */}
            <div className="border border-[#E5E3DB] bg-[#FAFAF7] p-5 space-y-4">
              <div className="flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2 text-[#090A0A]">
                  <Sparkles className="w-3.5 h-3.5 text-[#315CFF]" />
                  <span className="font-bold uppercase tracking-wider">AI Form Assistant</span>
                </div>
                <span className="text-[#8A8A82]">
                  Structured modification engine
                </span>
              </div>

              <form onSubmit={handleAiCommandSubmit} className="flex gap-2 font-sans">
                <input
                  type="text"
                  value={aiCommand}
                  onChange={(e) => setAiCommand(e.target.value)}
                  placeholder="Ask FormIQ to change something... (e.g. 'Make this form shorter', 'Add a leadership question', 'Add resume upload')"
                  className="flex-1 px-4 py-2.5 border border-[#E5E3DB] bg-[#F8F7F4] text-xs text-[#090A0A] focus:outline-none focus:border-[#315CFF]"
                />
                <button
                  type="submit"
                  disabled={isAiProcessing || !aiCommand.trim()}
                  className="px-5 py-2.5 bg-[#090A0A] hover:bg-[#222422] disabled:opacity-50 text-[#F4F2EC] font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
                >
                  {isAiProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Propose Changes</span>
                  )}
                </button>
              </form>

              {/* AI Proposal Diff Modal / Banner */}
              {aiProposal && (
                <div className="p-4 bg-[#F4F2EC] border border-[#315CFF] space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#090A0A] uppercase tracking-wider">
                      Proposed Modification:
                    </span>
                    <span className="text-[#315CFF] text-[11px]">REQUIRES CONFIRMATION</span>
                  </div>
                  <p className="text-[#222422] font-sans text-xs">{aiProposal.summary}</p>

                  {aiProposal.added.length > 0 && (
                    <div className="text-emerald-700 text-[11px]">
                      + ADDED: {aiProposal.added.join(", ")}
                    </div>
                  )}
                  {aiProposal.removed.length > 0 && (
                    <div className="text-red-700 text-[11px]">
                      - REMOVED: {aiProposal.removed.join(", ")}
                    </div>
                  )}
                  {aiProposal.modified.length > 0 && (
                    <div className="text-amber-700 text-[11px]">
                      ~ MODIFIED: {aiProposal.modified.join(", ")}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={applyAiProposal}
                      className="px-4 py-1.5 bg-[#315CFF] text-white uppercase text-[11px] font-bold hover:bg-[#2548CC] transition-colors"
                    >
                      Apply Changes & Save
                    </button>
                    <button
                      onClick={() => setAiProposal(null)}
                      className="px-4 py-1.5 border border-[#E5E3DB] bg-[#FAFAF7] text-[#5E605E] uppercase text-[11px] hover:text-[#090A0A]"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-[#5E605E] uppercase tracking-wider">
                  Fields in this form ({questions.length})
                </span>
                <button
                  onClick={handleAddQuestion}
                  className="px-3 py-1.5 border border-[#090A0A] bg-[#090A0A] text-[#F4F2EC] hover:bg-[#222422] flex items-center gap-1.5 uppercase tracking-wider text-[11px] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Question
                </button>
              </div>

              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="border border-[#E5E3DB] bg-[#FAFAF7] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#B8B8B0] transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <span className="font-mono text-xs text-[#8A8A82] w-6 shrink-0">
                        {(idx + 1).toString().padStart(2, "0")}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-[#090A0A]">{q.label}</h4>
                          {q.required && (
                            <span className="font-mono text-[10px] text-[#315CFF] uppercase font-semibold">
                              *Required
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 font-mono text-[11px] text-[#5E605E] mt-0.5">
                          <span className="uppercase px-1.5 py-0.2 bg-[#E8E5DD] text-[#222422]">
                            {q.type}
                          </span>
                          <span>key: {q.question_key}</span>
                          {q.options && q.options.length > 0 && (
                            <span>{q.options.length} options</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <button
                        onClick={() => handleMove(idx, "up")}
                        disabled={idx === 0}
                        className="p-1.5 border border-[#E5E3DB] text-[#5E605E] hover:text-[#090A0A] disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(idx, "down")}
                        disabled={idx === questions.length - 1}
                        className="p-1.5 border border-[#E5E3DB] text-[#5E605E] hover:text-[#090A0A] disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDuplicateQuestion(q)}
                        className="p-1.5 border border-[#E5E3DB] text-[#5E605E] hover:text-[#090A0A]"
                        title="Duplicate Question"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingQuestion(q)}
                        className="px-3 py-1.5 border border-[#E5E3DB] text-[#090A0A] hover:border-[#090A0A] uppercase tracking-wider text-[11px]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 border border-[#E5E3DB] text-[#8A8A82] hover:text-red-600 hover:border-red-200"
                        title="Delete Question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONDITIONAL LOGIC */}
        {activeTab === "logic" && (
          <div className="border border-[#E5E3DB] bg-[#FAFAF7] p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5E3DB] pb-4">
              <div>
                <h3 className="font-bold text-base text-[#090A0A]">Conditional Branching Rules</h3>
                <p className="text-xs text-[#5E605E] mt-1 font-sans">
                  Show, hide, or require questions dynamically based on respondent choices.
                </p>
              </div>
              <button
                onClick={() => {
                  const newRule: FormLogic = {
                    id: `log-${Date.now()}`,
                    form_id: id,
                    source_question_id: questions[0]?.id || "",
                    operator: "equals",
                    value: "",
                    target_question_id: questions[1]?.id || "",
                    action: "show",
                  };
                  setLogic([...logic, newRule]);
                }}
                className="px-3 py-1.5 bg-[#090A0A] text-[#F4F2EC] font-mono text-xs uppercase tracking-wider flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Rule
              </button>
            </div>

            {logic.length === 0 ? (
              <div className="p-12 text-center font-mono text-xs text-[#8A8A82] space-y-2">
                <div>No conditional logic rules defined.</div>
                <p className="text-[#5E605E]">All questions currently render sequentially for all respondents.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {logic.map((rule, idx) => (
                  <div
                    key={rule.id}
                    className="p-4 border border-[#E5E3DB] bg-[#F8F7F4] flex flex-wrap items-center gap-3 font-mono text-xs"
                  >
                    <span className="text-[#315CFF] font-bold">IF</span>
                    <select
                      value={rule.source_question_id}
                      onChange={(e) => {
                        const copy = [...logic];
                        copy[idx].source_question_id = e.target.value;
                        setLogic(copy);
                      }}
                      className="p-2 border border-[#E5E3DB] bg-white text-[#090A0A]"
                    >
                      {questions.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={rule.operator}
                      onChange={(e) => {
                        const copy = [...logic];
                        copy[idx].operator = e.target.value as any;
                        setLogic(copy);
                      }}
                      className="p-2 border border-[#E5E3DB] bg-white text-[#090A0A]"
                    >
                      <option value="equals">equals</option>
                      <option value="not_equals">does not equal</option>
                      <option value="contains">contains</option>
                      <option value="is_empty">is empty</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Target value..."
                      value={rule.value || ""}
                      onChange={(e) => {
                        const copy = [...logic];
                        copy[idx].value = e.target.value;
                        setLogic(copy);
                      }}
                      className="p-2 border border-[#E5E3DB] bg-white text-[#090A0A] w-36"
                    />

                    <span className="text-[#315CFF] font-bold">THEN</span>

                    <select
                      value={rule.action}
                      onChange={(e) => {
                        const copy = [...logic];
                        copy[idx].action = e.target.value as any;
                        setLogic(copy);
                      }}
                      className="p-2 border border-[#E5E3DB] bg-white text-[#090A0A]"
                    >
                      <option value="show">SHOW</option>
                      <option value="hide">HIDE</option>
                      <option value="require">REQUIRE</option>
                    </select>

                    <select
                      value={rule.target_question_id}
                      onChange={(e) => {
                        const copy = [...logic];
                        copy[idx].target_question_id = e.target.value;
                        setLogic(copy);
                      }}
                      className="p-2 border border-[#E5E3DB] bg-white text-[#090A0A]"
                    >
                      {questions.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.label}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => setLogic(logic.filter((_, i) => i !== idx))}
                      className="text-red-600 hover:text-red-800 ml-auto"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RESPONDENT-FACING PREVIEW */}
        {activeTab === "preview" && (
          <div className="flex justify-center">
            <div
              className={`transition-all duration-300 ${
                previewDevice === "mobile"
                  ? "w-[390px] border-[12px] border-[#222422] rounded-[32px] overflow-hidden shadow-2xl bg-white"
                  : "w-full max-w-3xl border border-[#E5E3DB] bg-white p-8 md:p-12 shadow-sm"
              }`}
            >
              {previewDevice === "mobile" && (
                <div className="bg-[#222422] text-white px-6 py-2 flex justify-between items-center text-[10px] font-mono">
                  <span>9:41</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-white/40" />
                </div>
              )}

              <div className={`${previewDevice === "mobile" ? "p-6" : ""}`}>
                {previewSubmitted ? (
                  <div className="text-center py-12 space-y-4 font-sans">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <Check className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-[#090A0A]">
                      {form.settings.customThankYouTitle || "Submission Confirmed"}
                    </h3>
                    <p className="text-sm text-[#5E605E] max-w-md mx-auto">
                      {form.settings.customThankYouMessage || "Your response has been saved successfully."}
                    </p>
                    <button
                      onClick={() => {
                        setPreviewAnswers({});
                        setPreviewSubmitted(false);
                      }}
                      className="mt-4 px-4 py-2 border border-[#E5E3DB] text-xs font-mono uppercase tracking-wider"
                    >
                      Submit Another Test Response
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8 font-sans">
                    <div className="border-b border-[#E5E3DB] pb-6 space-y-2">
                      <h2 className="text-2xl font-bold tracking-tight text-[#090A0A]">{form.title}</h2>
                      {form.description && (
                        <p className="text-xs text-[#5E605E] leading-relaxed">{form.description}</p>
                      )}
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setPreviewSubmitted(true);
                      }}
                      className="space-y-6"
                    >
                      {questions.map((q, idx) => (
                        <div key={q.id} className="space-y-2">
                          <label className="block text-xs font-bold text-[#090A0A]">
                            {idx + 1}. {q.label}
                            {q.required && <span className="text-[#315CFF] ml-1">*</span>}
                          </label>
                          {q.description && (
                            <p className="text-[11px] text-[#8A8A82]">{q.description}</p>
                          )}

                          {q.type === "text" || q.type === "email" || q.type === "phone" ? (
                            <input
                              type={q.type}
                              required={q.required}
                              value={previewAnswers[q.id] || ""}
                              onChange={(e) =>
                                setPreviewAnswers({ ...previewAnswers, [q.id]: e.target.value })
                              }
                              placeholder={`Enter ${q.label.toLowerCase()}...`}
                              className="w-full px-3 py-2 border border-[#E5E3DB] text-xs text-[#090A0A] focus:outline-none focus:border-[#315CFF]"
                            />
                          ) : q.type === "number" ? (
                            <input
                              type="number"
                              required={q.required}
                              value={previewAnswers[q.id] || ""}
                              onChange={(e) =>
                                setPreviewAnswers({ ...previewAnswers, [q.id]: e.target.value })
                              }
                              placeholder="Enter number..."
                              className="w-full px-3 py-2 border border-[#E5E3DB] text-xs text-[#090A0A] focus:outline-none focus:border-[#315CFF]"
                            />
                          ) : q.type === "textarea" ? (
                            <textarea
                              rows={3}
                              required={q.required}
                              value={previewAnswers[q.id] || ""}
                              onChange={(e) =>
                                setPreviewAnswers({ ...previewAnswers, [q.id]: e.target.value })
                              }
                              placeholder={`Enter your response...`}
                              className="w-full p-3 border border-[#E5E3DB] text-xs text-[#090A0A] focus:outline-none focus:border-[#315CFF] resize-none"
                            />
                          ) : q.type === "select" ? (
                            <div className="relative">
                              <select
                                required={q.required}
                                value={previewAnswers[q.id] || ""}
                                onChange={(e) =>
                                  setPreviewAnswers({ ...previewAnswers, [q.id]: e.target.value })
                                }
                                className="w-full px-3 py-2 pr-8 border border-[#E5E3DB] text-xs text-[#090A0A] focus:outline-none focus:border-[#315CFF] bg-white appearance-none cursor-pointer"
                              >
                                <option value="">Select an option...</option>
                                {getNormalizedOptions(q.options).map((opt) => (
                                  <option key={opt.id} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#5E605E]">
                                <ChevronDown className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          ) : q.type === "radio" ? (
                            <div className="space-y-1.5 pt-1">
                              {getNormalizedOptions(q.options).map((opt) => (
                                <label
                                  key={opt.id}
                                  className="flex items-center gap-2.5 text-xs text-[#222422] cursor-pointer p-1.5 border border-transparent hover:border-[#E5E3DB]"
                                >
                                  <input
                                    type="radio"
                                    name={q.id}
                                    value={opt.value}
                                    checked={previewAnswers[q.id] === opt.value}
                                    onChange={(e) =>
                                      setPreviewAnswers({ ...previewAnswers, [q.id]: e.target.value })
                                    }
                                    className="accent-[#315CFF]"
                                  />
                                  <span>{opt.label}</span>
                                </label>
                              ))}
                            </div>
                          ) : q.type === "multiselect" || q.type === "checkbox" ? (
                            <div className="space-y-1.5 pt-1">
                              {getNormalizedOptions(q.options).map((opt) => {
                                const list = Array.isArray(previewAnswers[q.id]) ? previewAnswers[q.id] : [];
                                const isChecked = list.includes(opt.value);
                                return (
                                  <label
                                    key={opt.id}
                                    className="flex items-center gap-2.5 text-xs text-[#222422] cursor-pointer p-1.5 border border-transparent hover:border-[#E5E3DB]"
                                  >
                                    <input
                                      type="checkbox"
                                      value={opt.value}
                                      checked={isChecked}
                                      onChange={() => {
                                        const updated = isChecked
                                          ? list.filter((v: string) => v !== opt.value)
                                          : [...list, opt.value];
                                        setPreviewAnswers({ ...previewAnswers, [q.id]: updated });
                                      }}
                                      className="accent-[#315CFF]"
                                    />
                                    <span>{opt.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : q.type === "date" ? (
                            <div className="space-y-1.5">
                              <div className="relative flex items-center">
                                <input
                                  type="date"
                                  required={q.required}
                                  value={previewAnswers[q.id] || ""}
                                  onChange={(e) =>
                                    setPreviewAnswers({ ...previewAnswers, [q.id]: e.target.value })
                                  }
                                  className="w-full px-3 py-2 pr-10 border border-[#E5E3DB] text-xs text-[#090A0A] focus:outline-none focus:border-[#315CFF] font-mono cursor-pointer"
                                />
                                <div className="absolute right-0 inset-y-0 px-2.5 flex items-center justify-center text-[#315CFF] pointer-events-none">
                                  <Calendar className="w-3.5 h-3.5" />
                                </div>
                              </div>
                              {previewAnswers[q.id] && (
                                <div className="font-mono text-[10px] text-[#315CFF]">
                                  Selected: <strong>{formatDateDisplay(previewAnswers[q.id])}</strong>
                                </div>
                              )}
                            </div>
                          ) : q.type === "time" ? (
                            <input
                              type="time"
                              required={q.required}
                              value={previewAnswers[q.id] || ""}
                              onChange={(e) =>
                                setPreviewAnswers({ ...previewAnswers, [q.id]: e.target.value })
                              }
                              className="w-full px-3 py-2 border border-[#E5E3DB] text-xs text-[#090A0A] focus:outline-none focus:border-[#315CFF] font-mono"
                            />
                          ) : q.type === "rating" ? (
                            <div className="flex items-center gap-2 pt-1">
                              {[1, 2, 3, 4, 5].map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setPreviewAnswers({ ...previewAnswers, [q.id]: val })}
                                  className={`w-9 h-9 border font-mono text-xs font-bold transition-colors ${
                                    previewAnswers[q.id] === val
                                      ? "bg-[#090A0A] text-white border-[#090A0A]"
                                      : "border-[#E5E3DB] bg-[#FAFAF7] text-[#090A0A] hover:border-[#090A0A]"
                                  }`}
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                          ) : q.type === "file" ? (
                            <div className="border border-dashed border-[#B8B8B0] p-4 text-center space-y-1 bg-[#FAFAF7]">
                              <span className="font-mono text-[11px] text-[#5E605E]">
                                Drag & drop file or browse (PDF, Max 10MB)
                              </span>
                              <input
                                type="file"
                                className="block w-full text-xs text-[#8A8A82] file:mr-4 file:py-1 file:px-3 file:border file:border-[#E5E3DB] file:text-xs file:font-mono file:bg-white"
                              />
                            </div>
                          ) : null}
                        </div>
                      ))}

                      <div className="pt-4 border-t border-[#E5E3DB]">
                        <button
                          type="submit"
                          className="w-full py-3 bg-[#090A0A] hover:bg-[#222422] text-[#F4F2EC] font-mono text-xs uppercase tracking-wider font-bold"
                        >
                          Submit Test Response
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === "settings" && (
          <div className="border border-[#E5E3DB] bg-[#FAFAF7] p-8 space-y-6 max-w-4xl">
            <h3 className="font-bold text-base text-[#090A0A]">Form Configuration & Settings</h3>

            <div className="space-y-4 font-sans text-xs">
              <div>
                <label className="block font-bold text-[#090A0A] mb-1">Form Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full p-2.5 border border-[#E5E3DB] bg-white text-[#090A0A]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#090A0A] mb-1">Public URL Slug</label>
                <div className="flex items-center border border-[#E5E3DB] bg-[#F2EFE9] px-3 py-2 text-[#5E605E] font-mono">
                  <span>/f/</span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    className="flex-1 bg-transparent text-[#090A0A] focus:outline-none ml-1"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#090A0A] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-2.5 border border-[#E5E3DB] bg-white text-[#090A0A]"
                />
              </div>

              <div className="pt-4 border-t border-[#E5E3DB] space-y-3 font-mono">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.settings.emailCollection}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        settings: { ...form.settings, emailCollection: e.target.checked },
                      })
                    }
                    className="accent-[#315CFF]"
                  />
                  <span>Collect verified email address with every submission</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.settings.anonymous}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        settings: { ...form.settings, anonymous: e.target.checked },
                      })
                    }
                    className="accent-[#315CFF]"
                  />
                  <span>Anonymous submissions allowed</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.settings.notificationOnResponse}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        settings: { ...form.settings, notificationOnResponse: e.target.checked },
                      })
                    }
                    className="accent-[#315CFF]"
                  />
                  <span>Dispatch realtime in-app notifications on each response</span>
                </label>
              </div>

              <div className="pt-4 border-t border-[#E5E3DB]">
                <button
                  onClick={() => handleSave()}
                  className="px-6 py-2.5 bg-[#090A0A] text-[#F4F2EC] font-mono text-xs uppercase tracking-wider font-bold"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QUESTION EDITING MODAL */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[#FAFAF7] border border-[#E5E3DB] max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E3DB] pb-3">
              <h3 className="font-bold text-sm text-[#090A0A]">Edit Question</h3>
              <button
                onClick={() => setEditingQuestion(null)}
                className="font-mono text-xs text-[#8A8A82] hover:text-[#090A0A]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div>
                <label className="block font-bold text-[#090A0A] mb-1">Question Label</label>
                <input
                  type="text"
                  value={editingQuestion.label}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, label: e.target.value })
                  }
                  className="w-full p-2 border border-[#E5E3DB] bg-white text-[#090A0A]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#090A0A] mb-1">Field Type</label>
                <select
                  value={editingQuestion.type}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      type: e.target.value as QuestionType,
                      options:
                        ["select", "radio", "multiselect"].includes(e.target.value) &&
                        (!editingQuestion.options || editingQuestion.options.length === 0)
                          ? [
                              { id: "opt1", label: "Option 1", value: "Option 1" },
                              { id: "opt2", label: "Option 2", value: "Option 2" },
                            ]
                          : editingQuestion.options,
                    })
                  }
                  className="w-full p-2 border border-[#E5E3DB] bg-white text-[#090A0A]"
                >
                  <option value="text">Text (Single Line)</option>
                  <option value="number">Number</option>
                  <option value="textarea">Textarea (Multi-line)</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="select">Dropdown Select</option>
                  <option value="radio">Radio Buttons</option>
                  <option value="multiselect">Multiple Select (Checkboxes)</option>
                  <option value="rating">Rating (1 to 5)</option>
                  <option value="date">Date / Date of Birth (Calendar Picker)</option>
                  <option value="time">Time</option>
                  <option value="file">File Upload (PDF/Resume)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#090A0A] mb-1">Description / Subtitle</label>
                <input
                  type="text"
                  value={editingQuestion.description || ""}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, description: e.target.value })
                  }
                  className="w-full p-2 border border-[#E5E3DB] bg-white text-[#090A0A]"
                />
              </div>

              {/* Options Editor if Select/Radio */}
              {["select", "radio", "multiselect"].includes(editingQuestion.type) && (
                <div className="space-y-2 border-t border-[#E5E3DB] pt-3">
                  <label className="block font-bold text-[#090A0A]">Options</label>
                  {editingQuestion.options?.map((opt, optIdx) => (
                    <div key={opt.id} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={opt.label}
                        onChange={(e) => {
                          const updatedOpts = [...(editingQuestion.options || [])];
                          updatedOpts[optIdx] = {
                            ...opt,
                            label: e.target.value,
                            value: e.target.value,
                          };
                          setEditingQuestion({ ...editingQuestion, options: updatedOpts });
                        }}
                        className="flex-1 p-1.5 border border-[#E5E3DB] bg-white text-xs"
                      />
                      <button
                        onClick={() => {
                          const updatedOpts = editingQuestion.options?.filter((_, i) => i !== optIdx);
                          setEditingQuestion({ ...editingQuestion, options: updatedOpts });
                        }}
                        className="text-red-500 hover:text-red-700 font-mono text-xs px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newOpt = {
                        id: `opt-${Date.now()}`,
                        label: `Option ${(editingQuestion.options?.length || 0) + 1}`,
                        value: `Option ${(editingQuestion.options?.length || 0) + 1}`,
                      };
                      setEditingQuestion({
                        ...editingQuestion,
                        options: [...(editingQuestion.options || []), newOpt],
                      });
                    }}
                    className="font-mono text-[11px] text-[#315CFF] uppercase tracking-wider"
                  >
                    + Add Option
                  </button>
                </div>
              )}

              <div className="pt-2">
                <label className="flex items-center gap-2 font-mono text-xs text-[#090A0A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingQuestion.required}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, required: e.target.checked })
                    }
                    className="accent-[#315CFF]"
                  />
                  <span>Mark as Required field</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E3DB] font-mono text-xs">
              <button
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 border border-[#E5E3DB] text-[#5E605E]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const updated = questions.map((q) =>
                    q.id === editingQuestion.id ? editingQuestion : q
                  );
                  setQuestions(updated);
                  setEditingQuestion(null);
                }}
                className="px-4 py-2 bg-[#090A0A] text-white uppercase tracking-wider font-bold"
              >
                Save Field
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE / PUBLISH MODAL WITH QR CODE */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FAFAF7] border border-[#E5E3DB] max-w-lg w-full p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E3DB] pb-4">
              <div>
                <h3 className="font-bold text-base text-[#090A0A]">Publish & Share Form</h3>
                <p className="text-xs text-[#5E605E] mt-0.5 font-mono">
                  PUBLIC LINK • QR CODE • STATUS CONTROLS
                </p>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="font-mono text-xs text-[#8A8A82] hover:text-[#090A0A]"
              >
                ✕
              </button>
            </div>

            {/* Status Switcher */}
            <div className="space-y-2 font-mono text-xs">
              <label className="block text-[#5E605E] uppercase tracking-wider">Form Status:</label>
              <div className="grid grid-cols-3 gap-2">
                {(["published", "paused", "closed"] as Form["status"][]).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setForm({ ...form, status: st });
                      handleSave(questions, st);
                    }}
                    className={`py-2 text-center uppercase tracking-wider transition-colors ${
                      form.status === st
                        ? "bg-[#090A0A] text-[#F4F2EC] font-bold"
                        : "border border-[#E5E3DB] text-[#5E605E] hover:text-[#090A0A]"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Public Link Copy */}
            <div className="space-y-2">
              <label className="block font-mono text-xs text-[#5E605E] uppercase tracking-wider">
                Public Shareable URL:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  className="flex-1 p-2.5 border border-[#E5E3DB] bg-[#F8F7F4] font-mono text-xs text-[#090A0A]"
                />
                <button
                  onClick={copyPublicLink}
                  className="px-4 py-2.5 bg-[#090A0A] text-white font-mono text-xs uppercase tracking-wider hover:bg-[#222422] transition-colors shrink-0"
                >
                  {copiedLink ? "Copied!" : "Copy"}
                </button>
                <Link
                  href={`/f/${form.slug}`}
                  target="_blank"
                  className="p-2.5 border border-[#E5E3DB] text-[#090A0A] hover:bg-[#F2EFE9] transition-colors shrink-0"
                  title="Open Form in New Tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* QR Code Display */}
            {qrDataUrl && (
              <div className="border border-[#E5E3DB] p-4 bg-white flex flex-col items-center space-y-3">
                <img src={qrDataUrl} alt="Form QR Code" className="w-48 h-48" />
                <a
                  href={qrDataUrl}
                  download={`${form.slug}-qr-code.png`}
                  className="font-mono text-xs text-[#315CFF] hover:underline uppercase tracking-wider"
                >
                  Download QR Code (PNG)
                </a>
              </div>
            )}

            <div className="pt-4 border-t border-[#E5E3DB] flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-6 py-2 bg-[#090A0A] text-[#F4F2EC] font-mono text-xs uppercase tracking-wider font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
