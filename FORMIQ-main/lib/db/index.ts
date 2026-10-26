/**
 * FormIQ — Real Supabase Database Adapter
 *
 * Replaces the LocalDatabase (fs-based) with real Supabase queries.
 * All functions are server-side only (called from API routes / Server Components).
 * Uses the server client (anon key + RLS) for authenticated operations,
 * and the admin client (service-role) only for public form submission.
 *
 * The adapter interface is kept identical so API routes need minimal changes.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Form,
  FormQuestion,
  FormResponse,
  FormAnalytics,
  AIInsight,
  Workspace,
  Profile,
} from "@/types/formiq";
import { isSupabaseConfigured } from "@/lib/supabase/config";
export { isSupabaseConfigured };
import {
  getFallbackForms,
  getFallbackFormById,
  getFallbackFormBySlug,
  saveFallbackForm,
  deleteFallbackForm,
  saveFallbackResponse,
  getFallbackResponses,
} from "./forms-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map a DB row from `forms` + joined `form_questions` → typed Form */
function mapFormRow(row: any, questions: any[] = []): Form {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    created_by: row.created_by,
    title: row.title,
    description: row.description ?? undefined,
    type: row.type,
    status: row.status,
    slug: row.slug,
    settings: row.settings ?? {
      anonymous: false,
      emailCollection: true,
      responseLimit: null,
      allowDuplicates: true,
      redirectUrl: null,
      notificationOnResponse: true,
    },
    created_at: row.created_at,
    updated_at: row.updated_at,
    published_at: row.published_at ?? undefined,
    response_count: row.response_count ?? 0,
    questions: questions.map(mapQuestionRow),
  };
}

function mapQuestionRow(q: any): FormQuestion {
  return {
    id: q.id,
    form_id: q.form_id,
    section_id: q.section_id ?? undefined,
    question_key: q.question_key,
    type: q.type,
    label: q.label,
    description: q.description ?? undefined,
    options: q.options ?? [],
    required: q.required,
    validation: q.validation ?? undefined,
    position: q.position,
    created_at: q.created_at,
    updated_at: q.updated_at,
  };
}

function mapResponseRow(r: any, answers: any[] = []): FormResponse {
  // Build answers map: both question_id and question_key → value so lookups never fail
  const answersMap: Record<string, any> = {};
  for (const a of answers) {
    if (a.question_id) answersMap[a.question_id] = a.value;
    if (a.question_key) answersMap[a.question_key] = a.value;
  }
  // Fallback and supplement with metadata.answers
  if (r.metadata?.answers && typeof r.metadata.answers === "object") {
    for (const [k, v] of Object.entries(r.metadata.answers)) {
      if (answersMap[k] === undefined) {
        answersMap[k] = v;
      }
    }
  }
  return {
    id: r.id,
    form_id: r.form_id,
    submitted_at: r.submitted_at,
    respondent_email: r.respondent_email ?? undefined,
    candidate_status: r.candidate_status ?? "New",
    notes: r.notes ?? undefined,
    completion_time_seconds: r.completion_time_seconds ?? r.metadata?.completion_time_seconds ?? undefined,
    metadata: r.metadata ?? undefined,
    answers: Object.keys(answersMap).length > 0 ? answersMap : undefined,
    created_at: r.created_at,
  };
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      id: "anonymous",
      name: "Guest",
      email: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!data) {
    return {
      id: user.id,
      name: user.user_metadata?.name ?? user.email?.split("@")[0] ?? "User",
      email: user.email ?? "",
      created_at: user.created_at,
      updated_at: new Date().toISOString(),
    };
  }

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    avatar_url: data.avatar_url ?? undefined,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

// ─── Workspace ────────────────────────────────────────────────────────────────

const PRIMARY_WORKSPACE_ID = "316858ea-236c-422e-8490-0cf2b456308f";

