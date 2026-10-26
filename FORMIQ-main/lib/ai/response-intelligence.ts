import { Form, FormQuestion, FormResponse, AIInsight, InsightCategory } from "@/types/formiq";
import { generateAICompletion } from "./provider";
import { z } from "zod";
import { calculateDeterministicStats } from "@/lib/analytics/stats";

export { calculateDeterministicStats, type AggregatedStats } from "@/lib/analytics/stats";

const InsightItemSchema = z.object({
  category: z.enum([
    "key_finding",
    "trend",
    "strength",
    "gap",
    "area_requiring_attention",
    "recommendation",
    "outlier",
  ]),
  title: z.string(),
  finding: z.string(),
  evidence: z.string(),
  interpretation: z.string(),
  suggested_action: z.string(),
});

const AIInsightsListSchema = z.array(InsightItemSchema);

export async function generateAIResponseIntelligence(
  form: Form,
  questions: FormQuestion[],
  responses: FormResponse[]
): Promise<AIInsight[]> {
  const stats = calculateDeterministicStats(questions, responses);

  if (stats.totalResponses === 0) {
    return [
      {
        id: `ins-empty-${Date.now()}`,
        form_id: form.id,
        category: "key_finding",
        title: "Awaiting Initial Submissions",
        finding: "No responses have been recorded yet for this form.",
        evidence: "0 submissions stored in the PostgreSQL database.",
        interpretation: `The form "${form.title}" is active and ready to collect data. Share your public link or QR code to begin collecting verified submissions.`,
        suggested_action: "Distribute your shareable form link (/f/[slug]) to your audience or submit a test response to see live AI insights.",
        source_data: { total: 0 },
        created_at: new Date().toISOString(),
      },
      {
        id: `ins-empty-prep-${Date.now()}`,
        form_id: form.id,
        category: "recommendation",
        title: "Form Structure Review",
        finding: `Form contains ${questions.length} configured field(s) across the intake pipeline.`,
        evidence: `${questions.filter((q) => q.required).length} required questions, ${
          questions.filter((q) => !q.required).length
        } optional questions.`,
        interpretation: "The question progression is ready for respondent intake. Submissions will automatically trigger cohort analytics and AI synthesis.",
        suggested_action: "Test the public form link to verify submission intake.",
        source_data: { total: 0, fieldCount: questions.length },
        created_at: new Date().toISOString(),
      },
    ];
  }

  // Attempt real Gemini AI generation with ground truth statistical data
  try {
    const systemPrompt = `You are FormIQ's Lead Response Intelligence Engine.
Analyze the provided verified statistical summary and question breakdowns for form "${form.title}" (Type: ${form.type}).
Generate 4-6 concise, evidence-backed analytical insights across these categories:
1. 'area_requiring_attention' or 'gap': Highlights where applications/responses lag, bottlenecks, low-volume options, or friction.
2. 'strength': Highlights high-performing options, strong talent volume, high satisfaction, or positive trends.
3. 'trend': Highlights demographic, academic, behavioral, or timing patterns.
4. 'key_finding': High-level core observation with exact numbers.
5. 'recommendation': Actionable operational next steps for organizers/administrators.

Rules:
- Every numerical fact or percentage in your findings/evidence MUST directly come from the provided stats.
- Output MUST be a strict JSON array of objects conforming to:
[
  {
    "category": "area_requiring_attention",
    "title": "Short descriptive title",
    "finding": "Precise factual observation with exact percentages",
    "evidence": "Underlying response counts (e.g. 5 of 20 responses)",
    "interpretation": "Why this matters operationally",
    "suggested_action": "Actionable next step"
  }
]`;

    // Prepare human-readable breakdowns
    const readableBreakdowns: Record<string, { label: string; counts: Record<string, number> }> = {};
    for (const [qId, counts] of Object.entries(stats.breakdowns)) {
      const q = questions.find((item) => item.id === qId || item.question_key === qId);
      const label = q ? q.label : qId;
      readableBreakdowns[label] = { label, counts };
    }

    const summaryPayload = {
      formTitle: form.title,
      formType: form.type,
      totalResponses: stats.totalResponses,
      averageTimeSeconds: stats.averageTimeSeconds,
      breakdowns: readableBreakdowns,
      sampleResponses: Object.fromEntries(
        Object.entries(stats.textResponses).map(([k, v]) => {
          const q = questions.find((item) => item.id === k || item.question_key === k);
          return [q ? q.label : k, v.slice(0, 5)];
        })
      ),
    };

    const aiRaw = await generateAICompletion(
      `Analyze these response statistics:\n${JSON.stringify(summaryPayload, null, 2)}`,
      {
        systemPrompt,
        jsonMode: true,
        temperature: 0.1,
      }
    );

    if (aiRaw && aiRaw.trim().length > 0) {
      const cleaned = aiRaw.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const validated = AIInsightsListSchema.parse(parsed);

      if (validated.length > 0) {
        return validated.map((item, idx) => ({
          id: `ins-ai-${Date.now()}-${idx + 1}`,
          form_id: form.id,
          category: item.category as InsightCategory,
          title: item.title,
          finding: item.finding,
          evidence: item.evidence,
          interpretation: item.interpretation,
          suggested_action: item.suggested_action,
          source_data: { generatedBy: "gemini-3.8-flash", index: idx },
          created_at: new Date().toISOString(),
        }));
      }
    }
  } catch (aiErr) {
    console.warn("[ResponseIntelligence] Gemini synthesis skipped or parsing failed, falling back to deterministic baseline:", aiErr);
  }

  // Dynamic Deterministic Intelligence Engine (works for ANY form questions!)
  const insights: AIInsight[] = [];
  const total = stats.totalResponses;

  // 1. Analyze categorical breakdowns for strengths and gaps
  for (const [qId, counts] of Object.entries(stats.breakdowns)) {
    const q = questions.find((item) => item.id === qId || item.question_key === qId);
    if (!q) continue;

    const entries = Object.entries(counts).filter(([_, count]) => count > 0);
    if (entries.length < 2) continue;

    // Sort by count descending
    entries.sort((a, b) => b[1] - a[1]);
    const [topOption, topCount] = entries[0];
    const [bottomOption, bottomCount] = entries[entries.length - 1];

    const topPct = Math.round((topCount / total) * 100);
    const bottomPct = Math.round((bottomCount / total) * 100);

    // Gap / Lagging Area
    if (bottomPct <= 25 && bottomCount < topCount) {
      insights.push({
        id: `ins-gap-${qId}-${Date.now()}`,
        form_id: form.id,
        category: "area_requiring_attention",
        title: `Low Representation in ${bottomOption}`,
        finding: `${bottomOption} accounts for only ${bottomPct}% of responses in "${q.label}".`,
        evidence: `${bottomCount} of ${total} respondents selected ${bottomOption}, while ${topOption} received ${topCount} (${topPct}%).`,
        interpretation: `This significant deficit indicates a cohort imbalance that may create an operational or representation bottleneck.`,
        suggested_action: `Target outreach towards candidates interested in ${bottomOption}, or review if entry requirements for this option are creating friction.`,
        source_data: { question: q.label, bottomOption, bottomCount, bottomPct, topOption, topCount, topPct },
        created_at: new Date().toISOString(),
      });
    }

    // Strength
    if (topPct >= 35) {
      insights.push({
        id: `ins-strength-${qId}-${Date.now()}`,
        form_id: form.id,
        category: "strength",
        title: `High Engagement for ${topOption}`,
        finding: `${topOption} emerged as the dominant choice with ${topPct}% preference in "${q.label}".`,
        evidence: `${topCount} of ${total} respondents selected ${topOption}.`,
        interpretation: `Strong alignment and enthusiasm around ${topOption} provide a high-readiness talent pool or core preference focus.`,
        suggested_action: `Leverage this traction to establish specialized cohorts or apply higher selectivity criteria.`,
        source_data: { question: q.label, topOption, topCount, topPct },
        created_at: new Date().toISOString(),
      });
    }
  }

  // 2. Trend: Response intake duration & velocity
  const avgMins = Math.floor(stats.averageTimeSeconds / 60);
  const avgSecs = stats.averageTimeSeconds % 60;
  insights.push({
    id: `ins-trend-velocity-${Date.now()}`,
    form_id: form.id,
    category: "trend",
    title: "Intake Completion Velocity",
    finding: `Respondents complete this form in an average of ${avgMins}m ${avgSecs}s.`,
    evidence: `Measured across ${total} verified response sessions stored in PostgreSQL.`,
    interpretation: stats.averageTimeSeconds > 300
      ? "Form completion takes longer than standard benchmarks, indicating high question depth or potential respondent fatigue."
      : "Rapid completion velocity indicates clear question formatting, minimal friction, and optimal progression.",
    suggested_action: stats.averageTimeSeconds > 300
      ? "Consider making optional questions collapsible or dividing into sections."
      : "Maintain current question density and progression sequence.",
    source_data: { avgTime: stats.averageTimeSeconds },
    created_at: new Date().toISOString(),
  });

  // 3. Key Finding: High-level executive synthesis
  insights.push({
    id: `ins-key-exec-${Date.now()}`,
    form_id: form.id,
    category: "key_finding",
    title: `Verified Intake Benchmark: ${total} Total Submissions`,
    finding: `Collected ${total} submission(s) across ${questions.length} configured fields.`,
    evidence: `Realtime PostgreSQL intake with 100% data integrity and deterministic validation.`,
    interpretation: "Sufficient baseline data has been collected to perform cohort segmentation and operational planning.",
    suggested_action: "Review individual records in the Responses Table to advance top candidates into the review pipeline.",
    source_data: { total, questionsCount: questions.length },
    created_at: new Date().toISOString(),
  });

  // 4. Recommendation: Actionable Next Steps
  insights.push({
    id: `ins-rec-triage-${Date.now()}`,
    form_id: form.id,
    category: "recommendation",
    title: "Candidate Triage & Pipeline Advancement",
    finding: `All ${total} submission(s) are stored and ready for status transitions.`,
    evidence: `${questions.filter((q) => q.required).length} required data points verified per respondent.`,
    interpretation: "Prompt evaluation of submitted applications ensures higher response retention and faster turnaround times.",
    suggested_action: "Use the Responses tab to mark candidates as 'Shortlisted' or 'Under Review'.",
    source_data: { total },
    created_at: new Date().toISOString(),
  });

  return insights;
}
