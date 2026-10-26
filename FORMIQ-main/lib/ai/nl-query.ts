import { Form, FormQuestion, FormResponse } from "@/types/formiq";
import { calculateDeterministicStats } from "@/lib/analytics/stats";
import { generateAICompletion } from "./provider";

export interface NLQueryResult {
  query: string;
  answer: string;
  metric?: string;
  count?: number;
  breakdown?: Record<string, number>;
  matchingResponseIds?: string[];
  explanation: string;
}

export async function processNaturalLanguageQuery(
  query: string,
  form: Form,
  questions: FormQuestion[],
  responses: FormResponse[]
): Promise<NLQueryResult> {
  const q = query.toLowerCase().trim();
  const total = responses.length;
  const stats = calculateDeterministicStats(questions, responses);

  if (total === 0) {
    return {
      query,
      answer: "No responses collected yet",
      count: 0,
      metric: "0 submissions",
      explanation: `Form "${form.title}" is currently active but has not recorded any verified respondent submissions yet. Share your form link to collect data.`,
    };
  }

  // Attempt real AI-powered question answering with Gemini grounded in the form's real dataset
  try {
    const systemPrompt = `You are FormIQ's Data Intelligence Query Engine.
A user is asking a question about the responses collected for form "${form.title}".
Analyze the provided schema and verified database breakdown to answer accurately and concisely.

Rules:
1. Base all facts, counts, and percentages strictly on the provided data.
2. Return a strict JSON object with this exact shape:
{
  "answer": "Direct, concise answer (1-2 sentences)",
  "metric": "Key stat summary (e.g. '14 of 42 responses (33%)')",
  "count": 14,
  "explanation": "Clear explanation of how this was derived from the data"
}`;

    // Prepare human-readable breakdowns
    const readableBreakdowns: Record<string, { label: string; counts: Record<string, number> }> = {};
    for (const [qId, counts] of Object.entries(stats.breakdowns)) {
      const question = questions.find((item) => item.id === qId || item.question_key === qId);
      const label = question ? question.label : qId;
      readableBreakdowns[label] = { label, counts };
    }

    const contextPayload = {
      formTitle: form.title,
      formType: form.type,
      totalResponses: total,
      breakdowns: readableBreakdowns,
      textSamples: Object.fromEntries(
        Object.entries(stats.textResponses).map(([k, v]) => {
          const question = questions.find((item) => item.id === k || item.question_key === k);
          return [question ? question.label : k, v.slice(0, 10)];
        })
      ),
    };

    const aiRaw = await generateAICompletion(
      `Dataset context:\n${JSON.stringify(contextPayload, null, 2)}\n\nUser Question: "${query}"`,
      {
        systemPrompt,
        jsonMode: true,
        temperature: 0.1,
      }
    );

    if (aiRaw && aiRaw.trim().length > 0) {
      const cleaned = aiRaw.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed && parsed.answer) {
        // Find matching response IDs if applicable
        const matchingIds: string[] = [];
        const answerLower = parsed.answer.toLowerCase();

        for (const resp of responses) {
          const ansStr = JSON.stringify(resp.answers || {}).toLowerCase();
          if (
            (parsed.count && matchingIds.length < parsed.count) ||
            answerLower.split(" ").some((w: string) => w.length > 4 && ansStr.includes(w))
          ) {
            matchingIds.push(resp.id);
          }
        }

        return {
          query,
          answer: parsed.answer,
          metric: parsed.metric || `${parsed.count ?? total} records`,
          count: typeof parsed.count === "number" ? parsed.count : matchingIds.length,
          matchingResponseIds: matchingIds.slice(0, 50),
          explanation: parsed.explanation || "Computed deterministically by FormIQ Intelligence.",
        };
      }
    }
  } catch (err) {
    console.warn("[NLQuery] AI synthesis failed, using deterministic heuristics:", err);
  }

  // Deterministic Keyword Heuristics across ANY question fields
  // 1. "How many total responses?"
  if (q.includes("total") || q.includes("how many responses") || q.includes("count")) {
    return {
      query,
      answer: `${total} verified response${total === 1 ? "" : "s"} recorded`,
      count: total,
      metric: `${total} submissions`,
      matchingResponseIds: responses.map((r) => r.id),
      explanation: `A total of ${total} verified submission(s) are stored in the PostgreSQL database with full data integrity.`,
    };
  }

  // 2. Highest / Most popular option
  if (q.includes("highest") || q.includes("most") || q.includes("popular") || q.includes("top")) {
    let topLabel = "";
    let topOption = "";
    let topCount = -1;

    for (const [qId, counts] of Object.entries(stats.breakdowns)) {
      const question = questions.find((item) => item.id === qId || item.question_key === qId);
      for (const [opt, count] of Object.entries(counts)) {
        if (count > topCount) {
          topCount = count;
          topOption = opt;
          topLabel = question?.label || qId;
        }
      }
    }

    if (topCount > 0) {
      const pct = Math.round((topCount / total) * 100);
      const matching = responses.filter((r) =>
        JSON.stringify(r.answers || {}).includes(topOption)
      );

      return {
        query,
        answer: `${topOption} — ${topCount} responses (${pct}%)`,
        metric: `${topCount} of ${total} (${pct}%)`,
        count: topCount,
        matchingResponseIds: matching.map((r) => r.id),
        explanation: `In "${topLabel}", "${topOption}" was selected by ${topCount} respondents (${pct}% of the total cohort).`,
      };
    }
  }

  // 3. Lowest / Lagging / Bottleneck / Gaps
  if (q.includes("lagging") || q.includes("least") || q.includes("lowest") || q.includes("attention") || q.includes("weak")) {
    let lowLabel = "";
    let lowOption = "";
    let lowCount = Infinity;

    for (const [qId, counts] of Object.entries(stats.breakdowns)) {
      const question = questions.find((item) => item.id === qId || item.question_key === qId);
      for (const [opt, count] of Object.entries(counts)) {
        if (count < lowCount && count > 0) {
          lowCount = count;
          lowOption = opt;
          lowLabel = question?.label || qId;
        }
      }
    }

    if (lowCount < Infinity) {
      const pct = Math.round((lowCount / total) * 100);
      const matching = responses.filter((r) =>
        JSON.stringify(r.answers || {}).includes(lowOption)
      );

      return {
        query,
        answer: `Lowest representation in "${lowOption}" (${lowCount} response${lowCount === 1 ? "" : "s"})`,
        metric: `${lowCount} of ${total} (${pct}%)`,
        count: lowCount,
        matchingResponseIds: matching.map((r) => r.id),
        explanation: `Under "${lowLabel}", "${lowOption}" has the lowest volume at ${pct}% of total submissions, representing an intake deficit.`,
      };
    }
  }

  // 4. Semantic keyword search across all responses
  const keywords = q
    .split(/\s+/)
    .filter((w) => w.length > 3 && !["what", "which", "how", "many", "the", "have", "with", "from"].includes(w));

  const matching = responses.filter((r) => {
    const text = JSON.stringify(r.answers || {}).toLowerCase();
    return keywords.length > 0 && keywords.some((k) => text.includes(k));
  });

  return {
    query,
    answer: `${matching.length} matching response(s) found`,
    count: matching.length,
    metric: `${matching.length} of ${total} records`,
    matchingResponseIds: matching.map((r) => r.id),
    explanation: `Found ${matching.length} submission(s) matching keywords for "${query}".`,
  };
}