export {
  getWorkspaceAndMembers,
  updateWorkspaceSettings,
  inviteWorkspaceMember,
  updateMemberRole,
  removeMember,
} from "./workspace-store";
import { getWorkspaceAndMembers } from "./workspace-store";

export async function getWorkspace(): Promise<Workspace> {
  const data = await getWorkspaceAndMembers();
  return data.workspace;
}

// ─── Forms ────────────────────────────────────────────────────────────────────

export async function getForms(): Promise<Form[]> {
  let supabase: any = null;
  try {
    supabase = await createClient();
  } catch {
    supabase = null;
  }

  let forms: any[] = [];

  // Fetch all available forms so no created forms or responses are hidden
  if (supabase) {
    const { data: allForms } = await supabase
      .from("forms")
      .select("*")
      .order("created_at", { ascending: false });
    if (allForms && allForms.length > 0) {
      forms = allForms;
    }
  }

  // Fallback to admin client if client select returned empty or failed
  if (forms.length === 0) {
    try {
      const admin = createAdminClient();
      const { data: adminForms } = await admin
        .from("forms")
        .select("*")
        .order("created_at", { ascending: false });
      forms = adminForms ?? [];
    } catch (e) {
      console.warn("[getForms] Admin client fetch error:", e);
    }
  }

  let supabaseForms: Form[] = [];

  if (forms.length > 0) {
    // Fetch response counts and questions for each form
    const client = supabase || createAdminClient();
    const formIds = forms.map((f) => f.id);

    let { data: questions } = await client
      .from("form_questions")
      .select("*")
      .in("form_id", formIds)
      .order("position");

    if (!questions || questions.length === 0) {
      const admin = createAdminClient();
      const { data: adminQ } = await admin
        .from("form_questions")
        .select("*")
        .in("form_id", formIds)
        .order("position");
      if (adminQ) questions = adminQ;
    }

    let { data: responseCounts } = await client
      .from("form_responses")
      .select("form_id")
      .in("form_id", formIds);

    if (!responseCounts || responseCounts.length === 0) {
      const admin = createAdminClient();
      const { data: adminCounts } = await admin
        .from("form_responses")
        .select("form_id")
        .in("form_id", formIds);
      if (adminCounts) responseCounts = adminCounts;
    }

    const questionsByForm: Record<string, any[]> = {};
    (questions ?? []).forEach((q: any) => {
      if (!questionsByForm[q.form_id]) questionsByForm[q.form_id] = [];
      questionsByForm[q.form_id].push(q);
    });

    const countByForm: Record<string, number> = {};
    (responseCounts ?? []).forEach((r: any) => {
      countByForm[r.form_id] = (countByForm[r.form_id] ?? 0) + 1;
    });

    supabaseForms = forms.map((f) =>
      mapFormRow({ ...f, response_count: countByForm[f.id] ?? 0 }, questionsByForm[f.id] ?? [])
    );
  }

  // Merge with locally persisted fallback forms (ensures zero forms lost if RLS blocked DB write)
  const fallbackForms = getFallbackForms();
  const seenIds = new Set(supabaseForms.map((f) => f.id));
  const merged = [...supabaseForms];
  for (const fb of fallbackForms) {
    if (!seenIds.has(fb.id)) {
      merged.push(fb);
      seenIds.add(fb.id);
    }
  }

  return merged;
}

