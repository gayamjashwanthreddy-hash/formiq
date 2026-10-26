# FormIQ — AI-Powered Forms & Response Intelligence

> **From a simple idea to a complete data workflow.**  
> Built with Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, GSAP ScrollTrigger, Lenis smooth scrolling, and Supabase.

---

## 1. Product Overview

Traditional form builders focus solely on collecting answers into raw spreadsheets. **FormIQ** is an end-to-end data collection and response intelligence platform. A user explains their objective in natural language, and the platform generates a complete form, validation rules, and conditional logic. Once responses arrive, FormIQ calculates deterministic statistics and synthesizes evidence-backed insights, operational gaps, and decision frameworks.

### The Cognitive Progression
$$\text{Intent} \longrightarrow \text{Structure} \longrightarrow \text{Form} \longrightarrow \text{Responses} \longrightarrow \text{Understanding} \longrightarrow \text{Action}$$

---

## 2. Creative Direction & Visual System

FormIQ is crafted as an editorial cinematic experience inspired by high-craft spatial storytelling, strictly adhering to an 85% monochrome palette with precision typography:

- **Ink**: `#090A0A`
- **Warm Paper**: `#F4F2EC`
- **Neutral Gray**: `#B8B8B0`
- **Dark Gray**: `#222422`
- **FormIQ Blue**: `#315CFF` *(used sparingly for emphasis and climax)*
- **Typography**: Inter & JetBrains Mono Variable with editorial asymmetry, tabular numerals, tight tracking, and cropped typography.
- **Strictly Avoided**: Gradients, neon colors, glassmorphism, glowing borders, AI robot icons, floating orbs, and generic SaaS bento grids.

---

## 3. Cinematic Landing Experience (Storyboard 00–07)

1. **00 — LOADER**: Calibration line rapidly initializing (000% → 100% in $\le 1.1\text{s}$) before transitioning directly into the hero.
2. **01 — HERO**: Nearly black canvas with massive cropped editorial typography `FORMIQ`, clipped metadata reveals, and letter separation into structural input lines.
3. **02 — FROM PROMPT TO FORM**: Inside the letterform geometry, an abstract environment assembles: `DESCRIBE` $\to$ `CREATE` $\to$ `STRUCTURE` $\to$ `PUBLISH`.
4. **03 — DATA BECOMES VISIBLE**: Warm paper pinned horizontal sequence tracking responses accumulating ($10 \to 100 \to 1,000 \to 10,000+$).
5. **04 — RESPONSE INTELLIGENCE**: Three full-screen transformations: `01 COLLECT` $\to$ `02 UNDERSTAND` $\to$ `03 ACT`.
6. **05 — FORM INDEX**: Fixed massive `FORMIQ` on the left with vertical specification rows. Rows align and highlight in FormIQ Blue.
7. **06 — CLIMAX**: Full FormIQ Blue canvas with oversized black typography: *"NOT JUST FORMS. RESPONSE INTELLIGENCE."*
8. **07 — FINAL CTA**: Return to quiet dark with rectangular CTA featuring a horizontal wipe and a massive cropped 'F'.

---

## 4. Application Architecture & Routes

| Route | Purpose | Key Capabilities |
| :--- | :--- | :--- |
| `/` | Cinematic Landing Experience | Lenis smooth scroll, GSAP ScrollTrigger storyboard, dynamic navigation |
| `/app` | Main Dashboard | Active forms, total responses, completion rate, recent forms table |
| `/app/forms` | Forms Management | Search, status filters (Published, Draft, Closed), duplicate, delete |
| `/app/forms/new` | Create Form | Natural language AI prompt generator, one-click template triggers |
| `/app/forms/[id]` | Form Builder & Editor | Add, reorder, edit, conditional logic, AI command bar ("Ask FormIQ to change something..."), preview, QR code |
| `/app/forms/[id]/responses` | Responses Dashboard | Full candidate table, pipeline stages (`New` $\to$ `Under Review` $\to$ `Shortlisted` $\to$ `Interview` $\to$ `Selected` $\to$ `Rejected`), detail drawer, notes, CSV export |
| `/app/forms/[id]/analytics` | Deterministic Analytics | Real-time calculations: distributions by branch, year, track, availability, average completion duration |
| `/app/forms/[id]/insights` | Response Intelligence | Evidence-backed findings, *"Areas requiring attention"* (*"Where are we lagging?"*), Natural Language Q&A |
| `/app/templates` | Template Library | Recruitment, Registration, Feedback, Hackathon, Internship, Market Research |
| `/app/settings` | Settings & RBAC | Workspace ownership, team roles (Owner, Editor, Analyst, Viewer), notification triggers |
| `/f/[slug]` | Public Respondent Form | Mobile-first, accessible, validation, file upload support, confetti celebration |
| `/auth/*` | Supabase Authentication | Sign up, login, password recovery |

---

## 5. PostgreSQL Schema & Row Level Security

The migration in `supabase/migrations/20260926000000_init_formiq_schema.sql` establishes 14 core normalized tables:

- `profiles`
- `workspaces`
- `workspace_members` (RBAC: Owner, Editor, Analyst, Viewer)
- `forms`
- `form_questions`
- `form_logic`
- `form_responses`
- `response_answers`
- `form_analytics`
- `ai_insights`
- `files`
- `notifications`
- `audit_logs`

### Security & Privacy Enforcements:
- **Public Form Access**: Anonymous users can only view published forms by slug (`status = 'published'`).
- **Response Isolation**: Public respondents can insert answers only into published forms. Responses and analytics are readable only by authenticated workspace members.
- **Service Role Protection**: Secret keys remain strictly on the server and are never bundled in client code.

---

## 6. AI Reliability Principle

> **Numerical metrics are calculated deterministically by the application; the AI explains and contextualizes those metrics.**

Every insight contains:
1. **Finding**: The observable conclusion.
2. **Evidence**: Verifiable statistics traceable to the raw database rows.
3. **Interpretation**: Operational implications of the data.
4. **Suggested Action**: Practical steps for the team.

---

## 7. Running the Project

```bash
# 1. Install dependencies
npm install

# 2. Build for production
npm run build

# 3. Start production server
npm start
# App running at http://localhost:3000
```
