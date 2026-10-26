import { FormQuestion, FormResponse } from "@/types/formiq";

export interface AggregatedStats {
  totalResponses: number;
  completionRate: number;
  fullCompletionRate: number;
  dropOffRate: number;
  fullyCompletedSubmissions: number;
  totalAnsweredFields: number;
  totalPossibleFields: number;
  averageTimeSeconds: number;
  breakdowns: Record<string, Record<string, number>>;
  textResponses: Record<string, string[]>;
  questionLabels: Record<string, string>;
}

function getOptionKey(opt: any): string {
  if (typeof opt === "string") return opt;
  if (opt && typeof opt === "object") {
    return String(opt.value !== undefined ? opt.value : (opt.label || ""));
  }
  return String(opt);
}

function isAnswered(val: any): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === "string") return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "number" || typeof val === "boolean") return true;
  if (typeof val === "object") return Object.keys(val).length > 0;
  return false;
}

export function calculateDeterministicStats(
  questions: FormQuestion[],
  responses: FormResponse[]
): AggregatedStats {
  const total = responses.length;
  const breakdowns: Record<string, Record<string, number>> = {};
  const textResponses: Record<string, string[]> = {};
  const questionLabels: Record<string, string> = {};

  const qMap: Record<string, FormQuestion> = {};

  // Initialize breakdown buckets for categorical & rating questions
  for (const q of questions) {
    qMap[q.id] = q;
    qMap[q.question_key] = q;
    questionLabels[q.id] = q.label;
    questionLabels[q.question_key] = q.label;

    if (["select", "radio", "multiselect", "checkbox", "rating"].includes(q.type)) {
      breakdowns[q.id] = {};
      if (q.options && Array.isArray(q.options)) {
        q.options.forEach((opt) => {
          const key = getOptionKey(opt);
          if (key) breakdowns[q.id][key] = 0;
        });
      }
    } else {
      textResponses[q.id] = [];
    }
  }

  let totalDuration = 0;
  let durationCount = 0;
  let totalAnsweredFields = 0;
  let fullyCompletedCount = 0;

  for (const resp of responses) {
    if (typeof resp.completion_time_seconds === "number" && resp.completion_time_seconds > 0) {
      totalDuration += resp.completion_time_seconds;
      durationCount++;
    }

    const answersObj = resp.answers && typeof resp.answers === "object" ? resp.answers : {};
    let answeredForThisResp = 0;

    for (const q of questions) {
      const val = answersObj[q.id] !== undefined ? answersObj[q.id] : answersObj[q.question_key];
      if (isAnswered(val)) {
        answeredForThisResp++;
      }
    }

    totalAnsweredFields += answeredForThisResp;
    if (questions.length > 0 && answeredForThisResp >= questions.length) {
      fullyCompletedCount++;
    }

    // Populate question-level breakdowns
    for (const [key, val] of Object.entries(answersObj)) {
      const q = qMap[key];
      if (!q) continue;

      if (breakdowns[q.id] !== undefined) {
        if (Array.isArray(val)) {
          val.forEach((item) => {
            const itemStr = String(item);
            breakdowns[q.id][itemStr] = (breakdowns[q.id][itemStr] || 0) + 1;
          });
        } else if (val !== null && val !== undefined && val !== "") {
          const valStr = String(val);
          breakdowns[q.id][valStr] = (breakdowns[q.id][valStr] || 0) + 1;
        }
      } else if (textResponses[q.id] !== undefined && typeof val === "string" && val.trim().length > 0) {
        textResponses[q.id].push(val);
      }
    }
  }

  const totalPossibleFields = questions.length * total;
  const completionRate =
    totalPossibleFields > 0
      ? Math.round((totalAnsweredFields / totalPossibleFields) * 1000) / 10
      : (total > 0 ? 100 : 0);

  const fullCompletionRate =
    total > 0 ? Math.round((fullyCompletedCount / total) * 1000) / 10 : 0;

  const dropOffRate = Math.max(0, Math.round((100 - completionRate) * 10) / 10);

  const avgTime =
    durationCount > 0
      ? Math.round(totalDuration / durationCount)
      : (total > 0 ? 100 : 0);

  return {
    totalResponses: total,
    completionRate,
    fullCompletionRate,
    dropOffRate,
    fullyCompletedSubmissions: fullyCompletedCount,
    totalAnsweredFields,
    totalPossibleFields,
    averageTimeSeconds: avgTime,
    breakdowns,
    textResponses,
    questionLabels,
  };
}