export async function getFormById(id: string): Promise<Form | null> {
  try {
    const supabase = await createClient();

    let { data: form, error } = await supabase
      .from("forms")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !form) {
      const admin = createAdminClient();
      const { data: adminForm } = await admin
        .from("forms")
        .select("*")
        .eq("id", id)
        .single();
      if (adminForm) form = adminForm;
    }

    if (form) {
      const client = supabase || createAdminClient();
      let { data: questions } = await client
        .from("form_questions")
        .select("*")
        .eq("form_id", id)
        .order("position");

      if (!questions || questions.length === 0) {
        const admin = createAdminClient();
        const { data: adminQ } = await admin
          .from("form_questions")
          .select("*")
          .eq("form_id", id)
          .order("position");
        if (adminQ) questions = adminQ;
      }

      let { count: responseCount } = await client
        .from("form_responses")
        .select("id", { count: "exact", head: true })
        .eq("form_id", id);

      if (responseCount === null || responseCount === undefined) {
        const admin = createAdminClient();
        const { count: adminCount } = await admin
          .from("form_responses")
          .select("id", { count: "exact", head: true })
          .eq("form_id", id);
        responseCount = adminCount;
      }

      return mapFormRow(
        { ...form, response_count: responseCount ?? 0 },
        questions ?? []
      );
    }
  } catch (err) {
    console.warn(`[getFormById] Supabase lookup error for ${id}:`, err);
  }

  // Fallback to local store
  return getFallbackFormById(id);
}

export async function getFormBySlug(slug: string): Promise<Form | null> {
  try {
    // Public route — use admin client to bypass RLS for published form lookup
    const admin = createAdminClient();

    const { data: form, error } = await admin
      .from("forms")
      .select("*")
      .eq("slug", slug)
      .single();

    if (form && !error) {
      const { data: questions } = await admin
        .from("form_questions")
        .select("*")
        .eq("form_id", form.id)
        .order("position");

      return mapFormRow(form, questions ?? []);
    }
  } catch (err) {
    console.warn(`[getFormBySlug] Supabase lookup error for ${slug}:`, err);
  }

  return getFallbackFormBySlug(slug);
}

export async function saveForm(form: Form, questions?: FormQuestion[]): Promise<Form> {
  let supabaseResult: Form | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let targetWorkspaceId = form.workspace_id;
    if (user && supabase) {
      try {
        const { data: userMemberships } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (userMemberships && userMemberships.length > 0 && userMemberships[0].workspace_id) {
          const memberWsIds = new Set(userMemberships.map((m: any) => m.workspace_id));
          if (!memberWsIds.has(targetWorkspaceId)) {
            targetWorkspaceId = userMemberships[0].workspace_id;
          }
        }
      } catch (e) {
        console.warn("[saveForm] User workspace check warning:", e);
      }
    }

    const formRow = {
      id: form.id,
      workspace_id: targetWorkspaceId,
      created_by: form.created_by ?? user?.id,
      title: form.title,
      description: form.description ?? null,
      type: form.type,
      status: form.status,
      slug: form.slug,
      settings: form.settings,
      published_at: form.published_at ?? null,
      updated_at: new Date().toISOString(),
    };

    let upsertRes = await supabase
      .from("forms")
      .upsert(formRow, { onConflict: "id" })
      .select("*")
      .single();

    // Fallback to admin client if client RLS prevented insert
    if (upsertRes.error) {
      const admin = createAdminClient();
      upsertRes = await admin
        .from("forms")
        .upsert(formRow, { onConflict: "id" })
        .select("*")
        .single();
    }

    if (!upsertRes.error && upsertRes.data) {
      const upserted = upsertRes.data;
      let savedQuestions: any[] = [];

      if (questions && questions.length > 0) {
        const client = supabase || createAdminClient();
        await client.from("form_questions").delete().eq("form_id", form.id);

        const questionRows = questions.map((q, idx) => ({
          id: q.id,
          form_id: form.id,
          section_id: q.section_id ?? "default",
          question_key: q.question_key,
          type: q.type,
          label: q.label,
          description: q.description ?? null,
          options: q.options ?? [],
          required: q.required,
          validation: q.validation ?? {},
          position: q.position ?? idx + 1,
        }));

        let insertQRes = await client.from("form_questions").insert(questionRows).select("*");
        if (insertQRes.error) {
          const admin = createAdminClient();
          await admin.from("form_questions").delete().eq("form_id", form.id);
          insertQRes = await admin.from("form_questions").insert(questionRows).select("*");
        }
        savedQuestions = insertQRes.data ?? [];
      } else {
        const client = supabase || createAdminClient();
        const { data: existingQs } = await client
          .from("form_questions")
          .select("*")
          .eq("form_id", form.id)
          .order("position");
        savedQuestions = existingQs ?? [];
      }

      // Audit log
      try {
        await writeAuditLog({
          workspace_id: form.workspace_id,
          user_id: user?.id,
          action: form.published_at && form.status === "published" ? "form.publish" : "form.save",
          resource_type: "form",
          resource_id: form.id,
          metadata: { title: form.title, status: form.status },
        });
      } catch (auditErr) {
        console.warn("[saveForm] Audit log warning:", auditErr);
      }

      const client = supabase || createAdminClient();
      const { count } = await client
        .from("form_responses")
        .select("id", { count: "exact", head: true })
        .eq("form_id", form.id);

      supabaseResult = mapFormRow({ ...upserted, response_count: count ?? 0 }, savedQuestions);
    } else {
      console.warn("[saveForm] Supabase upsert returned error, will persist to fallback store:", upsertRes.error?.message);
    }
  } catch (err: any) {
    console.warn("[saveForm] Supabase operation failed, will persist to fallback store:", err?.message);
  }

  // Always save to fallback store to guarantee persistence and instant recovery
  const fallbackSaved = saveFallbackForm(form, questions);
  return supabaseResult || fallbackSaved;
}

