# CareerPilot Implementation Status

Live application: https://careerpilot-self-ten.vercel.app/
Repository: https://github.com/ANTARIKSH2007TAMULY/CAREERPILOT
Basis: source-code audit of the project ZIP, build and test runs, and a startup run with no Redis and no MongoDB. This report supersedes `PROJECT_AUDIT_REPORT.md` and `docs/integration-audit-handoff.md`, which predate the current code (they still describe Grok and an unverified Google Calendar flow).

**Status labels:** **Implemented** (working in code and covered by the evidence stated) · **Partially implemented** (works with a stated gap) · **Configuration-dependent** (works when credentials or services are provided) · **Planned** (not in the code).

---

## 1. Executive summary

CareerPilot is a complete full-stack application: a React SPA with 13 routed pages and an Express/MongoDB API with 10 route groups. All core user workflows are implemented end to end: registration and login, multi-provider job search with filtering, saving jobs, application tracking with status history, interview scheduling, dashboard and analytics, profile management, and three Gemini-powered tools.

Key facts about the current runtime:

- **AI** uses Google Gemini only (Grok is removed from the code path). Two keys are supported with real in-order failover; heuristic fallbacks cover missing keys.
- **Redis is optional and not required.** The server starts and serves every feature without it; the only functional loss is automatic delivery of interview reminder emails.
- **Google Calendar is connected and read-only.** OAuth, encrypted token storage, refresh, disconnect, connection test, and event reading are implemented. Event creation and sync are not.
- **Tests and build pass:** 116 server tests and 7 client tests pass, and the production client build succeeds (details in §12).

Material gaps: the Calendar events view is built but not routed; roadmap and interview-prep AI endpoints have no UI; job-alert and application-reminder emails are never triggered; resume upload parses plain text only; the backend deployment is not described in the repository.

---

## 2. Implemented features

| Area | Implementation | Status |
|---|---|---|
| Registration, login, logout | `/api/auth/*`, bcrypt, JWT in HTTP-only cookie, session restore via `/auth/me` | Implemented |
| Password change | `PUT /api/auth/password`, form in Settings | Implemented |
| Profile management | `GET/PUT /api/user/profile`; skills, education, experience, preferences, social links, resume text | Implemented |
| Job search and filters | Keyword, location, type, work mode, level, source, skills, sort, pagination | Implemented |
| Job details | `GET /api/jobs/:id`, details page, external apply link | Implemented |
| Saved jobs | Save/unsave from job pages; Saved Roles page with search | Implemented |
| Application tracker | CRUD, 9 statuses, status history, notes, deadlines, duplicate detection, Kanban + list view, sorting, filtering | Implemented |
| Interview scheduling | Create/edit/cancel/reschedule interviews per application; per-interval reminder preferences | Implemented |
| Dashboard | Summary cards, trend chart (7d/30d/90d/6m), recent applications, upcoming deadlines/interviews, featured jobs | Implemented |
| Analytics | 4 charts, response/interview/offer/rejection metrics | Implemented |
| AI job match | `POST /api/ai/job-match`, shown on job details | Implemented (Gemini requires keys) |
| AI resume analysis | `POST /api/ai/resume-analysis`, Resume & Fit page | Implemented (Gemini requires keys) |
| AI career coach | `POST /api/ai/chat`, AI Coach page with history and suggested prompts | Implemented (Gemini requires keys) |
| AI roadmap, interview prep | `POST /api/ai/roadmap`, `/interview-prep` with schemas and tests; no page calls them | Partially implemented (API only) |
| Google Calendar connect/disconnect/test | Settings page + `/api/integrations/google/*` | Implemented (needs Google credentials) |
| Google Calendar events view | `GET /google/events` implemented; `Calendar.jsx` page exists but is not routed | Partially implemented |
| Theme | Light/dark/system with persistence | Implemented |

---

## 3. Frontend implementation

