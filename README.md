# AegisAI
### Language itself is the evidence.

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-D71F00?style=for-the-badge)
![Pydantic](https://img.shields.io/badge/Pydantic-E92063?style=for-the-badge)
![WebSocket](https://img.shields.io/badge/WebSocket-realtime-4353FF?style=for-the-badge)
![Hugging Face](https://img.shields.io/badge/Hugging%20Face-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)
![Cursor](https://img.shields.io/badge/Cursor-000000?style=for-the-badge)
![v0](https://img.shields.io/badge/v0.dev-000000?style=for-the-badge&logo=vercel&logoColor=white)

AegisAI is an NLP-first exam integrity platform. Instead of watching a student's webcam for suspicious glances, it reads what they actually write and say — and looks for the patterns that give away AI-generated answers, paraphrased plagiarism, and sudden shifts in writing style mid-exam.

Most existing proctoring tools were built for an era of *visual* cheating — phones, notes, wandering eyes. They have almost no ability to catch a student who quietly pastes in an AI-written paragraph. AegisAI is built specifically to close that gap, treating language as the primary signal instead of an afterthought.

> Built as an independent evolution of academic research into exam-behavior detection — reworked from the ground up around NLP and explainability instead of computer vision, and built as a set of independently deployable services rather than one monolithic app.

---

## Live deployment

| Piece | URL |
|---|---|
| Examiner dashboard (frontend) | https://aegis-ai-psi-seven.vercel.app |
| Backend API (docs at `/docs`) | https://aegisai-lx4m.onrender.com |

> Running on free-tier infrastructure — the backend sleeps after ~15 minutes of inactivity and takes 30–50 seconds to wake up on the first request after that. Not a bug, just the tradeoff of a $0 deployment.

---

## What AegisAI actually does

A candidate's typed (and eventually spoken) answers are analyzed continuously through an exam, rather than judged sentence-by-sentence in isolation. Individual flagged phrases don't trigger anything on their own — the system watches for *patterns* building up over a rolling time window, the same way a human evaluator would notice something felt "off" about an answer only after reading a few paragraphs of it. When a pattern crosses a confidence threshold, AegisAI generates an explainable report: the exact flagged text, which signal caught it, a confidence score, and a plain-language reason — never just a bare percentage. A human examiner always makes the final call; AegisAI surfaces evidence, it doesn't hand down verdicts.

---

## Architecture

AegisAI is deliberately built as several small, independently deployable services rather than one large application — each piece uses whichever tool is actually best suited to it, and each can be upgraded or redeployed without touching the others.

```
┌─────────────────┐        ┌──────────────────┐        ┌────────────────────┐
│  Frontend        │◄──────►│  Backend API      │◄──────►│  ML Services         │
│  (Next.js/React) │  REST +│  (FastAPI)        │  REST  │  (AI-text detector,  │
│  on Vercel        │  WS   │  on Render         │        │  more to come)       │
└─────────────────┘        └──────────────────┘        └────────────────────┘
                                     │
                                     ▼
                            SQLite (dev) / Postgres (production-ready)
```

- **Frontend** submits candidate answers, and gives examiners a live dashboard, a per-session review screen, and an evidence report — all updating in real time over a WebSocket, with zero manual refresh.
- **Backend** owns the data model, the session lifecycle, a rolling-window scoring engine, and the explainability layer that turns raw detections into plain-language reports.
- **ML services** are separate processes that receive text, score it, and post their findings back to the backend as events. New detection capabilities plug in as new services — nothing about the backend or frontend has to change to add one.

---

## Tools used

We deliberately picked the best tool *for each layer* rather than building the whole thing in one environment — a direct decision to avoid the monolithic, single-tool approach used in earlier projects.

| Layer | Tool | Why |
|---|---|---|
| Frontend UI generation | **v0** (Vercel) | Purpose-built for polished, data-dense React/Tailwind interfaces |
| Frontend/backend development | **Cursor** | Whole-repo agentic reasoning for wiring services together |
| Backend framework | **FastAPI** + SQLAlchemy + Pydantic | Async-first, strong typing, auto-generated API docs |
| Frontend framework | **Next.js** / React / Tailwind CSS | Matches v0's output, deploys natively to Vercel |
| Real-time updates | **WebSockets** (native FastAPI) | Live dashboard push, no polling |
| ML service framework | **FastAPI** (one per capability) | Consistent, lightweight, independently scalable |
| Real-model text classification | **Hugging Face Inference API** | Free hosted inference — no model download or local GPU/RAM needed, critical for staying on free-tier hosting |
| Frontend hosting | **Vercel** | Native home for a v0/Next.js project, free tier, zero-config deploys |
| Backend hosting | **Render** | Free tier that runs a real persistent process — required for WebSocket support, unlike serverless-only platforms |
| Version control | **Git** / **GitHub** | Single monorepo, subfolder-based deploys to Render and Vercel |

**Planned additions**, not yet in place: **Auth.js** for real authentication (email/password plus Google/Facebook sign-in), **Sentence-Transformers + FAISS** for semantic plagiarism detection, **Whisper** for speech-to-text, and a proper **PyTorch sequence model** for temporal correlation (currently a simpler statistical rolling-window approach — genuinely functional, but a placeholder for the research-grade version described below).

---

## What's been built so far

**Backend (FastAPI, deployed on Render)**
- Full session lifecycle: start a session, submit answers, retrieve events/score/report.
- A rolling 5-minute scoring window that weighs recent events by confidence, with a bonus when multiple *different* signal types fire close together — the same "don't react to one sentence, look at the pattern" principle behind the whole project.
- An explainability module that auto-generates a plain-language evidence report the moment a candidate's score crosses threshold, with real quoted text pulled from their actual answers.
- A live WebSocket channel (`/dashboard/live`) broadcasting every new event and score update to connected examiner dashboards in real time.
- UTC-safe timestamp handling throughout (a real bug we caught and fixed: naive timestamps were being silently misread by browsers in non-UTC timezones).

**Frontend (Next.js, deployed on Vercel)**
- A live monitoring dashboard showing every active session with a real-time suspicion score.
- A session review screen built around a distinct visual concept — flagged text annotated in the margin like a hand-marked manuscript, rather than a generic security-camera-style dashboard.
- A full evidence report screen with an examiner decision row (currently UI-only — see Known Limitations).
- A cohort-level analytics screen for institution-wide patterns.
- Fully wired to the real backend: no mock data, live WebSocket subscription, real API calls throughout.

**ML — AI-text detector (first ML microservice)**
- A hybrid scorer: statistical heuristics (sentence-length burstiness, stock AI-phrase density, lexical patterns) always run and never fail; a real Hugging Face-hosted transformer model blends in automatically once configured, with the heuristic providing a safety net if that call ever fails or times out.
- Fully automatic: submitting an answer triggers analysis and event posting in the background — no manual intervention required.

---

## Known limitations (being upfront about these)

- **No real authentication yet.** Anyone with a candidate ID can currently interact with any session. This is the top priority before this could handle real student data.
- **Examiner decision buttons (Mark reviewed / Escalate / Dismiss) are visual-only right now** — clicking them updates the screen but nothing is saved to the database yet.
- **Only one ML service is live** — semantic similarity (plagiarism), stylometry (authorship drift), and speech-to-text are designed for but not yet built.
- **The temporal engine is a statistical placeholder**, not the trained sequence model the original research design calls for.
- **Database is SQLite** in the current deployment — fine for a demo, but data doesn't persist reliably across a Render restart. Swapping to a free Postgres tier (Supabase/Neon) is a small, already-planned change.
- **No teacher/student accounts or exam-authoring UI** — the platform currently assumes an examiner manually creates sessions; it isn't yet a self-serve tool a teacher could hand to a class.

---

## Future scope

**Near-term**
- Persist examiner decisions (Mark reviewed / Escalate / Dismiss) to the database.
- Deploy the AI-text detector as its own live service, fully removing the need for manual testing calls.
- Swap SQLite for a free-tier Postgres database.

**Platform expansion**
- Real authentication via Auth.js — email/password plus Google and Facebook sign-in.
- Teacher and student roles: teachers create exams and assign student logins directly (no self-registration); students get a dedicated exam-taking interface, which doesn't exist yet — everything built so far is the examiner-facing side only.
- A real exam/question content model, so exams are more than just an ID and a title.

**ML capabilities**
- Semantic plagiarism detection via sentence embeddings and a vector index, catching paraphrased as well as verbatim copying.
- Stylometric authorship-consistency modeling, flagging when a candidate's writing style shifts mid-exam.
- Speech-to-text analysis via Whisper, extending detection to spoken/transcribed answers.
- A trained sequence model replacing the current statistical temporal engine.

**Trust & fairness**
- A formal bias-auditing pass across writing styles, accents, and second-language English use — treated as a core requirement, not an afterthought, in line with the project's founding principle that a human always makes the final call.
- Multilingual support, extending beyond English-only exams.

---

## A note on philosophy

Every design decision here follows one idea: **AegisAI produces evidence, not verdicts.** Every score comes with the exact text that produced it. Every flag can be traced back to a specific, human-readable reason. The system is built to make a human examiner's judgment faster and better-informed — never to replace it.