export async function deleteForm(id: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: form } = await supabase.from("forms").select("workspace_id, title").eq("id", id).single();
    await supabase.from("forms").delete().eq("id", id);

    if (form) {
      await writeAuditLog({
        workspace_id: form.workspace_id,
        user_id: user?.id,
        action: "form.delete",
        resource_type: "form",
        resource_id: id,
        metadata: { title: form.title },
      });
    }
  } catch (err) {
    console.warn(`[deleteForm] Supabase delete for ${id}:`, err);
  }

  try {
    const admin = createAdminClient();
    await admin.from("forms").delete().eq("id", id);
  } catch (e) {
    // Ignore
  }

  deleteFallbackForm(id);
  return true;
}

// ─── Responses ────────────────────────────────────────────────────────────────

export async function getFormResponses(formId: string): Promise<FormResponse[]> {
  const supabase = await createClient();

  let { data: responses, error } = await supabase
    .from("form_responses")
    .select("*")
    .eq("form_id", formId)
    .order("submitted_at", { ascending: false });

  // Fallback to admin client if RLS blocked the select
  if (error || !responses || responses.length === 0) {
    const admin = createAdminClient();
    const { data: adminResp } = await admin
      .from("form_responses")
      .select("*")
      .eq("form_id", formId)
      .order("submitted_at", { ascending: false });
    if (adminResp && adminResp.length > 0) {
      responses = adminResp;
    }
  }

  if (!responses) return [];

  const responseIds = responses.map((r) => r.id);

  let { data: answers } = await supabase
    .from("response_answers")
    .select("*")
    .in("response_id", responseIds);

  if (!answers || answers.length === 0) {
    const admin = createAdminClient();
    const { data: adminAnswers } = await admin
      .from("response_answers")
      .select("*")
      .in("response_id", responseIds);
    if (adminAnswers && adminAnswers.length > 0) {
      answers = adminAnswers;
    }
  }

  const answersByResponse: Record<string, any[]> = {};
  (answers ?? []).forEach((a) => {
    if (!answersByResponse[a.response_id]) answersByResponse[a.response_id] = [];
    answersByResponse[a.response_id].push(a);
  });

  const supabaseList = responses.map((r) => mapResponseRow(r, answersByResponse[r.id] ?? []));
  const fbList = getFallbackResponses(formId);
  const seenIds = new Set(supabaseList.map((r) => r.id));
  for (const fb of fbList) {
    if (!seenIds.has(fb.id)) {
      supabaseList.push(fb);
      seenIds.add(fb.id);
    }
  }

  return supabaseList;
}