| Area | Implementation | Status |
|---|---|---|
| Routing | 3 public routes (`/`, `/login`, `/register`) and 10 protected routes inside `AppShell`; `ProtectedRoute` redirects to `/login` | Implemented |
| State | `AuthContext`, `ThemeContext`; page-local state; Axios client with credentials and error normalization | Implemented |
| Jobs UI | Search box, location, type, mode, level, source, sort controls, pagination, skeleton and empty states | Implemented |
| Tracker UI | Kanban board and list toggle, application modal, interview modal, delete confirmation | Implemented |
| Charts | Recharts: bar, area, pie on Dashboard and Analytics | Implemented |
| Calendar page | Month/agenda views, Google + CareerPilot interview layers; not imported by `App.jsx`, no sidebar entry | Partially implemented (unreachable) |
| Resume upload | Reads `.txt`/`.md` content into the editor; PDF/DOCX are attached by name only and not parsed | Partially implemented |
| Error handling | `ErrorBoundary`, toasts, loading/empty states | Implemented |
| Build | Vite production build; bundle is a single ~913 kB chunk (Vite size warning, no code-splitting) | Implemented |

---

## 4. Backend implementation

| Area | Implementation | Status |
|---|---|---|
| Server bootstrap | Helmet, CORS (single origin), JSON limit, cookies, global rate limit, health endpoints, error handlers | Implemented |
| API surface | `/auth`, `/user`, `/jobs`, `/saved-jobs`, `/applications`, `/interviews`, `/analytics`, `/ai`, `/integrations/google`, `/health` | Implemented |
| Analytics | Summary and trends computed from the user's applications and interviews | Implemented |
| Health | Liveness and readiness (Mongo, Redis, provider configuration; provider `operational` is not probed and reports `null`) | Implemented |
| Operational scripts | `seed` (sample jobs), `verify:integrations` (live provider checks), `repairWorkLocation` | Implemented |
| Recommendation service | `recommendationService.js` exists; no route or controller uses it | Planned (unused code) |

---

## 5. Database and authentication

| Area | Implementation | Status |
|---|---|---|
| MongoDB / Mongoose | Models: `User`, `Job`, `SavedJob`, `Application`, `Interview`, `AIUsage` (with indexes, 90-day TTL on usage) | Implemented |
| `AIAnalysis` model | Defined, never read or written | Planned (unused code) |
| Authentication | bcrypt cost 12, 7-day JWT cookie (`secure`/`SameSite=None` in production), `protect` middleware, per-user query scoping | Implemented |
| Production secret check | Server refuses to start in production without a non-default `JWT_SECRET` | Implemented |
| MongoDB-offline mode | Auth, jobs, saved jobs, applications, interviews, analytics run on in-memory stores; data is lost on restart; AI and Calendar connection are disabled | Partially implemented (by design: development/degraded mode) |

---

## 6. Job provider integrations

| Area | Implementation | Status |
|---|---|---|
| Adzuna | Paged search adapter, normalization, extra keyword backfill (14 terms); skipped when `ADZUNA_APP_ID`/`ADZUNA_APP_KEY` are unset | Configuration-dependent |
| The Muse | Public-API adapter with optional key, paged ingestion with rate-limit and page-cap handling | Implemented |
| Remotive | Public-API adapter, remote/eligibility classification | Implemented |
| Normalization | Unified schema: job type, work mode (no default to Remote), experience level, salary, skills, HTML stripping | Implemented |
| De-duplication | Provider identity plus company/title/location fallback key | Implemented |
| 30-day freshness window | Applied in aggregation and in database queries | Implemented |
| Persistence | Bulk upsert to MongoDB; unique `(source, providerJobId)` | Implemented |
| Caching | 15-minute in-process query cache with in-flight de-duplication | Implemented |
| Ingestion status | `GET /api/jobs/ingestion-status` and per-search `providers[]` | Implemented |
| Provider isolation | One failing provider is reported and does not fail the search | Implemented |

---

## 7. Gemini AI integration

