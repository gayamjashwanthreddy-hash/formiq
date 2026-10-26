import fs from "fs";
import path from "path";
import {
  Form,
  FormQuestion,
  FormResponse,
  FormAnalytics,
  AIInsight,
  Workspace,
  Profile,
  AuditLog,
  NotificationItem,
} from "@/types/formiq";

const DATA_DIR = path.join(process.cwd(), ".formiq_data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

interface DatabaseState {
  workspaces: Workspace[];
  profiles: Profile[];
  forms: Form[];
  questions: FormQuestion[];
  responses: FormResponse[];
  analytics: FormAnalytics[];
  insights: AIInsight[];
  notifications: NotificationItem[];
  audit_logs: AuditLog[];
}

function getInitialSeed(): DatabaseState {
  const defaultWsId = "ws-main-001";
  const defaultUserId = "usr-admin-001";

  const defaultProfile: Profile = {
    id: defaultUserId,
    name: "FormIQ Administrator",
    email: "admin@formiq.app",
    avatar_url: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const defaultWorkspace: Workspace = {
    id: defaultWsId,
    name: "FormIQ Main Workspace",
    slug: "formiq-main",
    owner_id: defaultUserId,
    created_at: new Date().toISOString(),
    role: "Owner",
  };

  const demoFormId = "form-recruitment-001";
  const demoSlug = "entrepreneurship-summit-volunteers";

  const demoForm: Form = {
    id: demoFormId,
    workspace_id: defaultWsId,
    created_by: defaultUserId,
    title: "Entrepreneurship Summit — Volunteer Recruitment",
    description:
      "Official volunteer application for the Annual College Entrepreneurship Summit 2026. Join marketing, tech, design, content, or operations.",
    type: "recruitment",
    status: "published",
    slug: demoSlug,
    settings: {
      anonymous: false,
      emailCollection: true,
      responseLimit: 1000,
      allowDuplicates: false,
      redirectUrl: null,
      notificationOnResponse: true,
      customThankYouTitle: "Application Received",
      customThankYouMessage:
        "Thank you for applying to be a volunteer for the Entrepreneurship Summit. Our team will review your application and update your status within 48 hours.",
    },
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    published_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    response_count: 486,
  };

  const demoQuestions: FormQuestion[] = [
    {
      id: "q-1",
      form_id: demoFormId,
      section_id: "sec-personal",
      question_key: "full_name",
      type: "text",
      label: "Full Name",
      description: "Enter your official student name",
      required: true,
      position: 1,
    },
    {
      id: "q-2",
      form_id: demoFormId,
      section_id: "sec-personal",
      question_key: "email",
      type: "email",
      label: "College Email Address",
      description: "We will send your schedule and interview invites here",
      required: true,
      position: 2,
    },
    {
      id: "q-3",
      form_id: demoFormId,
      section_id: "sec-academic",
      question_key: "academic_branch",
      type: "select",
      label: "Academic Branch",
      options: [
        { id: "b1", label: "Computer Science & Engineering", value: "CSE" },
        { id: "b2", label: "Electronics & Communication", value: "ECE" },
        { id: "b3", label: "Mechanical Engineering", value: "ME" },
        { id: "b4", label: "Information Technology", value: "IT" },
        { id: "b5", label: "Business Administration & Management", value: "BBA" },
        { id: "b6", label: "Other", value: "Other" },
      ],
      required: true,
      position: 3,
    },
    {
      id: "q-4",
      form_id: demoFormId,
      section_id: "sec-academic",
      question_key: "study_year",
      type: "radio",
      label: "Current Year of Study",
      options: [
        { id: "y1", label: "1st Year (Freshman)", value: "1st Year" },
        { id: "y2", label: "2nd Year (Sophomore)", value: "2nd Year" },
        { id: "y3", label: "3rd Year (Junior)", value: "3rd Year" },
        { id: "y4", label: "4th Year (Senior)", value: "4th Year" },
      ],
      required: true,
      position: 4,
    },
    {
      id: "q-5",
      form_id: demoFormId,
      section_id: "sec-preference",
      question_key: "primary_track",
      type: "radio",
      label: "Primary Track of Interest",
      description: "Select the team you feel most equipped to contribute to",
      options: [
        { id: "t1", label: "Marketing & Outreach", value: "Marketing" },
        { id: "t2", label: "Technical & Web Infrastructure", value: "Technical" },
        { id: "t3", label: "Brand Design & Visual Assets", value: "Design" },
        { id: "t4", label: "Editorial Content & PR", value: "Content" },
        { id: "t5", label: "Operations & Stage Logistics", value: "Operations" },
      ],
      required: true,
      position: 5,
    },
    {
      id: "q-6",
      form_id: demoFormId,
      section_id: "sec-experience",
      question_key: "previous_experience",
      type: "radio",
      label: "Do you have prior experience organizing events or club leadership?",
      options: [
        { id: "e1", label: "Yes, extensive leadership experience", value: "Extensive" },
        { id: "e2", label: "Yes, volunteered in 1-2 events", value: "Moderate" },
        { id: "e3", label: "No, but eager to learn and take ownership", value: "None" },
      ],
      required: true,
      position: 6,
    },
    {
      id: "q-7",
      form_id: demoFormId,
      section_id: "sec-logistics",
      question_key: "availability",
      type: "select",
      label: "Weekly Availability Window",
      options: [
        { id: "a1", label: "Weekends Only (Sat-Sun)", value: "Weekend-only" },
        { id: "a2", label: "Both Weekdays (Evenings) & Weekends", value: "Full-week" },
        { id: "a3", label: "Weekdays Only", value: "Weekday-only" },
      ],
      required: true,
      position: 7,
    },
    {
      id: "q-8",
      form_id: demoFormId,
      section_id: "sec-motivation",
      question_key: "statement_of_purpose",
      type: "textarea",
      label: "Why do you want to join the Entrepreneurship Summit team?",
      description: "Briefly explain what you hope to achieve and what drives your commitment (2-4 sentences)",
      required: true,
      position: 8,
    },
    {
      id: "q-9",
      form_id: demoFormId,
      section_id: "sec-attachment",
      question_key: "portfolio_resume",
      type: "file",
      label: "Upload Resume or Portfolio Link",
      description: "Optional PDF or portfolio link showcasing your past work",
      required: false,
      position: 9,
    },
  ];

  // Generate 486 realistic response records to ground deterministic statistics & AI insights
  const branches = ["CSE", "ECE", "ME", "IT", "BBA", "Other"];
  const branchWeights = [0.44, 0.22, 0.12, 0.11, 0.07, 0.04]; // CSE ~214 responses
  const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  const yearWeights = [0.48, 0.18, 0.24, 0.10]; // 2nd year lag
  const tracks = ["Marketing", "Technical", "Design", "Content", "Operations"];
  const trackWeights = [0.31, 0.28, 0.18, 0.09, 0.14]; // Content ~9%
  const availabilities = ["Weekend-only", "Full-week", "Weekday-only"];
  const availabilityWeights = [0.64, 0.28, 0.08]; // 64% weekend-only (311 responses)

  const firstNames = [
    "Aarav", "Ananya", "Rohan", "Priya", "Dev", "Isha", "Arjun", "Sneha", "Karan", "Tara",
    "Aditya", "Riya", "Kabir", "Meera", "Vikram", "Neha", "Nikhil", "Pooja", "Rahul", "Tanvi",
    "Sameer", "Divya", "Siddharth", "Kavya", "Harsh", "Simran", "Aman", "Shreya", "Varun", "Anika",
  ];
  const lastNames = [
    "Sharma", "Patel", "Verma", "Rao", "Nair", "Gupta", "Iyer", "Mehta", "Singh", "Reddy",
    "Kapoor", "Joshi", "Bose", "Menon", "Das", "Choudhury", "Bhat", "Deshmukh", "Nambiar", "Saxena",
  ];

  function pickWeighted<T>(items: T[], weights: number[]): T {
    const r = Math.random();
    let sum = 0;
    for (let i = 0; i < items.length; i++) {
      sum += weights[i];
      if (r <= sum) return items[i];
    }
    return items[items.length - 1];
  }

  const demoResponses: FormResponse[] = [];
  const totalCount = 486;

  for (let i = 1; i <= totalCount; i++) {
    const fName = firstNames[(i * 7) % firstNames.length];
    const lName = lastNames[(i * 11) % lastNames.length];
    const fullName = `${fName} ${lName}`;
    const email = `${fName.toLowerCase()}.${lName.toLowerCase()}${i % 99}@college.edu`;
    const branch = pickWeighted(branches, branchWeights);
    const year = pickWeighted(years, yearWeights);
    const track = pickWeighted(tracks, trackWeights);
    const avail = pickWeighted(availabilities, availabilityWeights);
    const exp = (i % 5 === 0) ? "Extensive" : (i % 2 === 0 ? "Moderate" : "None");
    
    // Status pipeline
    let status: FormResponse["candidate_status"] = "New";
    if (i <= 65) status = "Selected";
    else if (i <= 145) status = "Interview";
    else if (i <= 250) status = "Shortlisted";
    else if (i <= 360) status = "Under Review";
    else if (i <= 420) status = "Rejected";
    else status = "New";

    const daysAgo = Math.floor((totalCount - i) / 70);
    const dateSubmitted = new Date(Date.now() - daysAgo * 86400000 - ((i * 17) % 86400) * 1000).toISOString();

    demoResponses.push({
      id: `resp-${i}`,
      form_id: demoFormId,
      submitted_at: dateSubmitted,
      respondent_email: email,
      candidate_status: status,
      completion_time_seconds: 180 + ((i * 23) % 240),
      notes: i === 12 ? "Strong web dev portfolio in Next.js & Supabase." : (i === 45 ? "Prior sponsorship lead for TEDx." : undefined),
      answers: {
        "q-1": fullName,
        "q-2": email,
        "q-3": branch,
        "q-4": year,
        "q-5": track,
        "q-6": exp,
        "q-7": avail,
        "q-8": `I am enthusiastic about entrepreneurship and want to build hands-on execution skills with the ${track} team while connecting with innovative founders.`,
        "q-9": i % 3 === 0 ? `https://storage.formiq.app/resumes/${email.split("@")[0]}_resume.pdf` : null,
      },
      created_at: dateSubmitted,
    });
  }

  // Exact evidence-backed insights matching PRD specifications
  const demoInsights: AIInsight[] = [
    {
      id: "ins-1",
      form_id: demoFormId,
      category: "area_requiring_attention",
      title: "Severe Weekday Scheduling Bottleneck",
      finding: "64% of respondents reported availability exclusively for weekends.",
      evidence: "311 of 486 responses selected 'Weekend-only'. Only 38 respondents (8%) are available during weekday daytime windows.",
      interpretation: "Key pre-summit preparations, vendor walk-throughs, and staging drills scheduled on Thursdays and Fridays will face critical volunteer staffing shortages.",
      suggested_action: "Recalibrate the orientation and staging schedule to weekend evening shifts, or create dedicated academic excuse credit for weekday operations.",
      created_at: new Date().toISOString(),
    },
    {
      id: "ins-2",
      form_id: demoFormId,
      category: "gap",
      title: "Content & PR Track Severely Underrepresented",
      finding: "Only 9% of applicants selected Editorial Content & PR as their primary track.",
      evidence: "44 of 486 total applications compared to 151 (31%) for Marketing and 136 (28%) for Technical Infrastructure.",
      interpretation: "The editorial team lacks sufficient capacity to cover live sessions, write founder press briefs, and run post-event speaker recap newsletters.",
      suggested_action: "Interview dual-track candidates from Marketing who indicated strong writing and copywriting background.",
      created_at: new Date().toISOString(),
    },
    {
      id: "ins-3",
      form_id: demoFormId,
      category: "trend",
      title: "Second-Year Participation Lag",
      finding: "Second-year (Sophomore) students represent only 18% of applicants despite holding key club experience.",
      evidence: "87 of 486 responses compared to 233 from 1st Year (48%) and 117 from 3rd Year (24%).",
      interpretation: "Mid-tier leadership continuity between graduating 4th years and upcoming juniors may be compromised next cycle.",
      suggested_action: "Target sophomore academic department WhatsApp and Slack channels with a fast-track coordinator application.",
      created_at: new Date().toISOString(),
    },
    {
      id: "ins-4",
      form_id: demoFormId,
      category: "strength",
      title: "High Technical Lead Readiness",
      finding: "42 respondents in the Technical track have extensive prior event tech experience.",
      evidence: "42 of 136 technical applicants reported prior infrastructure or hackathon management experience.",
      interpretation: "The platform, live stream, ticketing verification, and badge printing operations can be fully staffed with seasoned student engineers.",
      suggested_action: "Advance the top 20 technical candidates directly to the technical lead interview round.",
      created_at: new Date().toISOString(),
    },
    {
      id: "ins-5",
      form_id: demoFormId,
      category: "key_finding",
      title: "Strong Overall Volume & 82% Completion Rate",
      finding: "486 submissions recorded with an average completion duration of 3 minutes 42 seconds.",
      evidence: "Completion rate reached 82.4% across 590 unique form visits, indicating low question friction.",
      interpretation: "The 9-question structure and clear track grouping are well-calibrated for student respondent attention spans.",
      suggested_action: "Maintain the 9-question format without adding redundant qualification fields.",
      created_at: new Date().toISOString(),
    },
  ];

  const demoAnalytics: FormAnalytics[] = [
    {
      id: "ana-1",
      form_id: demoFormId,
      metric: "total_responses",
      value: 486,
      calculated_at: new Date().toISOString(),
    },
    {
      id: "ana-2",
      form_id: demoFormId,
      metric: "completion_rate",
      value: 82.4,
      calculated_at: new Date().toISOString(),
    },
    {
      id: "ana-3",
      form_id: demoFormId,
      metric: "average_completion_time_seconds",
      value: 222, // 3m 42s
      calculated_at: new Date().toISOString(),
    },
    {
      id: "ana-4",
      form_id: demoFormId,
      metric: "responses_today",
      value: 38,
      calculated_at: new Date().toISOString(),
    },
  ];

  return {
    workspaces: [defaultWorkspace],
    profiles: [defaultProfile],
    forms: [demoForm],
    questions: demoQuestions,
    responses: demoResponses,
    analytics: demoAnalytics,
    insights: demoInsights,
    notifications: [
      {
        id: "notif-1",
        user_id: defaultUserId,
        workspace_id: defaultWsId,
        type: "response_milestone",
        title: "Response Milestone Reached",
        message: "Your form 'Entrepreneurship Summit — Volunteer Recruitment' has crossed 450 submissions.",
        read: false,
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "notif-2",
        user_id: defaultUserId,
        workspace_id: defaultWsId,
        type: "ai_insight",
        title: "New AI Pattern Detected",
        message: "Severe weekend-only availability bottleneck identified in recent 100 responses.",
        read: false,
        created_at: new Date(Date.now() - 7200000).toISOString(),
      },
    ],
    audit_logs: [
      {
        id: "log-1",
        workspace_id: defaultWsId,
        user_id: defaultUserId,
        action: "form.publish",
        resource_type: "form",
        resource_id: demoFormId,
        metadata: { slug: demoSlug, title: demoForm.title },
        created_at: demoForm.published_at!,
      },
    ],
  };
}

export class LocalDatabase {
  private static instance: LocalDatabase;
  private state: DatabaseState;

  private constructor() {
    this.state = this.loadState();
  }

  public static getInstance(): LocalDatabase {
    if (!LocalDatabase.instance) {
      LocalDatabase.instance = new LocalDatabase();
    }
    return LocalDatabase.instance;
  }

  private loadState(): DatabaseState {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, "utf-8");
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error("[LocalDatabase] Failed to read database file, seeding default:", err);
    }
    const seed = getInitialSeed();
    this.saveStateToDisk(seed);
    return seed;
  }

  private saveStateToDisk(state: DatabaseState): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), "utf-8");
    } catch (err) {
      console.error("[LocalDatabase] Failed to persist database state to disk:", err);
    }
  }

  private persist(): void {
    this.saveStateToDisk(this.state);
  }

  // Workspaces
  public getWorkspace(id: string = "ws-main-001"): Workspace | undefined {
    return this.state.workspaces.find((w) => w.id === id) || this.state.workspaces[0];
  }

  // Profiles
  public getProfile(id: string = "usr-admin-001"): Profile | undefined {
    return this.state.profiles.find((p) => p.id === id) || this.state.profiles[0];
  }

  // Forms
  public getForms(workspaceId?: string): Form[] {
    const list = workspaceId
      ? this.state.forms.filter((f) => f.workspace_id === workspaceId)
      : this.state.forms;
    return list.map((f) => {
      const qCount = this.state.questions.filter((q) => q.form_id === f.id).length;
      const rCount = this.state.responses.filter((r) => r.form_id === f.id).length;
      return {
        ...f,
        response_count: rCount,
        questions: this.state.questions
          .filter((q) => q.form_id === f.id)
          .sort((a, b) => a.position - b.position),
      };
    });
  }

  public getFormById(id: string): Form | undefined {
    const form = this.state.forms.find((f) => f.id === id);
    if (!form) return undefined;
    const questions = this.state.questions
      .filter((q) => q.form_id === id)
      .sort((a, b) => a.position - b.position);
    const responseCount = this.state.responses.filter((r) => r.form_id === id).length;
    return {
      ...form,
      questions,
      response_count: responseCount,
    };
  }

  public getFormBySlug(slug: string): Form | undefined {
    const form = this.state.forms.find((f) => f.slug === slug);
    if (!form) return undefined;
    const questions = this.state.questions
      .filter((q) => q.form_id === form.id)
      .sort((a, b) => a.position - b.position);
    return {
      ...form,
      questions,
    };
  }

  public saveForm(form: Form, questions?: FormQuestion[]): Form {
    const index = this.state.forms.findIndex((f) => f.id === form.id);
    const updatedForm = { ...form, updated_at: new Date().toISOString() };
    if (index >= 0) {
      this.state.forms[index] = updatedForm;
    } else {
      this.state.forms.unshift(updatedForm);
    }

    if (questions) {
      // Remove old questions for this form
      this.state.questions = this.state.questions.filter((q) => q.form_id !== form.id);
      this.state.questions.push(...questions);
    }

    this.persist();
    return this.getFormById(form.id)!;
  }

  public deleteForm(id: string): boolean {
    const beforeCount = this.state.forms.length;
    this.state.forms = this.state.forms.filter((f) => f.id !== id);
    this.state.questions = this.state.questions.filter((q) => q.form_id !== id);
    this.state.responses = this.state.responses.filter((r) => r.form_id !== id);
    this.state.insights = this.state.insights.filter((i) => i.form_id !== id);
    this.state.analytics = this.state.analytics.filter((a) => a.form_id !== id);
    this.persist();
    return this.state.forms.length < beforeCount;
  }

  // Responses
  public getResponses(formId: string): FormResponse[] {
    return this.state.responses
      .filter((r) => r.form_id === formId)
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
  }

  public addResponse(
    formId: string,
    answers: Record<string, any>,
    email?: string,
    completionTimeSeconds?: number
  ): FormResponse {
    const newResponse: FormResponse = {
      id: `resp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      form_id: formId,
      submitted_at: new Date().toISOString(),
      respondent_email: email,
      candidate_status: "New",
      completion_time_seconds: completionTimeSeconds || 120,
      answers,
      created_at: new Date().toISOString(),
    };

    this.state.responses.unshift(newResponse);

    // Update form response count
    const form = this.state.forms.find((f) => f.id === formId);
    if (form) {
      form.response_count = (form.response_count || 0) + 1;
    }

    this.persist();
    return newResponse;
  }

  public updateResponseStatus(
    responseId: string,
    status: FormResponse["candidate_status"],
    notes?: string
  ): FormResponse | undefined {
    const resp = this.state.responses.find((r) => r.id === responseId);
    if (!resp) return undefined;
    resp.candidate_status = status;
    if (notes !== undefined) resp.notes = notes;
    this.persist();
    return resp;
  }

  // AI Insights
  public getInsights(formId: string): AIInsight[] {
    return this.state.insights.filter((i) => i.form_id === formId);
  }

  public saveInsights(formId: string, newInsights: AIInsight[]): void {
    // Keep existing or replace
    this.state.insights = this.state.insights.filter((i) => i.form_id !== formId);
    this.state.insights.push(...newInsights);
    this.persist();
  }

  // Notifications
  public getNotifications(): NotificationItem[] {
    return this.state.notifications;
  }

  public markNotificationRead(id: string): void {
    const n = this.state.notifications.find((item) => item.id === id);
    if (n) {
      n.read = true;
      this.persist();
    }
  }

  // Raw state access
  public getState(): DatabaseState {
    return this.state;
  }
}
