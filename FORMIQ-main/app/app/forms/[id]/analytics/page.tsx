"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { BarChart3, TrendingUp, Users, Clock, CheckCircle2, Lightbulb, ArrowUpRight, PieChart as PieChartIcon } from "lucide-react";
import AppHeader from "@/components/app/app-header";
import { Form, FormResponse, FormQuestion } from "@/types/formiq";
import { calculateDeterministicStats, AggregatedStats } from "@/lib/analytics/stats";
import PieChart from "@/components/charts/pie-chart";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AnalyticsPage({ params }: PageProps) {
  const { id } = use(params);

  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [formRes, respRes] = await Promise.all([
        fetch(`/api/forms/${id}`),
        fetch(`/api/forms/${id}/responses`),
      ]);
      if (formRes.ok && respRes.ok) {
        const formData: Form = await formRes.json();
        const respData: FormResponse[] = await respRes.json();
        setForm(formData);
        setResponses(respData);
        const calculated = calculateDeterministicStats(formData.questions || [], respData);
        setStats(calculated);
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !form || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 font-mono text-xs text-[#8A8A82]">
        Calculating deterministic statistics...
      </div>
    );
  }

  const questions = form.questions || [];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F8F7F4]">
      <AppHeader
        title={form.title}
        subtitle="Deterministic statistics calculated directly from response records."
        actions={
          <div className="flex items-center gap-2 font-mono text-xs">
            <Link
              href={`/app/forms/${form.id}/insights`}
              className="px-4 py-2 bg-[#E0F2FE] border border-[#BAE6FD] hover:bg-[#BAE6FD] text-[#0369A1] font-semibold flex items-center gap-1.5"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Response Intelligence</span>
            </Link>
            <Link
              href={`/app/forms/${form.id}/responses`}
              className="px-4 py-2 border border-[#E5E3DB] hover:bg-[#F2EFE9] text-[#090A0A]"
            >
              Responses Table
            </Link>
          </div>
        }
      />

      <div className="p-8 space-y-8 max-w-7xl w-full mx-auto">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono">
          <div className="p-5 border border-[#E5E3DB] bg-[#FAFAF7]">
            <div className="text-[11px] uppercase tracking-wider text-[#5E605E]">Total Submissions</div>
            <div className="text-3xl font-bold text-[#090A0A] mt-2 font-tabular">
              {stats.totalResponses.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#8A8A82] mt-2">Source: Postgres rows</div>
          </div>

          <div className="p-5 border border-[#E5E3DB] bg-[#FAFAF7]">
            <div className="text-[11px] uppercase tracking-wider text-[#5E605E]">Completion Rate</div>
            <div className="text-3xl font-bold text-[#090A0A] mt-2 font-tabular">
              {stats.completionRate}%
            </div>
            <div className="text-[10px] text-emerald-700 mt-2">
              {stats.fullyCompletedSubmissions} of {stats.totalResponses} fully completed ({stats.fullCompletionRate}%)
            </div>
          </div>

          <div className="p-5 border border-[#E5E3DB] bg-[#FAFAF7]">
            <div className="text-[11px] uppercase tracking-wider text-[#5E605E]">Average Duration</div>
            <div className="text-3xl font-bold text-[#090A0A] mt-2 font-tabular">
              {Math.floor(stats.averageTimeSeconds / 60)}m {stats.averageTimeSeconds % 60}s
            </div>
            <div className="text-[10px] text-[#5E605E] mt-2">Avg submission speed</div>
          </div>

          <div className="p-5 border border-[#E5E3DB] bg-[#FAFAF7]">
            <div className="text-[11px] uppercase tracking-wider text-[#5E605E]">Drop-off Benchmark</div>
            <div className="text-3xl font-bold text-[#090A0A] mt-2 font-tabular">
              {stats.dropOffRate}%
            </div>
            <div className="text-[10px] text-[#315CFF] mt-2">
              {stats.dropOffRate <= 20 ? "Low question friction" : stats.dropOffRate <= 50 ? "Moderate question friction" : "High question friction"}
            </div>
          </div>
        </div>

        {/* Pipeline Stage Distribution Pie Chart */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <PieChart
              title="Candidate Pipeline Stages"
              subtitle="Current review status of submissions"
              data={[
                { label: "New", value: responses.filter(r => (r.candidate_status || "New") === "New").length, color: "#315CFF" },
                { label: "Under Review", value: responses.filter(r => r.candidate_status === "Under Review").length, color: "#EAB308" },
                { label: "Shortlisted", value: responses.filter(r => r.candidate_status === "Shortlisted").length, color: "#10B981" },
                { label: "Interview", value: responses.filter(r => r.candidate_status === "Interview").length, color: "#8B5CF6" },
                { label: "Selected", value: responses.filter(r => r.candidate_status === "Selected").length, color: "#059669" },
                { label: "Rejected", value: responses.filter(r => r.candidate_status === "Rejected").length, color: "#9CA3AF" },
              ]}
              donut={true}
              size={170}
              emptyMessage="No responses triaged yet"
            />
          </div>

          <div className="md:col-span-2 border border-[#E5E3DB] bg-[#FAFAF7] p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="font-mono text-[10px] text-[#315CFF] uppercase font-bold tracking-wider">
                COHORT METRICS
              </span>
              <h3 className="text-base font-bold text-[#090A0A]">
                Deterministic Response Breakdown
              </h3>
              <p className="text-xs text-[#5E605E] leading-relaxed">
                Aggregated in realtime from Postgres tables. Categorical questions feature dual-mode visualizers (horizontal bars for rank comparison and circular donut charts for proportionality).
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs pt-4 border-t border-[#E5E3DB]">
              <div className="p-3 bg-white border border-[#E5E3DB]">
                <div className="text-[10px] text-[#8A8A82] uppercase">Questions</div>
                <div className="text-base font-bold text-[#090A0A] mt-0.5">{questions.length}</div>
              </div>
              <div className="p-3 bg-white border border-[#E5E3DB]">
                <div className="text-[10px] text-[#8A8A82] uppercase">Categorical</div>
                <div className="text-base font-bold text-[#090A0A] mt-0.5">
                  {questions.filter(q => ["select", "radio", "multiselect"].includes(q.type)).length}
                </div>
              </div>
              <div className="p-3 bg-white border border-[#E5E3DB]">
                <div className="text-[10px] text-[#8A8A82] uppercase">Text Fields</div>
                <div className="text-base font-bold text-[#090A0A] mt-0.5">
                  {questions.filter(q => ["text", "textarea"].includes(q.type)).length}
                </div>
              </div>
              <div className="p-3 bg-white border border-[#E5E3DB]">
                <div className="text-[10px] text-[#8A8A82] uppercase">Submissions</div>
                <div className="text-base font-bold text-[#315CFF] mt-0.5">{responses.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Charts for Each Multi-Choice / Select / Radio Question */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {questions
            .filter((q) => ["select", "radio", "multiselect"].includes(q.type) && stats.breakdowns[q.id])
            .map((q) => {
              const counts = stats.breakdowns[q.id] || {};
              const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
              const maxVal = Math.max(...Object.values(counts), 1);
              const questionPieData = entries.map(([label, count]) => ({ label, value: count }));

              return (
                <div key={q.id} className="border border-[#E5E3DB] bg-[#FAFAF7] p-6 space-y-5">
                  <div className="flex items-start justify-between border-b border-[#E5E3DB] pb-3">
                    <div>
                      <span className="font-mono text-[10px] text-[#8A8A82] uppercase">
                        FIELD: {q.question_key}
                      </span>
                      <h3 className="font-bold text-sm text-[#090A0A] mt-0.5">{q.label}</h3>
                    </div>
                    <span className="font-mono text-[11px] px-2 py-0.5 bg-[#E8E5DD] uppercase text-[#222422]">
                      {q.type}
                    </span>
                  </div>

                  {/* Horizontal Bar Visualizer */}
                  <div className="space-y-3 font-mono text-xs">
                    {entries.map(([label, count]) => {
                      const pct = stats.totalResponses > 0 ? Math.round((count / stats.totalResponses) * 100) : 0;
                      const isDominant = count === maxVal;
                      return (
                        <div key={label} className="space-y-1">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="font-medium text-[#090A0A] truncate max-w-[240px]">
                              {label}
                            </span>
                            <span className="text-[#5E605E] tabular-nums font-semibold">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-[#E5E3DB] h-2.5 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                isDominant ? "bg-[#315CFF]" : "bg-[#090A0A]"
                              }`}
                              style={{ width: `${(count / maxVal) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Donut Pie Chart for this question */}
                  {entries.length > 1 && (
                    <div className="pt-4 border-t border-[#E5E3DB]">
                      <PieChart
                        data={questionPieData}
                        donut={true}
                        size={150}
                        showLegend={true}
                      />
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Qualitative Responses Sample */}
        <div className="border border-[#E5E3DB] bg-[#FAFAF7] p-6 space-y-4">
          <div className="border-b border-[#E5E3DB] pb-3 flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#090A0A]">
              Open-Text Responses Intake Stream
            </h3>
            <span className="font-mono text-xs text-[#5E605E]">
              Extracted for NLP synthesis
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-xs">
            {responses.slice(0, 4).map((r, i) => (
              <div key={i} className="p-4 border border-[#E5E3DB] bg-white space-y-2">
                <div className="font-mono text-[10px] text-[#8A8A82]">
                  {r.respondent_email} • {r.answers?.["q-5"] || "Track"}
                </div>
                <p className="text-[#222422] italic leading-relaxed">
                  "{r.answers?.["q-8"] || "No written statement provided."}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