| Area | Implementation | Status |
|---|---|---|
| Provider | Gemini REST (`generateContent`) with JSON output, 15 s timeout, schema validation. Grok and other providers are not in the code path; only legacy secret-redaction patterns for old key formats remain in `utils/redact.js` and its tests | Implemented |
| Two-key configuration | `GEMINI_API_KEY` (primary) and `GEMINI_API_KEY_2` (secondary) | Implemented |
| Key failover | Ordered: secondary is used only after a failover-eligible primary failure (401/403 → primary marked invalid; 429 → 60 s cooldown; repeated 5xx/timeout → 30 s cooldown); jittered retry; error if all keys fail. No load balancing | Implemented |
| Cooldown re-promotion | State is in memory per process; expired cooldowns are not re-evaluated on the request path, so a cooled key is retried only after active keys | Partially implemented |
| Model fallback | `GEMINI_MODEL` → `gemini-3.5-flash-lite` → `gemini-3.5-flash` → `gemini-flash-latest` | Implemented |
| Heuristic fallback | Job match and coach: on any provider failure or no key. Resume analysis, roadmap, interview prep: on no key or invalid output; hard API failure on all keys returns an error | Implemented |
| Quotas | Per-user per-minute/day/month request and token limits in MongoDB, input/output caps, usage endpoint, reservation lifecycle, fail-closed (503) when MongoDB is offline | Implemented |
| Live key validation | `verify:integrations` can call Gemini `models.list` with the configured key; no run against live keys is recorded in this audit | Configuration-dependent |

---

## 8. Google Calendar integration

| Area | Implementation | Status |
|---|---|---|
| OAuth authorization | Authorization-code flow, `access_type=offline`, consent prompt; scopes `calendar.readonly`, `userinfo.email`, `openid` | Implemented |
| State protection | HMAC-signed state with nonce and 10-minute expiry, bound to an HTTP-only cookie | Implemented |
| Callback | `/api/integrations/google/callback`; redirects to `/settings?google=<result>`; requires MongoDB | Implemented |
| Token storage | AES-256-GCM encryption in the `User` document; excluded from API responses | Implemented |
| Token refresh and revocation handling | Automatic refresh; revoked/invalid grants mark the account disconnected and return `requiresReconnect` | Implemented |
| Connect / disconnect / test UI | Settings → Google Calendar integration | Implemented |
| Reading events | `GET /google/events` (primary calendar, ≤ 180-day window, normalization, meeting-link extraction) | Implemented |
| Events view in the UI | `Calendar.jsx` is not routed | Partially implemented |
| Creating or modifying events | Not in the code; scope is read-only | Planned |
| Syncing interviews to Google Calendar | Not in the code | Planned |
| Environment | Requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (matching Google Cloud) | Configuration-dependent |

The account link is in place for the deployed project. The OAuth consent flow itself is exercised through the browser against Google and is not part of the automated tests; the tests cover state signing, time-range validation, URL building, and event normalization.

---

## 9. Redis and background processing

| Area | Implementation | Status |
|---|---|---|
| Optional connection | `connectRedis()` is skipped without `REDIS_URL`; a failed connection (1.5 s timeout) is logged and ignored | Implemented |
| Run without Redis | Server starts, serves all routes, and reports `redis.operational: false`; startup run recorded in §12 | Implemented |
| Redis cache | `cacheService` (5-minute TTL; email idempotency markers); no-op when Redis is absent | Configuration-dependent |
| BullMQ queues and workers | `jobSyncQueue`, `aiQueue`, `notificationQueue` with workers; created only when Redis is connected | Configuration-dependent |
| Interview reminder delivery | Delayed jobs on `notificationQueue` + startup reconciliation; **not delivered without Redis** (records stay `SCHEDULED`) | Configuration-dependent |
| `jobSyncQueue`, `aiQueue` | Workers exist; no code enqueues to them | Planned |
| Current runtime | The Redis server failed to run in the developer's environment (per the project owner); no Redis-backed behavior (cache, queues, reminder delivery) has been tested, and none is claimed to work in the deployment | n/a |

---

## 10. Email and notifications

| Area | Implementation | Status |
|---|---|---|
| Resend client | REST integration, explicit `allowSend` guard, idempotency (in-process, Redis, header) | Configuration-dependent (`RESEND_API_KEY`) |
| Preferences | Job alerts, application reminders, interview reminders, unsubscribe flag; editable in Settings | Implemented |
| Interview reminder emails (3d/1d/6h/1h) | Template + queue-based delivery | Configuration-dependent (needs Redis and Resend) |
| Manual interview test email | `POST /api/interviews/:id/test-email` | Configuration-dependent (needs Resend; works without Redis) |
| Job-alert and application-reminder emails | Templates and worker handlers exist; nothing schedules or enqueues them | Planned |
| Sender | `.env.example` uses Resend's shared test sender; arbitrary recipients require a verified domain | Configuration-dependent |

---

## 11. Deployment configuration

