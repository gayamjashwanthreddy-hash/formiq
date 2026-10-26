export type QuestionType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "number"
  | "select"
  | "radio"
  | "multiselect"
  | "checkbox"
  | "rating"
  | "date"
  | "time"
  | "file";

export type FormType =
  | "recruitment"
  | "registration"
  | "feedback"
  | "survey"
  | "research"
  | "application"
  | "assessment"
  | "lead"
  | "internal"
  | "general";

export type FormStatus = "draft" | "published" | "paused" | "closed";

export type WorkspaceRole = "Owner" | "Editor" | "Analyst" | "Viewer";

export type CandidateStatus =
  | "New"
  | "Under Review"
  | "Shortlisted"
  | "Interview"
  | "Selected"
  | "Rejected";

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
}

export interface ValidationRule {
  min?: number;
  max?: number;
  pattern?: string;
  allowedExtensions?: string[];
  maxFileSizeMb?: number;
}

export interface FormQuestion {
  id: string;
  form_id: string;
  section_id?: string;
  question_key: string;
  type: QuestionType;
  label: string;
  description?: string;
  options?: QuestionOption[];
  required: boolean;
  validation?: ValidationRule;
  position: number;
  created_at?: string;
  updated_at?: string;
}

export type LogicOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "is_empty"
  | "is_not_empty";

export type LogicAction = "show" | "hide" | "require" | "skip_to";

export interface FormLogic {
  id: string;
  form_id: string;
  source_question_id: string;
  operator: LogicOperator;
  value?: string;
  target_question_id: string;
  action: LogicAction;
  created_at?: string;
}

export interface FormSettings {
  anonymous: boolean;
  emailCollection: boolean;
  responseLimit: number | null;
  allowDuplicates: boolean;
  redirectUrl: string | null;
  notificationOnResponse: boolean;
  themeColor?: string;
  customThankYouTitle?: string;
  customThankYouMessage?: string;
}

export interface Form {
  id: string;
  workspace_id: string;
  created_by?: string;
  title: string;
  description?: string;
  type: FormType;
  status: FormStatus;
  slug: string;
  settings: FormSettings;
  created_at: string;
  updated_at: string;
  published_at?: string;
  questions?: FormQuestion[];
  logic?: FormLogic[];
  response_count?: number;
}

export interface ResponseAnswer {
  id: string;
  response_id: string;
  question_id: string;
  question_key: string;
  value: string | number | boolean | string[] | Record<string, unknown> | null;
  created_at?: string;
}

export interface FormResponse {
  id: string;
  form_id: string;
  submitted_at: string;
  respondent_email?: string;
  candidate_status?: CandidateStatus;
  notes?: string;
  completion_time_seconds?: number;
  metadata?: Record<string, unknown>;
  answers?: Record<string, any>; // question_id -> value
  created_at: string;
}

export interface FormAnalytics {
  id: string;
  form_id: string;
  metric: string;
  value: any;
  calculated_at: string;
}

export type InsightCategory =
  | "key_finding"
  | "trend"
  | "strength"
  | "gap"
  | "area_requiring_attention"
  | "recommendation"
  | "outlier";

export interface AIInsight {
  id: string;
  form_id: string;
  category: InsightCategory;
  title: string;
  finding: string;
  evidence: string;
  interpretation: string;
  suggested_action: string;
  source_data?: Record<string, unknown>;
  created_at: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id?: string;
  created_at: string;
  role?: WorkspaceRole;
}

export interface WorkspaceMemberInfo {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  status: "Active" | "Pending";
  created_at: string;
  isCurrentUser?: boolean;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  workspace_id?: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  workspace_id?: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface TemplateDefinition {
  id: string;
  title: string;
  category: string;
  type: FormType;
  description: string;
  prompt: string;
  suggestedQuestions: Array<{
    label: string;
    type: QuestionType;
    required: boolean;
    options?: string[];
  }>;
}
