"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Lightbulb,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  Search,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Loader2,
  CheckCircle,
  HelpCircle,
  FileText,
  BarChart3,
  Compass,
} from "lucide-react";
import AppHeader from "@/components/app/app-header";
import { Form, AIInsight } from "@/types/formiq";
import { NLQueryResult } from "@/lib/ai/nl-query";

interface PageProps {
  params: Promise<{ id: string }>;
}

const PRESET_QUESTIONS = [
  "Which option has the highest number of selections?",
  "Where are we lagging or facing bottlenecks?",
  "What is the average completion duration?",
  "How many total responses have been recorded?",
];

export default function InsightsPage({ params }: PageProps) {
  const { id } = use(params);

  const [form, setForm] = useState<Form | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Natural Language Analytics Q&A
  const [nlQuery, setNlQuery] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<NLQueryResult | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [formRes, insightsRes] = await Promise.all([
        fetch(`/api/forms/${id}`),
        fetch(`/api/forms/${id}/insights`),
      ]);

      if (formRes.ok) {
        const formData: Form = await formRes.json();
        setForm(formData);
      }
      if (insightsRes.ok) {
        const insightsData: AIInsight[] = await insightsRes.json();
        setInsights(insightsData);
      }
    } catch (err) {
      console.error("Failed to load insights:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshInsights = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/forms/${id}/insights`, { method: "POST" });
      if (res.ok) {
        const updated: AIInsight[] = await res.json();
        setInsights(updated);
      }
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRunNlQuery = async (queryText?: string) => {
    const q = queryText || nlQuery;
    if (!q.trim()) return;

    setIsQuerying(true);
    try {
      const res = await fetch(`/api/forms/${id}/nl-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (res.ok) {
        const data: NLQueryResult = await res.json();
        setQueryResult(data);
      }
    } catch (err) {
      console.error("Query error:", err);
    } finally {
      setIsQuerying(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 font-mono text-xs text-[#5E605E]">
        <Loader2 className="w-6 h-6 animate-spin text-[#315CFF] mb-3" />
        <span>Synthesizing response intelligence...</span>
      </div>
    );
  }

  // Segment insights by category
  const keyFindings = insights.filter((i) => i.category === "key_finding");
  const laggingAreas = insights.filter(
    (i) => i.category === "area_requiring_attention" || i.category === "gap"
  );
  const strengths = insights.filter((i) => i.category === "strength");
  const trends = insights.filter((i) => i.category === "trend");
  const recommendations = insights.filter((i) => i.category === "recommendation");

  const totalResponses = form.response_count || 0;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F8F7F4]">
      <AppHeader
        title="Response Intelligence"
        subtitle={`Evidence-backed synthesis, operational gaps, and decision frameworks for "${form.title}"`}
        actions={
          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={handleRefreshInsights}
              disabled={isRefreshing}
              className="px-4 py-2 bg-[#090A0A] hover:bg-[#222422] text-[#F4F2EC] flex items-center gap-1.5 transition-colors uppercase tracking-wider font-bold"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#315CFF]" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Recalculate Insights</span>
                </>
              )}
            </button>
            <Link
              href={`/app/forms/${form.id}/responses`}
              className="px-4 py-2 border border-[#E5E3DB] hover:bg-[#F2EFE9] text-[#090A0A] uppercase tracking-wider"
            >
              View Responses ({totalResponses})
            </Link>
          </div>
        }
      />

      <div className="p-6 md:p-8 space-y-8 max-w-7xl w-full mx-auto">
        {/* Awaiting Submissions Guidance Banner if 0 responses */}
        {totalResponses === 0 && (
          <div className="p-6 border border-[#E5E3DB] bg-[#FAFAF7] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="font-bold text-sm text-[#090A0A]">
                  Awaiting Respondent Submissions
                </h3>
              </div>
              <p className="text-xs text-[#5E605E] max-w-2xl font-sans leading-relaxed">
                The Intelligence Engine calculates verified cohort trends and friction points from live responses. Submit a test response to activate automated Gemini 3.8 Flash synthesis!
              </p>
            </div>
            <Link
              href={`/f/${form.slug}`}
              target="_blank"
              className="px-4 py-2 bg-[#315CFF] hover:bg-[#2548CC] text-white font-mono text-xs uppercase tracking-wider font-bold transition-colors flex items-center gap-1.5 shrink-0"
            >
              <span>Submit Test Response</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* NATURAL LANGUAGE QUERY INTERACTION BAR */}
        <div className="border border-[#E5E3DB] bg-[#FAFAF7] p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E5E3DB] pb-3">
            <div className="flex items-center gap-2 font-mono text-xs text-[#090A0A]">
              <Sparkles className="w-4 h-4 text-[#315CFF]" />
              <span className="font-bold uppercase tracking-wider">
                Natural Language Intelligence Query
              </span>
            </div>
            <span className="font-mono text-[10px] text-[#5E605E] uppercase">
              GEMINI 3.8 FLASH GROUNDED
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunNlQuery();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A82]" />
              <input
                type="text"
                value={nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
                placeholder="Ask any question about your data (e.g. 'Which option is most popular?', 'Where are we lagging?')"
                className="w-full pl-9 pr-4 py-2.5 border border-[#E5E3DB] bg-white text-xs text-[#090A0A] placeholder-[#8A8A82] focus:outline-none focus:border-[#315CFF] font-sans"
              />
            </div>
            <button
              type="submit"
              disabled={isQuerying || !nlQuery.trim()}
              className="px-6 py-2.5 bg-[#090A0A] hover:bg-[#222422] text-[#F4F2EC] font-mono text-xs uppercase tracking-wider font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isQuerying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#315CFF]" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <span>Ask AI</span>
              )}
            </button>
          </form>

          {/* Quick Clickable Suggestions */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-[#5E605E] pt-1">
            <span className="text-[#8A8A82] uppercase text-[10px]">Try asking:</span>
            {PRESET_QUESTIONS.map((pq, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setNlQuery(pq);
                  handleRunNlQuery(pq);
                }}
                className="px-2.5 py-1 border border-[#E5E3DB] hover:border-[#315CFF] bg-white text-[#222422] transition-colors hover:text-[#315CFF]"
              >
                "{pq}"
              </button>
            ))}
          </div>

          {/* Query Result Card */}
          {queryResult && (
            <div className="p-5 bg-white border border-[#315CFF] space-y-3 font-sans mt-4 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-[#8A8A82] uppercase text-[10px]">
                  ANSWER FOR: "{queryResult.query}"
                </span>
                <span className="text-[#315CFF] font-semibold text-[11px]">
                  {queryResult.metric || "VERIFIED DATABASE QUERY"}
                </span>
              </div>

              <div className="text-xl font-bold text-[#090A0A]">{queryResult.answer}</div>
              <p className="text-xs text-[#5E605E] leading-relaxed">
                {queryResult.explanation}
              </p>

              <div className="flex items-center gap-4 pt-2 border-t border-[#E5E3DB] font-mono text-xs">
                {queryResult.matchingResponseIds && queryResult.matchingResponseIds.length > 0 && (
                  <Link
                    href={`/app/forms/${form.id}/responses`}
                    className="text-[#315CFF] font-semibold hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <span>View {queryResult.count} matching responses in table</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setQueryResult(null)}
                  className="text-[#8A8A82] hover:text-[#090A0A] text-[11px] uppercase ml-auto"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 1: KEY FINDINGS & EXECUTIVE OVERVIEW */}
        {keyFindings.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#315CFF]" />
                <h2 className="text-base font-bold text-[#090A0A] tracking-tight">
                  Executive Findings & Intake Health
                </h2>
              </div>
              <span className="font-mono text-[10px] text-[#8A8A82] uppercase">
                HIGH-LEVEL SYNTHESIS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {keyFindings.map((item) => (
                <div
                  key={item.id}
                  className="border border-[#E5E3DB] bg-[#FAFAF7] p-5 space-y-3 shadow-sm hover:border-[#315CFF] transition-colors"
                >
                  <div className="flex items-center justify-between border-b border-[#E5E3DB] pb-2 font-mono text-[10px]">
                    <span className="uppercase px-2 py-0.5 bg-[#E0F2FE] text-[#0369A1] font-bold">
                      KEY FINDING
                    </span>
                    <span className="text-[#8A8A82]">EVIDENCE-BACKED</span>
                  </div>

                  <h3 className="font-bold text-sm text-[#090A0A]">{item.title}</h3>
                  <p className="text-xs font-semibold text-[#090A0A]">{item.finding}</p>

                  <div className="p-2.5 bg-[#F2EFE9] border border-[#E5E3DB] font-mono text-[11px] text-[#5E605E]">
                    Evidence: {item.evidence}
                  </div>

                  <p className="text-xs text-[#5E605E] leading-relaxed">{item.interpretation}</p>

                  <div className="pt-2 border-t border-[#E5E3DB] font-mono text-[11px] text-[#315CFF]">
                    Action: {item.suggested_action}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 2: AREAS REQUIRING ATTENTION & OPERATIONAL GAPS */}
        {laggingAreas.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h2 className="text-base font-bold text-[#090A0A] tracking-tight">
                  Areas Requiring Attention & Bottlenecks
                </h2>
              </div>
              <span className="font-mono text-[10px] text-amber-700 uppercase font-semibold">
                LOW PARTICIPATION & CONSTRAINTS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {laggingAreas.map((item) => (
                <div
                  key={item.id}
                  className="border border-[#E5E3DB] bg-[#FAFAF7] p-5 space-y-3 shadow-sm hover:border-amber-400 transition-colors"
                >
                  <div className="flex items-center justify-between border-b border-[#E5E3DB] pb-2 font-mono text-[10px]">
                    <span className="uppercase px-2 py-0.5 bg-amber-100 text-amber-900 font-bold">
                      {item.category.replace(/_/g, " ")}
                    </span>
                    <span className="text-amber-700 font-semibold">ATTENTION REQUIRED</span>
                  </div>

                  <h3 className="font-bold text-sm text-[#090A0A]">{item.title}</h3>
                  <div className="text-xs font-semibold text-amber-900">
                    Finding: {item.finding}
                  </div>

                  <div className="p-2.5 bg-amber-50/60 border border-amber-200 font-mono text-[11px] text-amber-900">
                    Evidence: {item.evidence}
                  </div>

                  <p className="text-xs text-[#5E605E] leading-relaxed">{item.interpretation}</p>

                  <div className="pt-2 border-t border-[#E5E3DB] font-mono text-[11px] text-[#090A0A] font-semibold">
                    Suggested Adjustment: {item.suggested_action}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 3: PARTICIPATION TRENDS & STRENGTHS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cohort Trends */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#315CFF]" />
              <h3 className="font-bold text-base text-[#090A0A]">
                Cohort & Intake Trends
              </h3>
            </div>

            {trends.length === 0 ? (
              <div className="p-8 border border-[#E5E3DB] bg-[#FAFAF7] text-center font-mono text-xs text-[#8A8A82]">
                Additional responses will yield multi-cohort timing trends.
              </div>
            ) : (
              <div className="space-y-4">
                {trends.map((item) => (
                  <div key={item.id} className="border border-[#E5E3DB] bg-[#FAFAF7] p-5 space-y-3 shadow-sm">
                    <h4 className="font-bold text-sm text-[#090A0A]">{item.title}</h4>
                    <div className="text-xs text-[#090A0A] font-medium">{item.finding}</div>
                    <div className="text-xs text-[#5E605E] bg-[#F2EFE9] p-2.5 font-mono">
                      Evidence: {item.evidence}
                    </div>
                    <p className="text-xs text-[#5E605E] leading-relaxed">{item.interpretation}</p>
                    <div className="font-mono text-[11px] text-[#315CFF]">
                      Next Step: {item.suggested_action}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Operational Strengths */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <h3 className="font-bold text-base text-[#090A0A]">
                Strengths & Dominant Traction
              </h3>
            </div>

            {strengths.length === 0 ? (
              <div className="p-8 border border-[#E5E3DB] bg-[#FAFAF7] text-center font-mono text-xs text-[#8A8A82]">
                Awaiting responses to benchmark top performer categories.
              </div>
            ) : (
              <div className="space-y-4">
                {strengths.map((item) => (
                  <div key={item.id} className="border border-[#E5E3DB] bg-[#FAFAF7] p-5 space-y-3 shadow-sm">
                    <h4 className="font-bold text-sm text-[#090A0A]">{item.title}</h4>
                    <div className="text-xs text-[#090A0A] font-medium">{item.finding}</div>
                    <div className="text-xs text-emerald-900 bg-emerald-50 p-2.5 font-mono border border-emerald-200">
                      Evidence: {item.evidence}
                    </div>
                    <p className="text-xs text-[#5E605E] leading-relaxed">{item.interpretation}</p>
                    <div className="font-mono text-[11px] text-emerald-700 font-semibold">
                      Recommendation: {item.suggested_action}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4: STRATEGIC RECOMMENDATIONS */}
        {recommendations.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#315CFF]" />
              <h2 className="text-base font-bold text-[#090A0A] tracking-tight">
                Operational Recommendations
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((item) => (
                <div key={item.id} className="border border-[#E5E3DB] bg-[#FAFAF7] p-5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#E5E3DB] pb-2 font-mono text-[10px]">
                    <span className="uppercase px-2 py-0.5 bg-[#E0F2FE] text-[#0369A1] font-bold">
                      RECOMMENDED ACTION
                    </span>
                    <span className="text-[#8A8A82]">DECISION FRAMEWORK</span>
                  </div>

                  <h3 className="font-bold text-sm text-[#090A0A]">{item.title}</h3>
                  <div className="text-xs text-[#090A0A]">{item.finding}</div>
                  <p className="text-xs text-[#5E605E] leading-relaxed">{item.interpretation}</p>
                  <div className="pt-2 border-t border-[#E5E3DB] font-mono text-xs text-[#315CFF] font-semibold">
                    → {item.suggested_action}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Executive Summary Benchmark Card */}
        <div className="border border-[#E5E3DB] bg-[#FAFAF7] p-6 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E5E3DB] pb-3">
            <h3 className="font-bold text-sm text-[#090A0A]">
              Deterministic Data Pipeline & Rationale
            </h3>
            <span className="font-mono text-xs text-[#5E605E]">
              100% Traceable to PostgreSQL Rows
            </span>
          </div>

          <div className="text-xs text-[#5E605E] leading-relaxed space-y-2 font-sans">
            <p>
              In accordance with FormIQ's Reliability Principle, all numerical statistics and percentages displayed across this intelligence layer are computed deterministically from verified PostgreSQL rows. The Gemini AI layer contextualizes these observations into operational insights, eliminating hallucinations and ensuring total data veracity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