| Area | Implementation | Status |
|---|---|---|
| Frontend hosting | Vercel, https://careerpilot-self-ten.vercel.app/ (HTTP request to the URL returns the app's HTML shell with the CareerPilot title); `client/vercel.json` SPA rewrite | Implemented |
| API base URL | `VITE_API_URL` at build time, default `/api` | Implemented |
| Backend hosting | Not defined in the repository (no Dockerfile, `render.yaml`, or Procfile; a commit message mentions Render) | Configuration-dependent |
| Production cookies/CORS | `NODE_ENV=production` → `secure` + `SameSite=None`; CORS from `CLIENT_URL` | Implemented |
| Docker Compose | MongoDB 7 and Redis 7 for local development only | Implemented |
| CI/CD | No pipeline configuration in the repository | Planned |

The live frontend was fetched to confirm it is serving. The deployed backend could not be probed because its URL is not in the repository, so live API behavior is not covered by this report.

---

## 12. Testing and build results

Commands run on Node 22.22.2 / npm 10.9.7 against the project as uploaded:

| Command | Result |
|---|---|
| `npm --workspace server test` | **116 tests, 116 pass, 0 fail** (17 test files, ~7 s) |
| `npm --workspace client test` | **7 tests, 7 pass, 0 fail** (`maskEmail` utility) |
| `npm run build` | Succeeded: 2,469 modules transformed; `index.js` 913 kB (242 kB gzip), `index.css` 67.6 kB; Vite warns the chunk exceeds 500 kB |
| Server start with `REDIS_URL` empty and an unreachable MongoDB URI | Started and listened. Log: `MongoDB connection failed. Continuing with fallback mode`, `BullMQ workers skipped because Redis is unavailable`, `Redis queue offline; reminder reconciliation deferred`. `GET /api/health` → `{"status":"ok"}`; `GET /api/health/ready` → 200 with `redis.operational: false`, `mongo.operational: false` |

What the server tests cover: Gemini dual-key failover and quota logic, AI schema validation and provider fallbacks, job provider adapters, normalization, work-mode classification, filtering/sorting, 30-day filtering and ingestion, application lifecycle, analytics, offline-auth fallback, queue configuration, Calendar event handling, and email/calendar edge cases. Tests use mocks and do not call live provider APIs. `npm run verify:integrations` (live checks with real keys) was not run, and there is no frontend component or end-to-end test suite and no coverage measurement.

---

## 13. Remaining functional limitations

1. Interview reminder emails are not sent automatically unless Redis is running.
2. Google Calendar is read-only; interviews are not written to Google Calendar, and the events view is not reachable from the UI.
3. `/api/ai/roadmap` and `/api/ai/interview-prep` have no UI.
4. Job-alert and application-reminder emails are never triggered.
5. Resume upload extracts text only from `.txt`/`.md`; PDF/DOCX content is not parsed.
6. If MongoDB is unavailable the API silently falls back to in-memory demo data; AI and Calendar connection are disabled.
7. Gemini cooldown re-promotion is not evaluated on the request path (see §7).
8. With the frontend on Vercel and the API on another domain, sign-in depends on third-party cookies being allowed.
9. The 913 kB single-bundle build is not code-split.
10. Provider results depend on external API availability; Adzuna needs credentials and The Muse/Adzuna ingest in the background after the first search.
11. Rate limiting and caches are per process; scaling to multiple instances would not share them.

---

## 14. Prioritized future improvements

| Priority | Improvement |
|---|---|
| High | Add an in-process or database-polled fallback so interview reminders send without Redis |
| High | Route `Calendar.jsx` (add `/calendar` and a sidebar entry) so connected users can view events |
| High | Add the backend deployment configuration (platform file or Dockerfile) and document the API URL |
| Medium | Add Google Calendar event creation for scheduled interviews (requires broadening scope beyond read-only) |
| Medium | Add UI for roadmap and interview prep; wire job-alert and application-reminder schedulers |
| Medium | Parse PDF/DOCX on resume upload |
| Medium | Re-evaluate Gemini key cooldown on each request so the primary key is restored after it expires |
| Low | Code-split the frontend bundle |
| Low | Add a CI workflow running `npm test` and `npm run build`; add frontend component and end-to-end tests |
| Low | Remove or use dormant code (`AIAnalysis`, `recommendationService`, unused queues) |
