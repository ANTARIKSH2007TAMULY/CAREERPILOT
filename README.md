# CareerPilot

CareerPilot is a full-stack job discovery and application-tracking platform for students and early-career job seekers. It aggregates live job listings from three providers, lets users save roles and track applications through a Kanban pipeline, shows pipeline analytics, and adds Gemini-powered career tools (job-fit analysis, resume review, and a career coach).

| | |
|---|---|
| **Live application** | https://careerpilot-self-ten.vercel.app/ |
| **Source repository** | https://github.com/ANTARIKSH2007TAMULY/CAREERPILOT |
| **Author profile** | https://github.com/ANTARIKSH2007TAMULY |

> The live URL is the React frontend (hosted on Vercel). The backend API host is not defined anywhere in the repository; the frontend reaches it through the build-time variable `VITE_API_URL` (see [Deployment](#deployment)).

---

## Features

**Job discovery**
- Aggregates jobs from **Adzuna**, **The Muse**, and **Remotive**, normalizes them into one schema, de-duplicates them, and keeps only postings from the last 30 days.
- Search by keyword and location; filter by job type, work mode, experience level, skills, and source; sort by newest, oldest, highest salary, or title; paginated results.
- Job details page with the full description, skills, and an external "apply" link.

**Saving and tracking**
- Save and unsave jobs (`/saved-jobs`).
- Application tracker (`/applications`) with a Kanban board and a list view, nine statuses (`SAVED`, `INTERESTED`, `APPLIED`, `ASSESSMENT`, `INTERVIEW`, `OFFER`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`), a recorded status history, notes, deadlines, and duplicate detection.
- Track a job directly from its details page and change its status there.
- Interviews can be scheduled against an application (type, time, timezone, meeting link, interviewer, notes, per-interval reminder preferences).

**Dashboard and analytics**
- Dashboard with summary statistics, a trend chart (7 days / 30 days / 90 days / 6 months), recent applications, and upcoming deadlines and interviews.
- Analytics page with applications over time, applications by stage, by job type, and by work mode, plus response rate, interview conversion, offer conversion, and rejection rate.

**AI features (Google Gemini)**
- **Job match** on the job details page: score, strengths, missing skills, recommendations.
- **Resume analysis** (`/resume`): strengths, skill gaps, suggestions.
- **AI Career Coach** (`/ai-coach`): chat with recent-history context and suggested prompts.
- Per-user daily/monthly request and token quotas, with a usage endpoint.
- Local heuristic fallbacks when Gemini is not configured (responses are labelled as not AI-generated).

**Profile and account**
- Candidate profile (skills, education, experience, preferred roles/locations/job types/work modes, resume text, social links).
- Registration, login, logout, password change, notification preferences.
- Light/dark/system theme.

**Google Calendar (read-only)**
- Connect and disconnect a Google account from **Settings → Google Calendar integration**, and run a connection test. See [Google Calendar](#google-calendar).

---

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, React Router 6, Tailwind CSS 3, Axios, Recharts, Framer Motion, Lucide React |
| Backend | Node.js (ES modules), Express 4, Mongoose 8 |
| Database | MongoDB |
| Auth | JWT in an HTTP-only cookie, bcryptjs |
| Security middleware | Helmet, CORS (single configured origin), `express-rate-limit` |
| AI | Google Gemini via the REST API (`generativelanguage.googleapis.com`) |
| Job providers | Adzuna, The Muse, Remotive |
| Email | Resend (REST API) |
| Calendar | Google OAuth 2.0 + Google Calendar API v3 (read-only) |
| Optional infrastructure | Redis (`redis` client) and BullMQ — **optional**, see [Redis](#redis-is-optional) |
| Testing | Node's built-in test runner (`node --test`) |

---

## Architecture overview

```text
Browser (React SPA, Vercel)
        │  HTTPS, cookie-based session (withCredentials)
        ▼
Express API  ──►  MongoDB (users, jobs, saved jobs, applications, interviews, AI usage)
   │   ├──►  Adzuna / The Muse / Remotive   (job aggregation)
   │   ├──►  Google Gemini                  (AI features, dual-key failover)
   │   ├──►  Google OAuth + Calendar API    (read-only events)
   │   ├──►  Resend                         (email)
   │   └──►  Redis + BullMQ                 (optional: cache, reminder queue)
```

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for diagrams and detail.

---

## Project structure

```text
careerpilot/
├── client/                      # React + Vite frontend (workspace: careerpilot-client)
│   ├── src/
│   │   ├── App.jsx              # Route table + ProtectedRoute
│   │   ├── components/          # ai/, applications/, dashboard/, jobs/, layout/, ui/
│   │   ├── context/             # AuthContext, ThemeContext
│   │   ├── pages/               # Landing, Login, Register, Dashboard, Jobs, JobDetails,
│   │   │                        # SavedJobs, Applications, Resume, Analytics, AICoach,
│   │   │                        # Profile, Settings (+ Calendar.jsx, not routed)
│   │   ├── services/            # Axios API clients
│   │   └── utils/
│   ├── vercel.json              # SPA rewrite to /index.html
│   └── vite.config.js           # dev server :5173, proxies /api → localhost:5001
├── server/                      # Express API (workspace: careerpilot-server)
│   ├── index.js                 # Entry point
│   ├── config/                  # env, db, redis, in-memory demo stores
│   ├── controllers/  routes/  middleware/  models/  utils/
│   ├── services/
│   │   ├── ai/                  # geminiProvider, geminiKeyManager, aiService, aiQuotaService, aiSchemas
│   │   ├── jobs/                # jobAggregator, adzuna/muse/remotive adapters, normalization, ingestion status
│   │   ├── calendar/            # googleCalendarService
│   │   ├── email/               # resendService
│   │   └── interview/           # interviewScheduler
│   ├── queues/                  # BullMQ queues and workers (Redis only)
│   ├── seed/seedJobs.js         # Optional sample jobs
│   ├── scripts/                 # verifyIntegrations.js, repairWorkLocation.js
│   └── tests/                   # 17 test files
├── docker-compose.yml           # MongoDB 7 and Redis 7 for local development
├── .env.example                 # Environment variable template
└── package.json                 # npm workspaces: client, server
```

---

## Getting started

### Prerequisites
- Node.js 20 or newer (built and tested on Node 22) and npm
- A MongoDB instance (local, Docker, or Atlas)
- Optional: API keys for Gemini, Adzuna, Resend, and Google OAuth credentials

### Install

```bash
git clone https://github.com/ANTARIKSH2007TAMULY/CAREERPILOT.git
cd CAREERPILOT
npm install            # installs both workspaces
```

### Configure the environment

```bash
cp .env.example .env
```

The server loads `.env` from the working directory, the repository root, or `server/`. Never commit `.env`; it is listed in `.gitignore`.

| Variable | Purpose | Notes |
|---|---|---|
| `PORT` | API port | Default `5001` |
| `MONGODB_URI` | MongoDB connection string | Default `mongodb://127.0.0.1:27017/careerpilot` |
| `JWT_SECRET` | Signs session tokens and OAuth state; also derives the AES key for stored Google tokens | **Required in production** |
| `CLIENT_URL` | Allowed CORS origin and OAuth redirect target | Default `http://localhost:5173` |
| `REDIS_URL` | Enables cache and BullMQ | **Optional.** Leave empty to run without Redis |
| `AI_PROVIDER` | Present in `.env.example` | The code always uses Gemini |
| `GEMINI_API_KEY`, `GEMINI_API_KEY_2` | Primary and secondary Gemini keys | Both optional; empty means heuristic fallbacks |
| `GEMINI_MODEL` | Preferred model | Default `gemini-3.5-flash-lite` |
| `AI_DAILY_REQUEST_LIMIT`, `AI_MONTHLY_REQUEST_LIMIT` | Per-user request quotas | Defaults `20` / `300` |
| `AI_DAILY_TOKEN_LIMIT`, `AI_MONTHLY_TOKEN_LIMIT` | Per-user token quotas | Defaults `50000` / `500000` |
| `AI_MAX_REQUEST_TOKENS`, `AI_MAX_OUTPUT_TOKENS` | Input and output size caps | Defaults `6000` / `2000` |
| `AI_RATE_LIMIT_PER_MINUTE` | Per-user AI requests per minute | Default `5` |
| `AI_USAGE_TIMEZONE` | Present in `.env.example` | Quota windows are computed in UTC in the current code |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `ADZUNA_COUNTRY`, `ADZUNA_MAX_PAGES` | Adzuna provider | Provider is skipped without ID and key; country default `in` |
| `THEMUSE_API_KEY`, `MUSE_MAX_PAGES`, `MUSE_PRIMARY_PAGES` | The Muse provider | Works without a key (public API); key is sent if set |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email via Resend | Optional |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_PROJECT_ID` | Google Calendar OAuth | `GOOGLE_REDIRECT_URI` must exactly match the URI registered in Google Cloud |

The frontend has one optional build-time variable, `VITE_API_URL` (API base URL). It defaults to `/api`, which the Vite dev server proxies to `http://localhost:5001`.

### Run locally

```bash
npm run dev            # API (node --watch) and Vite dev server together
```

- Frontend: http://localhost:5173
- API: http://localhost:5001 (health check: `GET /api/health`, readiness: `GET /api/health/ready`)

Individual processes: `npm run server`, `npm run client`.

Optional: `npm run seed` inserts a handful of sample jobs (source `CareerPilot`) into MongoDB. Job search works without it because the providers populate the catalog.

Optional: `docker compose up -d mongo` starts a local MongoDB 7. The Compose file also defines a Redis service, but you do not need it.

### Build and test

```bash
npm run build                  # production build of the client → client/dist
npm test                       # server tests, then client tests
npm run verify:integrations    # live checks against configured providers (uses your real keys)
```

Other scripts: `npm --workspace server start` (production-style start), `npm --workspace client run preview` (serve the build on port 4173).

---

## Redis is optional

CareerPilot runs without Redis. If `REDIS_URL` is empty, or the connection attempt fails (1.5 s connect timeout, 2 s overall, no retry), the server logs a notice and continues:

- No Redis cache is used. Job aggregation uses an in-process cache with a 15-minute TTL instead.
- BullMQ queues and workers are not created. The log shows `BullMQ workers skipped because Redis is unavailable.`
- Interview reminders are stored on the interview record but **not delivered automatically**, because delayed reminder delivery is implemented only through the BullMQ notification queue. Manually triggered test emails still work (`POST /api/interviews/:id/test-email`).
- `GET /api/health/ready` reports `redis.operational: false` and still responds successfully.

The deployed application does not depend on Redis.

---

## AI integration (Google Gemini)

- Gemini is the only AI provider. Requests go to the Gemini REST API with JSON-constrained output, a 15-second timeout per call, and schema validation of every response.
- **Two keys.** `GEMINI_API_KEY` is the primary key and `GEMINI_API_KEY_2` the secondary. Keys are tried in order, so the secondary is used only when the primary fails; requests are not load-balanced. If the primary returns an authentication error (401/403/invalid key) it is marked invalid for the life of the process; on 429/quota errors or repeated 5xx/timeouts it goes on cooldown (60 s / 30 s). When a failure is eligible, the same request is retried on the other key.
- **Models.** Each call tries `GEMINI_MODEL` first, then `gemini-3.5-flash-lite`, `gemini-3.5-flash`, and `gemini-flash-latest`.
- **Fallbacks.** Job match and the coach fall back to a local heuristic if Gemini fails or is not configured. Resume analysis, roadmap, and interview prep fall back to heuristics when no key is configured or the model output fails validation, but return an error if every key fails at the network/API level.
- **Quotas.** Every AI request reserves quota in MongoDB (per-minute, daily, monthly requests and tokens). If MongoDB is not connected, AI endpoints return HTTP 503 rather than run without quota enforcement.
- **UI coverage.** The UI exposes job match, resume analysis, and the career coach. The API also has `POST /api/ai/roadmap` and `POST /api/ai/interview-prep`, which no page currently calls.

---

## Job provider integrations

| Provider | Endpoint family | Credentials |
|---|---|---|
| Adzuna | `api.adzuna.com/v1/api/jobs/{country}/search` | `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` required |
| The Muse | `themuse.com/api/public/jobs` | Optional `THEMUSE_API_KEY` |
| Remotive | `remotive.com/api/remote-jobs` | None |

Results are normalized (job type, work mode, experience level, salary, skills), de-duplicated by provider identity and a company/title/location fallback key, filtered to the last 30 days, and upserted into MongoDB. A background backfill (in-process, not Redis) continues ingesting The Muse and a set of Adzuna keyword searches after the first search. `GET /api/jobs/ingestion-status` exposes progress.

---

## Google Calendar

Implemented:
- OAuth 2.0 authorization-code flow with `access_type=offline`, a signed 10-minute `state` value bound to an HTTP-only cookie, and a callback at `/api/integrations/google/callback` that redirects back to `/settings`.
- **Scopes requested: `calendar.readonly`, `userinfo.email`, `openid`.** The integration is read-only.
- Access and refresh tokens are encrypted with AES-256-GCM before being stored on the user document and are never returned by the API. Expired access tokens are refreshed automatically; a revoked or expired grant marks the account disconnected.
- Settings page: connect, disconnect (revokes the token at Google), and a connection test (lists calendars).
- `GET /api/integrations/google/events` returns normalized events from the primary calendar (default window: seven days before the start of the current month through the 7th of next month; maximum range 180 days; meeting links extracted).

Not implemented: creating, editing, or deleting Google Calendar events, and automatic synchronization of CareerPilot interviews into Google Calendar. A full calendar view page exists in the source (`client/src/pages/Calendar.jsx`) but is not wired into the router or sidebar, so the events endpoint is currently reachable through the API only. MongoDB is required to store tokens.

---

## Authentication and security

- Passwords are hashed with bcrypt (cost 12); minimum length 6.
- Sessions use a 7-day JWT in an HTTP-only cookie (`secure` and `SameSite=None` when `NODE_ENV=production`, `SameSite=Lax` otherwise). All user data routes use the `protect` middleware, and queries are scoped to the authenticated user.
- Helmet, CORS restricted to `CLIENT_URL` with credentials, JSON body limit of 1 MB, and a global limit of 200 requests per 15 minutes per client.
- In production the server refuses to start with a missing or default `JWT_SECRET`.
- Provider errors pass through a secret-redaction helper; error responses are generic in production.
- Google tokens are encrypted at rest (see above). The encryption key is derived from `JWT_SECRET`, so rotating that secret invalidates sessions and stored Google tokens (users must reconnect).

---

## Deployment

- **Frontend:** `client/` is a standard Vite build with `vercel.json` rewriting all paths to `index.html` for client-side routing. Production URL: https://careerpilot-self-ten.vercel.app/. Set `VITE_API_URL` at build time to the public API base URL (including `/api`).
- **Backend:** run `npm --workspace server start` on any Node host. The repository contains no platform-specific backend configuration; the latest commit message mentions Render, but no Render file is present. Set `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, and set `CLIENT_URL` to `https://careerpilot-self-ten.vercel.app` so CORS and OAuth redirects work. `GOOGLE_REDIRECT_URI` must point to the backend's `/api/integrations/google/callback` and be registered in Google Cloud.
- **Docker Compose** is for local MongoDB (and optional Redis) only; it does not package the application.

---

## Known limitations

- **No MongoDB means demo mode.** If MongoDB is unreachable at startup the API continues using in-memory stores for users, saved jobs, applications, and interviews. Data is lost on restart, and AI features and Google Calendar connection are unavailable.
- **Interview reminder emails require Redis.** Without it, reminders are recorded but not sent automatically. Job-alert and application-reminder email builders exist, but nothing in the application schedules them.
- **Google Calendar is read-only** and its events page is not reachable from the UI (see above).
- **Resume upload reads plain text only** (`.txt`, `.md`). PDF and DOCX files are attached by name but their content is not parsed.
- **Cross-site cookies.** With the frontend on Vercel and the API on a different domain, login relies on third-party cookies; browsers that block them can prevent sign-in.
- **Gemini key cooldown** is tracked in memory per server process and an expired cooldown is not re-evaluated on the request path; a cooled-down key is retried only after active keys have been tried.
- Roadmap and interview-prep AI endpoints have no UI.
- Search results depend on provider availability and quotas; Adzuna requires credentials.

---

## Documentation

| File | Contents |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Components, data model, request flows, Mermaid diagrams |
| [`IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md) | Feature-by-feature status and test/build results |
| [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) | 5–8 minute walkthrough of the live app |
| [`FINAL_SUBMISSION_CHECKLIST.md`](FINAL_SUBMISSION_CHECKLIST.md) | Pre-submission checklist |