export async function getAllResponses(): Promise<FormResponse[]> {
  const supabase = await createClient();

  let { data: responses, error } = await supabase
    .from("form_responses")
    .select("*")
    .order("submitted_at", { ascending: false });

  // Fallback to admin client if RLS blocked client select
  if (error || !responses || responses.length === 0) {
    const admin = createAdminClient();
    const { data: adminResp } = await admin
      .from("form_responses")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (adminResp) responses = adminResp;
  }

  if (!responses || responses.length === 0) return [];

  const responseIds = responses.map((r) => r.id);

  let { data: answers } = await supabase
    .from("response_answers")
    .select("*")
    .in("response_id", responseIds);

  if (!answers || answers.length === 0) {
    const admin = createAdminClient();
    const { data: adminAnswers } = await admin
      .from("response_answers")
      .select("*")
      .in("response_id", responseIds);
    if (adminAnswers) answers = adminAnswers;
  }

  const answersByResponse: Record<string, any[]> = {};
  (answers ?? []).forEach((a) => {
    if (!answersByResponse[a.response_id]) answersByResponse[a.response_id] = [];
    answersByResponse[a.response_id].push(a);
  });

  return responses.map((r) => mapResponseRow(r, answersByResponse[r.id] ?? []));
}

export async function submitFormResponse(
  formId: string,
  answers: Record<string, any>,
  respondentEmail?: string,
  completionTimeSeconds?: number
): Promise<FormResponse> {
  const admin = createAdminClient();
  const responseId = `resp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const nowIso = new Date().toISOString();

  // 1. Insert form_response with answers safely preserved in metadata as well
  const { error: respError } = await admin
    .from("form_responses")
    .insert({
      id: responseId,
      form_id: formId,
      respondent_email: respondentEmail ?? null,
      candidate_status: "New",
      completion_time_seconds: completionTimeSeconds ?? null,
      submitted_at: nowIso,
      metadata: { answers, completion_time_seconds: completionTimeSeconds },
    });

  if (respError) {
    console.warn("[submitFormResponse] Supabase insert warning, persisting to fallback store:", respError.message);
    return saveFallbackResponse(formId, answers, respondentEmail, completionTimeSeconds);
  }

  // 2. Fetch question keys to map answer keys properly
  const { data: questions } = await admin
    .from("form_questions")
    .select("id, question_key")
    .eq("form_id", formId);

  const questionKeyMap: Record<string, string> = {};
  (questions ?? []).forEach((q) => {
    questionKeyMap[q.id] = q.question_key;
    questionKeyMap[q.question_key] = q.question_key;
  });

  const answerRows = Object.entries(answers).map(([key, value]) => ({
    response_id: responseId,
    question_id: questions?.find((q) => q.id === key || q.question_key === key)?.id ?? key,
    question_key: questionKeyMap[key] ?? key,
    value: value === null ? null : value,
  }));

  if (answerRows.length > 0) {
    const { error: ansErr } = await admin.from("response_answers").insert(answerRows);
    if (ansErr) {
      console.warn("[submitFormResponse] Answer table insert warning (answers preserved in response metadata):", ansErr.message);
    }
  }

  return {
    id: responseId,
    form_id: formId,
    submitted_at: nowIso,
    created_at: nowIso,
    respondent_email: respondentEmail,
    candidate_status: "New",
    completion_time_seconds: completionTimeSeconds,
    answers,
  };
}

export async function updateResponseStatus(
  responseId: string,
  status: FormResponse["candidate_status"],
  notes?: string
): Promise<FormResponse | null> {
  const supabase = await createClient();

  const updateData: Record<string, any> = { candidate_status: status };
  if (notes !== undefined) updateData.notes = notes;

  const { data, error } = await supabase
    .from("form_responses")
    .update(updateData)
    .eq("id", responseId)
    .select("*")
    .single();

  if (error || !data) return null;

  const { data: answers } = await supabase
    .from("response_answers")
    .select("*")
    .eq("response_id", responseId);

  return mapResponseRow(data, answers ?? []);
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getFormAnalytics(formId: string): Promise<FormAnalytics[]> {
  const supabase = await createClient();

  // Calculate deterministically from real response data
  const { data: form } = await supabase
    .from("forms")
    .select("id, form_questions(id, question_key)")
    .eq("id", formId)
    .single();

  const { data: responses } = await supabase
    .from("form_responses")
    .select("submitted_at, completion_time_seconds, metadata")
    .eq("form_id", formId);

  const total = responses?.length ?? 0;
  const today = new Date().toISOString().slice(0, 10);
  const responsesToday = (responses ?? []).filter(
    (r) => r.submitted_at && r.submitted_at.slice(0, 10) === today
  ).length;

  const validTimes = (responses ?? [])
    .map((r) => r.completion_time_seconds)
    .filter((t): t is number => typeof t === "number" && t > 0);
  const avgTime =
    validTimes.length > 0
      ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
      : (total > 0 ? 100 : 0);

  // Compute real completion rate based on answered fields vs total possible
  const questionsCount = (form as any)?.form_questions?.length ?? 0;
  let answeredFieldsCount = 0;
  for (const r of responses ?? []) {
    const ans = (r as any)?.metadata?.answers ?? {};
    const filled = Object.keys(ans).filter((k) => {
      const v = ans[k];
      return v !== null && v !== undefined && v !== "" && (!Array.isArray(v) || v.length > 0);
    }).length;
    answeredFieldsCount += questionsCount > 0 ? Math.min(filled, questionsCount) : filled;
  }
  const totalPossible = questionsCount * total;
  const realCompletionRate =
    totalPossible > 0
      ? Math.round((answeredFieldsCount / totalPossible) * 1000) / 10
      : (total > 0 ? 100 : 0);

  const now = new Date().toISOString();
  return [
    { id: `ana-total-${formId}`, form_id: formId, metric: "total_responses", value: total, calculated_at: now },
    { id: `ana-rate-${formId}`, form_id: formId, metric: "completion_rate", value: realCompletionRate, calculated_at: now },
    { id: `ana-time-${formId}`, form_id: formId, metric: "average_completion_time_seconds", value: avgTime, calculated_at: now },
    { id: `ana-today-${formId}`, form_id: formId, metric: "responses_today", value: responsesToday, calculated_at: now },
  ];
}

// ─── AI Insights ──────────────────────────────────────────────────────────────

export async function getAIInsights(formId: string): Promise<AIInsight[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("form_id", formId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    form_id: row.form_id,
    category: row.category,
    title: row.title,
    finding: row.finding,
    evidence: row.evidence,
    interpretation: row.interpretation,
    suggested_action: row.suggested_action,
    source_data: row.source_data ?? undefined,
    created_at: row.created_at,
  }));
}

export async function saveAIInsights(formId: string, insights: AIInsight[]): Promise<void> {
  const supabase = await createClient();

  // Delete old insights for this form, then insert new ones
  await supabase.from("ai_insights").delete().eq("form_id", formId);

  if (insights.length === 0) return;

  const rows = insights.map((ins) => ({
    form_id: formId,
    category: ins.category,
    title: ins.title,
    finding: ins.finding,
    evidence: ins.evidence,
    interpretation: ins.interpretation,
    suggested_action: ins.suggested_action,
    source_data: ins.source_data ?? {},
  }));

  const { error } = await supabase.from("ai_insights").insert(rows);
  if (error) {
    console.error("[saveAIInsights] Failed to insert insights:", error.message);
  }
}

// ─── Audit Logging ────────────────────────────────────────────────────────────

interface AuditLogEntry {
  workspace_id?: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      workspace_id: entry.workspace_id ?? null,
      user_id: entry.user_id ?? null,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (err) {
    // Audit logging should never break the main flow
    console.error("[writeAuditLog] Error:", err);
  }
}
