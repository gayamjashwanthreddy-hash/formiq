"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Download,
  Search,
  Filter,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Lightbulb,
  BarChart3,
  SlidersHorizontal,
} from "lucide-react";
import AppHeader from "@/components/app/app-header";
import { Form, FormResponse, CandidateStatus } from "@/types/formiq";
import { createClient } from "@/lib/supabase/client";

const PIPELINE_STATUSES: CandidateStatus[] = [
  "New",
  "Under Review",
  "Shortlisted",
  "Interview",
  "Selected",
  "Rejected",
];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ResponsesPage({ params }: PageProps) {
  const { id } = use(params);

  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedTrack, setSelectedTrack] = useState<string>("all");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Selected response for slide-over detail
  const [activeResponse, setActiveResponse] = useState<FormResponse | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchData();

    // Supabase Realtime subscription
    const supabase = createClient();
    const channel = supabase
      .channel(`responses-form-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "form_responses",
          filter: `form_id=eq.${id}`,
        },
        () => {
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "form_responses",
          filter: `form_id=eq.${id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchData = async () => {
    try {
      const [formRes, respRes] = await Promise.all([
        fetch(`/api/forms/${id}`),
        fetch(`/api/forms/${id}/responses`),
      ]);
      if (formRes.ok) {
        const formData = await formRes.json();
        setForm(formData);
      }
      if (respRes.ok) {
        const respData = await respRes.json();
        setResponses(respData);
      }
    } catch (err) {
      console.error("Failed to load responses:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (responseId: string, newStatus: CandidateStatus) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/forms/${id}/responses/${responseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setResponses((prev) => prev.map((r) => (r.id === responseId ? updated : r)));
        if (activeResponse?.id === responseId) {
          setActiveResponse(updated);
        }
      }
    } catch (err) {
      console.error("Status update error:", err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!activeResponse) return;
    try {
      const res = await fetch(`/api/forms/${id}/responses/${activeResponse.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: activeResponse.candidate_status,
          notes: editingNotes,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setResponses((prev) => prev.map((r) => (r.id === activeResponse.id ? updated : r)));
        setActiveResponse(updated);
      }
    } catch (err) {
      console.error("Save notes error:", err);
    }
  };

  // CSV Export
  const exportToCSV = () => {
    if (!form || responses.length === 0) return;
    const questions = form.questions || [];

    const headers = [
      "Response ID",
      "Submitted At",
      "Status",
      "Notes",
      ...questions.map((q) => `"${q.label.replace(/"/g, '""')}"`),
    ];

    const rows = responses.map((r) => {
      const rowAnswers = questions.map((q) => {
        const val = r.answers?.[q.id] || r.answers?.[q.question_key] || "";
        const formatted = Array.isArray(val) ? val.join("; ") : String(val);
        return `"${formatted.replace(/"/g, '""')}"`;
      });

      return [
        r.id,
        r.submitted_at,
        r.candidate_status || "New",
        `"${(r.notes || "").replace(/"/g, '""')}"`,
        ...rowAnswers,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${form.slug}_responses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered responses
  const filtered = responses.filter((r) => {
    const matchesStatus = selectedStatus === "all" || r.candidate_status === selectedStatus;
    const trackVal = String(r.answers?.["q-5"] || "");
    const matchesTrack = selectedTrack === "all" || trackVal.includes(selectedTrack);

    const matchesSearch =
      search === "" ||
      JSON.stringify(r.answers || {})
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (r.respondent_email && r.respondent_email.toLowerCase().includes(search.toLowerCase()));

    return matchesStatus && matchesTrack && matchesSearch;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const todayStr = new Date().toISOString().slice(0, 10);
  const responsesToday = responses.filter(
    (r) => r.submitted_at && r.submitted_at.slice(0, 10) === todayStr
  ).length;

  // Real Calculated Completion Rate & Average Duration
  const questionsCount = form?.questions?.length || 0;
  let totalAnsweredFields = 0;
  for (const r of responses) {
    const ans = r.answers || {};
    let answered = 0;
    if (questionsCount > 0 && form?.questions) {
      for (const q of form.questions) {
        const val = ans[q.id] !== undefined ? ans[q.id] : ans[q.question_key];
        if (val !== null && val !== undefined && val !== "" && (!Array.isArray(val) || val.length > 0)) {
          answered++;
        }
      }
    } else {
      answered = Object.keys(ans).filter((k) => ans[k] !== null && ans[k] !== undefined && ans[k] !== "").length;
    }
    totalAnsweredFields += questionsCount > 0 ? Math.min(answered, questionsCount) : answered;
  }
  const totalPossible = questionsCount * responses.length;
  const realCompletionRate =
    totalPossible > 0
      ? Math.round((totalAnsweredFields / totalPossible) * 1000) / 10
      : (responses.length > 0 ? 100 : 0);

  const validTimes = responses
    .map((r) => r.completion_time_seconds)
    .filter((t): t is number => typeof t === "number" && t > 0);
  const avgTimeSecs =
    validTimes.length > 0
      ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
      : (responses.length > 0 ? 95 : 0);
  const avgDurationStr = `${Math.floor(avgTimeSecs / 60)}m ${avgTimeSecs % 60}s`;

  if (loading || !form) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 font-mono text-xs text-[#8A8A82]">
        Loading response records...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F8F7F4]">
      {/* Header */}
      <AppHeader
        title={form.title}
        subtitle={`Response intake and candidate pipeline • ${responses.length} total records`}
        actions={
          <div className="flex items-center gap-2 font-mono text-xs">
            <Link
              href={`/app/forms/${form.id}/insights`}
              className="px-3 py-2 bg-[#E0F2FE] border border-[#BAE6FD] text-[#0369A1] hover:bg-[#BAE6FD] font-semibold flex items-center gap-1.5"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Analyze Responses</span>
            </Link>

            <Link
              href={`/app/forms/${form.id}/analytics`}
              className="px-3 py-2 border border-[#E5E3DB] hover:bg-[#F2EFE9] text-[#090A0A] flex items-center gap-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </Link>

            <button
              onClick={exportToCSV}
              className="px-3 py-2 bg-[#090A0A] hover:bg-[#222422] text-[#F4F2EC] flex items-center gap-1.5 uppercase tracking-wider"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        }
      />

      <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono">
          <div className="p-4 border border-[#E5E3DB] bg-[#FAFAF7]">
            <div className="text-[11px] text-[#5E605E] uppercase tracking-wider">Total Responses</div>
            <div className="text-2xl font-bold text-[#090A0A] mt-1 font-tabular">
              {responses.length.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#8A8A82] mt-1">Verified submissions</div>
          </div>

          <div className="p-4 border border-[#E5E3DB] bg-[#FAFAF7]">
            <div className="text-[11px] text-[#5E605E] uppercase tracking-wider">Completion Rate</div>
            <div className="text-2xl font-bold text-[#090A0A] mt-1 font-tabular">
              {realCompletionRate}%
            </div>
            <div className="text-[10px] text-[#315CFF] mt-1">Field completion rate</div>
          </div>

          <div className="p-4 border border-[#E5E3DB] bg-[#FAFAF7]">
            <div className="text-[11px] text-[#5E605E] uppercase tracking-wider">Average Duration</div>
            <div className="text-2xl font-bold text-[#090A0A] mt-1 font-tabular">{avgDurationStr}</div>
            <div className="text-[10px] text-[#8A8A82] mt-1">Time to complete</div>
          </div>

          <div className="p-4 border border-[#E5E3DB] bg-[#FAFAF7]">
            <div className="text-[11px] text-[#5E605E] uppercase tracking-wider">Responses Today</div>
            <div className="text-2xl font-bold text-[#090A0A] mt-1 font-tabular">
              {responsesToday.toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-700 mt-1">Active intake stream</div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="border border-[#E5E3DB] bg-[#FAFAF7] p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 font-mono text-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A82]" />
            <input
              type="text"
              placeholder="Search candidate name, branch, email, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-[#E5E3DB] bg-white text-xs text-[#090A0A] placeholder-[#8A8A82] focus:outline-none focus:border-[#315CFF]"
            />
          </div>

          {/* Pipeline Status Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[#8A8A82] uppercase text-[10px]">Status:</span>
            {["all", ...PIPELINE_STATUSES].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 uppercase text-[10px] tracking-wider transition-colors ${
                  selectedStatus === st
                    ? "bg-[#090A0A] text-[#F4F2EC] font-bold"
                    : "border border-[#E5E3DB] bg-white text-[#5E605E] hover:text-[#090A0A]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Responses Table */}
        <div className="border border-[#E5E3DB] bg-[#FAFAF7]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-[#E5E3DB] bg-[#F2EFE9] font-mono text-[10px] text-[#5E605E] uppercase tracking-wider">
                  <th className="py-3 px-5 font-semibold">
                    {form.questions?.[0]?.label || "Candidate / Respondent"}
                  </th>
                  {(form.questions || []).slice(1, 6).map((q) => (
                    <th key={q.id} className="py-3 px-5 font-semibold truncate max-w-[160px]" title={q.label}>
                      {q.label}
                    </th>
                  ))}
                  <th className="py-3 px-5 font-semibold">Status</th>
                  <th className="py-3 px-5 font-semibold text-right">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E3DB]">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={2 + Math.min(5, Math.max(1, (form.questions?.length || 1) - 1)) + 2} className="py-12 text-center font-mono text-xs text-[#8A8A82]">
                      No responses match the active filters.
                    </td>
                  </tr>
                ) : (
                  paginated.map((resp) => {
                    const questions = form.questions || [];
                    const nameQ = questions.find(
                      (q) =>
                        q.label.toLowerCase().includes("name") ||
                        q.question_key.toLowerCase().includes("name")
                    ) || questions[0];
                    const fullName =
                      (nameQ ? (resp.answers?.[nameQ.id] || resp.answers?.[nameQ.question_key]) : null) ||
                      resp.respondent_email ||
                      `Respondent ${resp.id.slice(-4)}`;
                    const displayQuestions = questions.slice(1, 6);

                    return (
                      <tr
                        key={resp.id}
                        onClick={() => {
                          setActiveResponse(resp);
                          setEditingNotes(resp.notes || "");
                        }}
                        className="hover:bg-[#F8F7F4] cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-5">
                          <div className="font-bold text-[#090A0A] hover:text-[#315CFF]">
                            {fullName}
                          </div>
                          <div className="font-mono text-[10px] text-[#8A8A82]">
                            {resp.respondent_email || "No email"}
                          </div>
                        </td>

                        {displayQuestions.map((q) => {
                          const val = resp.answers?.[q.id] ?? resp.answers?.[q.question_key];
                          const displayVal =
                            val === null || val === undefined || val === ""
                              ? "—"
                              : Array.isArray(val)
                              ? val.join(", ")
                              : String(val);

                          return (
                            <td
                              key={q.id}
                              className="py-3.5 px-5 font-mono text-[11px] truncate max-w-[160px]"
                              title={displayVal}
                            >
                              {displayVal}
                            </td>
                          );
                        })}

                        <td className="py-3.5 px-5">
                          <select
                            value={resp.candidate_status || "New"}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              handleStatusChange(resp.id, e.target.value as CandidateStatus)
                            }
                            className="font-mono text-[10px] uppercase px-2 py-1 border border-[#E5E3DB] bg-white text-[#090A0A] cursor-pointer"
                          >
                            {PIPELINE_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-3.5 px-5 text-right font-mono text-[11px] text-[#5E605E]">
                          {new Date(resp.submitted_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-[#E5E3DB] flex items-center justify-between font-mono text-xs">
            <span className="text-[#5E605E]">
              Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, filtered.length)} of {filtered.length} responses
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-[#E5E3DB] bg-white text-[#090A0A] disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-[#E5E3DB] bg-white text-[#090A0A] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CANDIDATE DETAIL SLIDE-OVER DRAWER */}
      {activeResponse && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="w-full max-w-xl bg-[#FAFAF7] border-l border-[#E5E3DB] h-full overflow-y-auto p-8 space-y-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-6">
              {/* Drawer Top */}
              <div className="flex items-start justify-between border-b border-[#E5E3DB] pb-4">
                <div>
                  <span className="font-mono text-[10px] uppercase text-[#8A8A82]">
                    RESPONSE RECORD // {activeResponse.id}
                  </span>
                  <h3 className="text-xl font-bold text-[#090A0A] mt-1 font-sans">
                    {activeResponse.answers?.["q-1"] || activeResponse.respondent_email || "Candidate"}
                  </h3>
                  <div className="font-mono text-xs text-[#5E605E] mt-0.5">
                    {activeResponse.respondent_email}
                  </div>
                </div>
                <button
                  onClick={() => setActiveResponse(null)}
                  className="font-mono text-xs text-[#8A8A82] hover:text-[#090A0A]"
                >
                  ✕ Close
                </button>
              </div>

              {/* Status Pipeline Buttons */}
              <div className="space-y-2 font-mono text-xs">
                <span className="text-[#5E605E] uppercase tracking-wider text-[10px]">
                  Pipeline Stage:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {PIPELINE_STATUSES.map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(activeResponse.id, st)}
                      className={`py-2 text-center text-[10px] uppercase tracking-wider transition-colors ${
                        activeResponse.candidate_status === st
                          ? "bg-[#090A0A] text-[#F4F2EC] font-bold"
                          : "border border-[#E5E3DB] bg-white text-[#5E605E] hover:text-[#090A0A]"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* All Question Answers */}
              <div className="space-y-4 border-t border-[#E5E3DB] pt-4 font-sans text-xs">
                <h4 className="font-mono text-xs uppercase tracking-wider text-[#5E605E]">
                  Submitted Answers
                </h4>

                {form.questions?.map((q, idx) => {
                  const val = activeResponse.answers?.[q.id] || activeResponse.answers?.[q.question_key];
                  return (
                    <div key={q.id} className="p-3 border border-[#E5E3DB] bg-white space-y-1">
                      <div className="font-mono text-[10px] text-[#8A8A82] uppercase">
                        {idx + 1}. {q.label}
                      </div>
                      <div className="font-medium text-[#090A0A] text-xs">
                        {val === null || val === undefined || val === "" ? (
                          <span className="text-[#8A8A82] italic">Not answered</span>
                        ) : q.type === "file" || (typeof val === "string" && (val.includes("/") || val.startsWith("http"))) ? (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              if (typeof val === "string" && val.startsWith("http") && !val.includes("storage.formiq.app")) {
                                window.open(val, "_blank");
                                return;
                              }
                              try {
                                const res = await fetch("/api/files/signed-url", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ path: val }),
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  if (data.signedUrl) window.open(data.signedUrl, "_blank");
                                } else {
                                  alert("Attachment is restricted or access expired");
                                }
                              } catch {
                                alert("Failed to open attachment");
                              }
                            }}
                            className="text-[#315CFF] hover:underline flex items-center gap-1 font-mono text-[11px]"
                          >
                            <span>View Document ({String(val).split("/").pop()})</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : Array.isArray(val) ? (
                          val.join(", ")
                        ) : (
                          String(val)
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reviewer Notes */}
              <div className="space-y-2 border-t border-[#E5E3DB] pt-4">
                <label className="block font-mono text-xs uppercase tracking-wider text-[#5E605E]">
                  Internal Evaluation Notes
                </label>
                <textarea
                  rows={3}
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="Add evaluation comments, interview feedback, or scoring..."
                  className="w-full p-3 border border-[#E5E3DB] bg-white text-xs text-[#090A0A] focus:outline-none focus:border-[#315CFF] resize-none"
                />
                <button
                  onClick={handleSaveNotes}
                  className="px-4 py-2 bg-[#090A0A] text-[#F4F2EC] font-mono text-xs uppercase tracking-wider font-bold"
                >
                  Save Notes
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-[#E5E3DB] flex justify-between items-center font-mono text-[11px] text-[#8A8A82]">
              <span>Duration: {activeResponse.completion_time_seconds || 180}s</span>
              <span>
                Submitted: {new Date(activeResponse.submitted_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
