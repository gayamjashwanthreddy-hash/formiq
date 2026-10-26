import fs from "fs";
import path from "path";
import os from "os";
import { Form, FormQuestion, FormResponse } from "@/types/formiq";

const FORMS_STORE_PATH = process.env.VERCEL
  ? path.join(os.tmpdir(), "formiq_local_forms.json")
  : path.join(process.cwd(), ".formiq_data", "formiq_local_forms.json");

interface LocalFormsState {
  forms: Form[];
  questions: FormQuestion[];
  responses: FormResponse[];
}

let memoryState: LocalFormsState | null = null;

function loadLocalState(): LocalFormsState {
  if (memoryState) return memoryState;

  try {
    if (fs.existsSync(FORMS_STORE_PATH)) {
      const raw = fs.readFileSync(FORMS_STORE_PATH, "utf8");
      memoryState = JSON.parse(raw);
      return memoryState!;
    }
  } catch (err) {
    console.warn("[LocalFormsStore] Could not read local forms store, starting empty in memory:", err);
  }

  const defaultState: LocalFormsState = {
    forms: [],
    questions: [],
    responses: [],
  };
  memoryState = defaultState;
  return defaultState;
}

function persistLocalState(state: LocalFormsState): void {
  memoryState = state;
  try {
    const dir = path.dirname(FORMS_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(FORMS_STORE_PATH, JSON.stringify(state, null, 2), "utf8");
  } catch (err) {
    console.warn("[LocalFormsStore] Could not write to disk, holding in memory:", err);
  }
}

export function getFallbackForms(): Form[] {
  const state = loadLocalState();
  return state.forms.map((f) => {
    const questions = state.questions
      .filter((q) => q.form_id === f.id)
      .sort((a, b) => a.position - b.position);
    const respCount = state.responses.filter((r) => r.form_id === f.id).length;
    return {
      ...f,
      questions,
      response_count: (f.response_count || 0) + respCount,
    };
  });
}

export function getFallbackFormById(id: string): Form | null {
  const state = loadLocalState();
  const form = state.forms.find((f) => f.id === id);
  if (!form) return null;

  const questions = state.questions
    .filter((q) => q.form_id === id)
    .sort((a, b) => a.position - b.position);
  const respCount = state.responses.filter((r) => r.form_id === id).length;

  return {
    ...form,
    questions,
    response_count: (form.response_count || 0) + respCount,
  };
}

export function getFallbackFormBySlug(slug: string): Form | null {
  const state = loadLocalState();
  const form = state.forms.find((f) => f.slug === slug);
  if (!form) return null;

  const questions = state.questions
    .filter((q) => q.form_id === form.id)
    .sort((a, b) => a.position - b.position);
  const respCount = state.responses.filter((r) => r.form_id === form.id).length;

  return {
    ...form,
    questions,
    response_count: (form.response_count || 0) + respCount,
  };
}

export function saveFallbackForm(form: Form, questions?: FormQuestion[]): Form {
  const state = loadLocalState();
  const now = new Date().toISOString();

  const updatedForm: Form = {
    ...form,
    updated_at: now,
  };

  const formIndex = state.forms.findIndex((f) => f.id === form.id);
  if (formIndex >= 0) {
    state.forms[formIndex] = updatedForm;
  } else {
    state.forms.unshift(updatedForm);
  }

  if (questions && questions.length > 0) {
    state.questions = state.questions.filter((q) => q.form_id !== form.id);
    state.questions.push(...questions);
  }

  persistLocalState(state);

  return getFallbackFormById(form.id)!;
}

export function deleteFallbackForm(id: string): boolean {
  const state = loadLocalState();
  state.forms = state.forms.filter((f) => f.id !== id);
  state.questions = state.questions.filter((q) => q.form_id !== id);
  state.responses = state.responses.filter((r) => r.form_id !== id);
  persistLocalState(state);
  return true;
}

export function saveFallbackResponse(
  formId: string,
  answers: Record<string, any>,
  respondentEmail?: string,
  completionTimeSeconds?: number
): FormResponse {
  const state = loadLocalState();
  const nowIso = new Date().toISOString();
  const responseId = `resp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const newResp: FormResponse = {
    id: responseId,
    form_id: formId,
    submitted_at: nowIso,
    created_at: nowIso,
    respondent_email: respondentEmail,
    candidate_status: "New",
    completion_time_seconds: completionTimeSeconds || 120,
    answers,
    metadata: { answers, completion_time_seconds: completionTimeSeconds },
  };

  state.responses.unshift(newResp);

  const form = state.forms.find((f) => f.id === formId);
  if (form) {
    form.response_count = (form.response_count || 0) + 1;
  }

  persistLocalState(state);
  return newResp;
}

export function getFallbackResponses(formId: string): FormResponse[] {
  const state = loadLocalState();
  return state.responses
    .filter((r) => r.form_id === formId)
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
}
