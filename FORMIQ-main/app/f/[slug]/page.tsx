"use client";

import React, { useEffect, useState, use, useRef } from "react";
import {
  Check,
  AlertCircle,
  Loader2,
  ArrowRight,
  UploadCloud,
  Calendar,
  ChevronDown,
  Clock,
  Sparkles,
  FileCheck,
  X,
  FileText,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Form, FormQuestion } from "@/types/formiq";
import Logo from "@/components/ui/logo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

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

export default function PublicFormPage({ params }: PageProps) {
  const { slug } = use(params);

  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Respondent answers: question_id -> value
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [respondentEmail, setRespondentEmail] = useState("");
  const [startTime, setStartTime] = useState<number>(Date.now());

  // Validation highlights
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // File dropzone states: questionId -> boolean/filename
  const [isDragOver, setIsDragOver] = useState<Record<string, boolean>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [thankYouInfo, setThankYouInfo] = useState<{ title: string; message: string; responseId?: string }>({
    title: "Response Recorded",
    message: "Thank you for completing this form. Your submission has been saved.",
  });

  const formTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPublicForm();
  }, [slug]);

  const fetchPublicForm = async () => {
    try {
      const res = await fetch(`/api/f/${slug}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("This form does not exist or has been removed.");
        } else if (res.status === 403) {
          const errData = await res.json();
          setError(errData.error || "This form is currently closed and not accepting responses.");
        } else {
          setError("Failed to load form.");
        }
        return;
      }

      const data: Form = await res.json();
      setForm(data);
      setStartTime(Date.now());
    } catch (err) {
      console.error("Public form fetch error:", err);
      setError("An error occurred while loading this form.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (questionId: string, file: File) => {
    if (!form) return;
    setUploadingFiles((prev) => ({ ...prev, [questionId]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("formId", form.id);
      fd.append("questionId", questionId);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        alert(err.error || "File upload failed. Please try a smaller PDF or image file.");
        return;
      }

      const uploadData = await uploadRes.json();
      setAnswers((prev) => ({
        ...prev,
        [questionId]: uploadData.storagePath,
      }));
      setFileNames((prev) => ({
        ...prev,
        [questionId]: file.name,
      }));
      // Clear error for this field
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[questionId];
        return copy;
      });
    } catch (uploadErr) {
      console.error("Upload error:", uploadErr);
      alert("File upload failed. Please check your connection and try again.");
    } finally {
      setUploadingFiles((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const handleCheckboxToggle = (questionId: string, optionValue: string) => {
    const currentList: string[] = Array.isArray(answers[questionId]) ? answers[questionId] : [];
    let updatedList: string[];
    if (currentList.includes(optionValue)) {
      updatedList = currentList.filter((v) => v !== optionValue);
    } else {
      updatedList = [...currentList, optionValue];
    }
    setAnswers({ ...answers, [questionId]: updatedList });
    if (fieldErrors[questionId]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[questionId];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    // Validate required questions before submitting
    const newFieldErrors: Record<string, string> = {};
    const questions = form.questions || [];

    for (const q of questions) {
      if (q.required) {
        const val = answers[q.id];
        if (
          val === undefined ||
          val === null ||
          val === "" ||
          (Array.isArray(val) && val.length === 0)
        ) {
          newFieldErrors[q.id] = `Please complete this required question`;
        }
      }
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      // Scroll to the first missing field
      const firstMissingId = Object.keys(newFieldErrors)[0];
      const el = document.getElementById(`question-card-${firstMissingId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    const completionDuration = Math.max(15, Math.round((Date.now() - startTime) / 1000));

    try {
      const res = await fetch(`/api/f/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          email: respondentEmail,
          completionTimeSeconds: completionDuration,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to submit response.");
      }

      setThankYouInfo({
        title: result.title || "Response Confirmed",
        message: result.message || "Your response has been saved successfully.",
        responseId: result.responseId,
      });

      setSubmitted(true);

      // Trigger celebratory confetti
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#315CFF", "#090A0A", "#10B981", "#E5E3DB"],
      });
    } catch (err: any) {
      setError(err.message || "Submission failed. Please check your answers and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F2EC] flex flex-col items-center justify-center p-6 font-mono text-xs text-[#5E605E]">
        <Loader2 className="w-6 h-6 animate-spin text-[#315CFF] mb-3" />
        <span>Loading FormIQ Form...</span>
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="min-h-screen bg-[#F4F2EC] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white border border-[#E5E3DB] p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#090A0A]">Form Unavailable</h2>
          <p className="text-xs text-[#5E605E] leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  if (!form) return null;

  const questions = form.questions || [];

  // Calculate progress
  const answeredCount = Object.keys(answers).filter((k) => {
    const val = answers[k];
    if (val === undefined || val === null || val === "") return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  }).length;

  const progressPct = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const todayDateStr = new Date().toISOString().slice(0, 10);

  return (
    <div
      ref={formTopRef}
      className="min-h-screen bg-[#F4F2EC] text-[#090A0A] flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 font-sans"
    >
      {/* Top Brand Header */}
      <div className="w-full max-w-2xl mx-auto flex items-center justify-between pb-6">
        <Logo size="sm" theme="light" href="/" />
        <span className="font-mono text-[10px] text-[#8A8A82] uppercase tracking-widest border border-[#E5E3DB] px-2 py-0.5 bg-[#FAFAF7]">
          VERIFIED FORM
        </span>
      </div>

      <div className="w-full max-w-2xl mx-auto my-auto">
        {submitted ? (
          /* THANK YOU CONFIRMATION SCREEN */
          <div className="bg-white border border-[#E5E3DB] p-8 md:p-14 text-center space-y-6 shadow-sm">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto rounded-full">
              <Check className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E0F2FE] text-[#0369A1] font-mono text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-[#0284C7]" />
                <span>FORMIQ VERIFIED SUBMISSION</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#090A0A]">
                {thankYouInfo.title}
              </h2>
              <p className="text-sm text-[#5E605E] max-w-md mx-auto leading-relaxed">
                {thankYouInfo.message}
              </p>
            </div>

            {thankYouInfo.responseId && (
              <div className="p-3 bg-[#FAFAF7] border border-[#E5E3DB] font-mono text-xs text-[#5E605E] max-w-xs mx-auto">
                <span className="text-[#8A8A82] block text-[10px] uppercase">Submission ID</span>
                <span className="text-[#090A0A] font-bold">{thankYouInfo.responseId}</span>
              </div>
            )}

            <div className="pt-6 border-t border-[#E5E3DB] font-mono text-[11px] text-[#8A8A82]">
              Submitted on {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>
        ) : (
          /* ACTIVE FORM INTAKE */
          <div className="bg-white border border-[#E5E3DB] shadow-sm overflow-hidden">
            {/* Top Interactive Progress Bar */}
            <div className="w-full bg-[#E5E3DB] h-1.5 relative">
              <div
                className="h-full bg-[#315CFF] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="p-6 sm:p-10 md:p-12 space-y-8">
              {/* Form Title & Description Header Card */}
              <div className="border-b border-[#E5E3DB] pb-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-[#8A8A82] uppercase tracking-wider">
                  <span className="px-2 py-0.5 bg-[#E8E5DD] text-[#090A0A] font-semibold">
                    {form.type || "GENERAL"} INTAKE
                  </span>
                  <span className="text-[#315CFF] font-bold">
                    {answeredCount} OF {questions.length} ANSWERED ({progressPct}%)
                  </span>
                </div>

                {/* Form Title */}
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[#090A0A] leading-tight">
                  {form.title}
                </h1>

                {/* Form Description */}
                {form.description ? (
                  <div className="p-4 bg-[#FAFAF7] border-l-2 border-[#315CFF] border-t border-r border-b border-[#E5E3DB] text-xs sm:text-sm text-[#4A4C4A] leading-relaxed">
                    {form.description}
                  </div>
                ) : (
                  <p className="text-xs text-[#8A8A82] italic">
                    Please provide accurate information for all questions below.
                  </p>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Questions Form */}
              <form onSubmit={handleSubmit} className="space-y-8">
                {questions.map((q, idx) => {
                  const hasError = !!fieldErrors[q.id];
                  const isBirthOrDob =
                    q.question_key?.toLowerCase().includes("birth") ||
                    q.question_key?.toLowerCase().includes("dob") ||
                    q.label?.toLowerCase().includes("birth") ||
                    q.label?.toLowerCase().includes("dob");

                  return (
                    <div
                      key={q.id}
                      id={`question-card-${q.id}`}
                      className={`p-4 md:p-5 border transition-all ${
                        hasError
                          ? "border-red-300 bg-red-50/20"
                          : "border-[#E5E3DB] bg-white hover:border-[#B8B8B0]"
                      } space-y-3`}
                    >
                      {/* Question Label */}
                      <label
                        htmlFor={`input-${q.id}`}
                        className="block text-sm md:text-base font-bold text-[#090A0A]"
                      >
                        <span>
                          {idx + 1}. {q.label}
                        </span>
                        {q.required && (
                          <span className="text-[#315CFF] ml-1.5 font-bold" title="Required Field">
                            *
                          </span>
                        )}
                      </label>

                      {/* Question Description / Helper */}
                      {q.description && (
                        <p className="text-xs text-[#6B6E6B] leading-relaxed -mt-1 font-normal">
                          {q.description}
                        </p>
                      )}

                      {/* 1. SINGLE LINE TEXT */}
                      {q.type === "text" && (
                        <input
                          id={`input-${q.id}`}
                          type="text"
                          value={answers[q.id] || ""}
                          onChange={(e) => {
                            setAnswers({ ...answers, [q.id]: e.target.value });
                            if (fieldErrors[q.id]) {
                              setFieldErrors((prev) => {
                                const copy = { ...prev };
                                delete copy[q.id];
                                return copy;
                              });
                            }
                          }}
                          placeholder="Your answer"
                          className="w-full min-h-[46px] px-3.5 py-2.5 border border-[#E5E3DB] text-sm text-[#090A0A] placeholder-[#8A8A82] focus:outline-none focus:border-[#315CFF] bg-[#FAFAF7]"
                        />
                      )}

                      {/* 2. NUMBER */}
                      {q.type === "number" && (
                        <input
                          id={`input-${q.id}`}
                          type="number"
                          value={answers[q.id] || ""}
                          onChange={(e) => {
                            setAnswers({ ...answers, [q.id]: e.target.value });
                            if (fieldErrors[q.id]) {
                              setFieldErrors((prev) => {
                                const copy = { ...prev };
                                delete copy[q.id];
                                return copy;
                              });
                            }
                          }}
                          placeholder="Enter number"
                          className="w-full min-h-[46px] px-3.5 py-2.5 border border-[#E5E3DB] text-sm text-[#090A0A] placeholder-[#8A8A82] focus:outline-none focus:border-[#315CFF] bg-[#FAFAF7]"
                        />
                      )}

                      {/* 3. EMAIL */}
                      {q.type === "email" && (
                        <input
                          id={`input-${q.id}`}
                          type="email"
                          autoComplete="email"
                          value={answers[q.id] || ""}
                          onChange={(e) => {
                            setAnswers({ ...answers, [q.id]: e.target.value });
                            if (!respondentEmail) setRespondentEmail(e.target.value);
                            if (fieldErrors[q.id]) {
                              setFieldErrors((prev) => {
                                const copy = { ...prev };
                                delete copy[q.id];
                                return copy;
                              });
                            }
                          }}
                          placeholder="name@example.com"
                          className="w-full min-h-[46px] px-3.5 py-2.5 border border-[#E5E3DB] text-sm text-[#090A0A] placeholder-[#8A8A82] focus:outline-none focus:border-[#315CFF] bg-[#FAFAF7]"
                        />
                      )}

                      {/* 4. PHONE */}
                      {q.type === "phone" && (
                        <input
                          id={`input-${q.id}`}
                          type="tel"
                          autoComplete="tel"
                          value={answers[q.id] || ""}
                          onChange={(e) => {
                            setAnswers({ ...answers, [q.id]: e.target.value });
                            if (fieldErrors[q.id]) {
                              setFieldErrors((prev) => {
                                const copy = { ...prev };
                                delete copy[q.id];
                                return copy;
                              });
                            }
                          }}
                          placeholder="+1 (555) 000-0000"
                          className="w-full min-h-[46px] px-3.5 py-2.5 border border-[#E5E3DB] text-sm text-[#090A0A] placeholder-[#8A8A82] focus:outline-none focus:border-[#315CFF] bg-[#FAFAF7]"
                        />
                      )}

                      {/* 5. TEXTAREA */}
                      {q.type === "textarea" && (
                        <textarea
                          id={`input-${q.id}`}
                          rows={3}
                          value={answers[q.id] || ""}
                          onChange={(e) => {
                            setAnswers({ ...answers, [q.id]: e.target.value });
                            if (fieldErrors[q.id]) {
                              setFieldErrors((prev) => {
                                const copy = { ...prev };
                                delete copy[q.id];
                                return copy;
                              });
                            }
                          }}
                          placeholder="Type your response here..."
                          className="w-full p-3.5 border border-[#E5E3DB] text-sm text-[#090A0A] placeholder-[#8A8A82] focus:outline-none focus:border-[#315CFF] bg-[#FAFAF7] resize-none"
                        />
                      )}

                      {/* 6. DROPDOWN / SELECT BOX (Smooth, Normalized, and Reliable) */}
                      {q.type === "select" && (
                        <div className="relative">
                          <select
                            id={`input-${q.id}`}
                            value={answers[q.id] || ""}
                            onChange={(e) => {
                              setAnswers({ ...answers, [q.id]: e.target.value });
                              if (fieldErrors[q.id]) {
                                setFieldErrors((prev) => {
                                  const copy = { ...prev };
                                  delete copy[q.id];
                                  return copy;
                                });
                              }
                            }}
                            className="w-full min-h-[48px] px-3.5 py-2.5 pr-10 border border-[#E5E3DB] text-sm text-[#090A0A] focus:outline-none focus:border-[#315CFF] bg-[#FAFAF7] appearance-none cursor-pointer"
                          >
                            <option value="">Select an option...</option>
                            {getNormalizedOptions(q.options).map((opt) => (
                              <option key={opt.id} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[#5E605E]">
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                      )}

                      {/* 7. DATE / DATE OF BIRTH CALENDAR PICKER */}
                      {q.type === "date" && (
                        <div className="space-y-2">
                          <div className="relative flex items-center">
                            <input
                              id={`input-${q.id}`}
                              type="date"
                              max={isBirthOrDob ? todayDateStr : undefined}
                              value={answers[q.id] || ""}
                              onChange={(e) => {
                                setAnswers({ ...answers, [q.id]: e.target.value });
                                if (fieldErrors[q.id]) {
                                  setFieldErrors((prev) => {
                                    const copy = { ...prev };
                                    delete copy[q.id];
                                    return copy;
                                  });
                                }
                              }}
                              className="w-full min-h-[48px] pl-3.5 pr-12 py-2.5 border border-[#E5E3DB] text-sm text-[#090A0A] focus:outline-none focus:border-[#315CFF] bg-[#FAFAF7] font-mono cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const inputEl = document.getElementById(`input-${q.id}`) as any;
                                if (inputEl?.showPicker) {
                                  inputEl.showPicker();
                                } else {
                                  inputEl?.focus();
                                }
                              }}
                              className="absolute right-0 inset-y-0 px-3.5 flex items-center justify-center text-[#315CFF] hover:text-[#2548CC] cursor-pointer"
                              title="Open Calendar Chooser"
                            >
                              <Calendar className="w-4 h-4" />
                            </button>
                          </div>

                          {answers[q.id] && (
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#315CFF]">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>
                                {isBirthOrDob ? "Date of Birth: " : "Selected: "}
                                <strong>{formatDateDisplay(answers[q.id])}</strong>
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 8. TIME */}
                      {q.type === "time" && (
                        <div className="relative flex items-center">
                          <input
                            id={`input-${q.id}`}
                            type="time"
                            value={answers[q.id] || ""}
                            onChange={(e) => {
                              setAnswers({ ...answers, [q.id]: e.target.value });
                              if (fieldErrors[q.id]) {
                                setFieldErrors((prev) => {
                                  const copy = { ...prev };
                                  delete copy[q.id];
                                  return copy;
                                });
                              }
                            }}
                            className="w-full min-h-[48px] pl-3.5 pr-12 py-2.5 border border-[#E5E3DB] text-sm text-[#090A0A] focus:outline-none focus:border-[#315CFF] bg-[#FAFAF7] font-mono cursor-pointer"
                          />
                          <div className="absolute right-0 inset-y-0 px-3.5 flex items-center justify-center text-[#5E605E] pointer-events-none">
                            <Clock className="w-4 h-4" />
                          </div>
                        </div>
                      )}

                      {/* 9. RADIO OPTIONS */}
                      {q.type === "radio" && (
                        <div className="space-y-2 pt-1">
                          {getNormalizedOptions(q.options).map((opt) => (
                            <label
                              key={opt.id}
                              className={`flex items-center gap-3 p-3 border transition-colors cursor-pointer text-xs md:text-sm font-medium ${
                                answers[q.id] === opt.value
                                  ? "border-[#315CFF] bg-[#315CFF]/5 text-[#090A0A]"
                                  : "border-[#E5E3DB] hover:border-[#B8B8B0] bg-[#FAFAF7] text-[#222422]"
                              }`}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                value={opt.value}
                                checked={answers[q.id] === opt.value}
                                onChange={(e) => {
                                  setAnswers({ ...answers, [q.id]: e.target.value });
                                  if (fieldErrors[q.id]) {
                                    setFieldErrors((prev) => {
                                      const copy = { ...prev };
                                      delete copy[q.id];
                                      return copy;
                                    });
                                  }
                                }}
                                className="w-4 h-4 accent-[#315CFF]"
                              />
                              <span>{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* 10. MULTISELECT / CHECKBOX */}
                      {(q.type === "multiselect" || q.type === "checkbox") && (
                        <div className="space-y-2 pt-1">
                          {getNormalizedOptions(q.options).map((opt) => {
                            const isChecked = Array.isArray(answers[q.id]) && answers[q.id].includes(opt.value);
                            return (
                              <label
                                key={opt.id}
                                className={`flex items-center gap-3 p-3 border transition-colors cursor-pointer text-xs md:text-sm font-medium ${
                                  isChecked
                                    ? "border-[#315CFF] bg-[#315CFF]/5 text-[#090A0A]"
                                    : "border-[#E5E3DB] hover:border-[#B8B8B0] bg-[#FAFAF7] text-[#222422]"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  value={opt.value}
                                  checked={isChecked}
                                  onChange={() => handleCheckboxToggle(q.id, opt.value)}
                                  className="w-4 h-4 accent-[#315CFF] rounded"
                                />
                                <span>{opt.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* 11. RATING (1 to 5) */}
                      {q.type === "rating" && (
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => {
                                setAnswers({ ...answers, [q.id]: val });
                                if (fieldErrors[q.id]) {
                                  setFieldErrors((prev) => {
                                    const copy = { ...prev };
                                    delete copy[q.id];
                                    return copy;
                                  });
                                }
                              }}
                              className={`w-12 h-12 border font-mono text-sm font-bold transition-all ${
                                answers[q.id] === val
                                  ? "bg-[#090A0A] text-white border-[#090A0A] shadow-sm scale-105"
                                  : "border-[#E5E3DB] bg-[#FAFAF7] text-[#090A0A] hover:border-[#090A0A]"
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                          <span className="font-mono text-xs text-[#8A8A82] ml-2">
                            {answers[q.id] ? `Selected: ${answers[q.id]} / 5` : "(1 = Lowest, 5 = Highest)"}
                          </span>
                        </div>
                      )}

                      {/* 12. FILE UPLOAD DROP BOX (True Drag and Drop Zone) */}
                      {q.type === "file" && (
                        <div className="space-y-3">
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsDragOver((prev) => ({ ...prev, [q.id]: true }));
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              setIsDragOver((prev) => ({ ...prev, [q.id]: false }));
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsDragOver((prev) => ({ ...prev, [q.id]: false }));
                              const file = e.dataTransfer.files?.[0];
                              if (file) handleFileUpload(q.id, file);
                            }}
                            className={`border-2 border-dashed p-6 text-center transition-all ${
                              isDragOver[q.id]
                                ? "border-[#315CFF] bg-[#315CFF]/10 scale-[1.01]"
                                : answers[q.id]
                                ? "border-emerald-500 bg-emerald-50/20"
                                : "border-[#B8B8B0] hover:border-[#315CFF] bg-[#FAFAF7]"
                            }`}
                          >
                            {uploadingFiles[q.id] ? (
                              <div className="py-4 space-y-2">
                                <Loader2 className="w-6 h-6 animate-spin text-[#315CFF] mx-auto" />
                                <div className="font-mono text-xs text-[#315CFF] font-semibold">
                                  Uploading file securely...
                                </div>
                              </div>
                            ) : answers[q.id] ? (
                              <div className="space-y-3">
                                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto rounded-full">
                                  <FileCheck className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                  <div className="font-bold text-xs text-emerald-800">
                                    File Attached Successfully
                                  </div>
                                  <div className="font-mono text-[11px] text-[#5E605E]">
                                    {fileNames[q.id] || answers[q.id].split("/").pop()}
                                  </div>
                                </div>
                                <div className="flex items-center justify-center gap-3 pt-2">
                                  <label className="font-mono text-[11px] text-[#315CFF] hover:underline cursor-pointer uppercase font-bold">
                                    <span>Replace File</span>
                                    <input
                                      type="file"
                                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileUpload(q.id, file);
                                      }}
                                    />
                                  </label>
                                  <span className="text-[#E5E3DB]">|</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const ansCopy = { ...answers };
                                      delete ansCopy[q.id];
                                      setAnswers(ansCopy);
                                      const namesCopy = { ...fileNames };
                                      delete namesCopy[q.id];
                                      setFileNames(namesCopy);
                                    }}
                                    className="font-mono text-[11px] text-red-600 hover:underline uppercase"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <UploadCloud className="w-8 h-8 text-[#8A8A82] mx-auto stroke-1" />
                                <div>
                                  <span className="font-bold text-xs text-[#090A0A]">
                                    Drag & drop your file here
                                  </span>
                                  <span className="text-xs text-[#5E605E]"> or </span>
                                  <label className="text-xs text-[#315CFF] font-bold hover:underline cursor-pointer">
                                    browse files
                                    <input
                                      type="file"
                                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileUpload(q.id, file);
                                      }}
                                    />
                                  </label>
                                </div>
                                <p className="font-mono text-[10px] text-[#8A8A82]">
                                  PDF, DOCX, PNG, JPG (Max 10MB)
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Inline Field Error Message */}
                      {hasError && (
                        <div className="flex items-center gap-1.5 text-xs text-red-600 font-mono pt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{fieldErrors[q.id]}</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Submit Action Button */}
                <div className="pt-6 border-t border-[#E5E3DB] space-y-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full min-h-[52px] bg-[#090A0A] hover:bg-[#222422] text-[#F4F2EC] font-mono text-xs uppercase tracking-wider font-bold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#315CFF]" />
                        <span>Verifying & Recording Submission...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Response</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-center font-mono text-[10px] text-[#8A8A82]">
                    Submissions are encrypted and saved securely with PostgreSQL database RLS.
                  </p>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Minimal Footer */}
      <footer className="w-full text-center py-6 font-mono text-[10px] text-[#8A8A82] uppercase tracking-wider flex items-center justify-center gap-2">
        <span>Powered by</span>
        <Logo size="xs" theme="light" href="/" />
      </footer>
    </div>
  );
}
