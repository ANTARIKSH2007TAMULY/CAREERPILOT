# CareerPilot Demo Script

**Live application:** https://careerpilot-self-ten.vercel.app/
**Duration:** 6–8 minutes on the trimmed path (skip the items marked *optional*); about 9 minutes with every step
**Audience:** evaluators or reviewers seeing the deployed app for the first time

---

## Before you start (2 minutes, off camera)

1. Open the live URL once so the backend is awake and the first job search is warm. The first search triggers provider fetches and can take longer than later ones.
2. Decide which account to demo with:
   - **Fresh account:** use **Register** during the demo. It shows the real sign-up flow, but the new account has no applications and no Google Calendar link.
   - **Your existing account:** log in with your own credentials. If you have already tracked a few roles, the Dashboard and Analytics will look far better. Google Calendar is linked per user, so only an account that has already connected will show the connected state.
   - Recommended: log in with your pre-populated account, and keep a second browser window ready to show registration if asked. Do not put real credentials in slides or the repository.
3. Have a short resume paragraph pasted in your profile or ready to paste (used in step 8).
4. Open the app in a normal browser window with third-party cookies allowed. Login uses a cookie issued by the API domain; some browsers block that.
5. Keep AI use to three or four requests. Quotas apply per user (5 per minute, 20 per day by default).

**Avoid in the demo:** interview reminder emails (they are not sent automatically unless Redis is running), the Google Calendar event list (the page exists in the code but has no menu entry or route), and the roadmap / interview-prep API endpoints (no UI).

---

## Step 1: Opening (≈ 30 s)

**Open:** `https://careerpilot-self-ten.vercel.app/` (Landing page, `/`).

**Show:** the landing page hero, the **Login** and register buttons in the header.

**Say:** "CareerPilot is a job search and application tracker for students and early-career candidates. It pulls live listings from Adzuna, The Muse, and Remotive, lets me track every application through a pipeline, shows analytics on how my search is going, and adds Gemini-powered coaching. It's a React front end on Vercel with an Express and MongoDB back end."

**Expected result:** the landing page loads; theme follows the system setting.

---

## Step 2: Registration or login (≈ 45 s)

**Open:** click the register button (`/register`), or **Login** (`/login`).

**Do (new account):** fill full name, email address, and a password of at least 6 characters (a strength indicator shows Weak/Medium/Strong), then click **Create Your Account**.

**Do (existing account):** on the **Welcome Back** page, enter email and password and click **Sign In**.

**Say:** "Authentication is email and password. Passwords are hashed with bcrypt and the session is a JWT in an HTTP-only cookie, so the token is never exposed to JavaScript. Every data route is scoped to the signed-in user."

**Expected result:** you are redirected into the app shell with the sidebar visible. Invalid credentials show an error message; unauthenticated visits to protected paths redirect to `/login`.

---

## Step 3: Dashboard walkthrough (≈ 45 s)

**Open:** **Dashboard** in the sidebar (`/dashboard`, titled "Welcome back, <first name>").

**Show:** the stat cards (Total Applications, Active Pipeline, Interviews, Offers, Response Rate), the trend chart and its range selector (7 days / 30 days / 90 days / 6 months), recent applications, upcoming deadlines and interviews, and the featured jobs.

**Say:** "The dashboard summarizes my pipeline from my own application data: how many I've submitted, how many are active, and my response rate. Upcoming deadlines and interviews are listed so nothing slips."

**Expected result:** cards and chart populate from the signed-in user's data. A brand-new account shows zeros and empty states.

---

## Step 4: Job search and filtering (≈ 1 min)

**Open:** **Discover Jobs** (`/jobs`).

**Do:**
1. Type a keyword (for example `react`) in the search box and press Enter or search.
2. Enter a location such as `Remote` or a city.
3. Use the filters: **Job type** (Full-time, Internship, Contract, Part-time), **Work mode** (Remote, Hybrid, On-site, Unspecified), **Experience level** (Entry, Mid, Senior), and **Source** (Adzuna, The Muse, Remotive).
4. Change **Sort** (Newest first, Highest salary, Job title A-Z, Oldest first) and move to page 2.

**Say:** "The backend queries three providers in parallel, normalizes each into one schema, removes duplicates, keeps only postings from the last 30 days, and stores them in MongoDB. Filters, sorting, and pagination all run server-side. If one provider is down, the others still return results."

**Expected result:** job cards update with each filter; the Source filter restricts to one provider; pagination moves through results. If a provider has no credentials on the server (Adzuna needs them), its jobs simply won't appear.

---

## Step 5: Job details and saving (≈ 45 s)

**Open:** click a job card to open `/jobs/:id`.

**Do:**
1. Read the title, company, location, work mode, salary (when provided), skills, and description.
2. Go back and click the bookmark icon on a card (or use the save control on the details page) to save the job.
3. Open **Saved Roles** (`/saved-jobs`) and show the saved job; use the search box there.

**Say:** "Saving stores a snapshot of the job, so it stays in my list even if the provider removes the listing. Applying always goes to the employer's own site through the external link."

**Expected result:** the job appears in Saved Roles; removing it there or unsaving it from the card removes it. The external apply link opens the provider's posting.

---

## Step 6: Application tracking and status changes (≈ 1 min 15 s)

**Open:** on the job details page, use the tracker control to add the role to your pipeline (as Interested or Applied) and change its status from the status dropdown (Interested, Applied, Interview Scheduled, Offer Received, Offer Accepted, Rejected, Withdrawn). Then open **Application Tracker** (`/applications`).

**Do:**
1. Show the **Board** view (Kanban columns by stage) and switch to the **List** view.
2. Click **Track New Role** to add one manually: fill in role, company, and status, and click **Add to Pipeline**.
3. Change a status (use the card's status control or edit the application) and show it move.
4. Use the search box, the stage filter, and the sort selector (Recently Updated, Date Applied, Company, Role Title).
5. *Optional:* schedule an interview for an application (calendar/schedule action on the card or row) and fill in type, time, and meeting link.

**Say:** "Each application has a status history, notes, a deadline, and optional interviews. Tracking the same job twice does not create a duplicate; the tracker returns the existing entry. Status changes here feed the dashboard and analytics immediately."

**Expected result:** the new application appears in the correct column; status changes persist after a refresh; adding the same job again returns the existing application with the message "Application already tracked for this role" instead of creating a second one. Do not promise reminder emails for the interview: scheduled reminders are stored but are only delivered when Redis is running.

---

## Step 7: Profile management (≈ 30 s)

**Open:** **Candidate Profile** (`/profile`).

**Do:** edit skills (comma-separated), preferred roles, locations, job types, and work modes, add LinkedIn / GitHub / portfolio links, and click **Save Profile Changes**.

**Say:** "The profile feeds the AI features: Gemini sees my skills and target roles when it scores a job or answers a coaching question."

**Expected result:** a success confirmation; values persist on reload. The skills you save are what the job-match analysis compares against.

---

## Step 8: Gemini-powered AI features (≈ 1 min 30 s)

**8a. Job match.** Open any job (`/jobs/:id`) and scroll to **Candidate Fit Analysis**.
- Show the match score, matching strengths, missing skills, and recommendations.
- **Say:** "This sends my profile and the job description to Google Gemini and validates the JSON that comes back. If Gemini is unavailable it falls back to a local skill-overlap estimate, clearly labelled as not AI-generated."

**8b. Resume analysis.** Open **Resume & Fit** (`/resume`).
- Paste or edit resume text and click **Save to profile**, then click **Analyze Profile & Resume**.
- Show the strengths, skill gaps, and suggestions.
- **Say:** "Text files load directly into the editor; for PDF or Word files only the file name is recorded, so I paste the text here."

**8c. AI Career Coach.** Open **AI Career Coach** (`/ai-coach`).
- Click one of the suggested prompts (for example, which jobs to prioritize) or type a question.
- Show the answer and the usage display on the page.
- **Say:** "Each user has per-minute, daily, and monthly request and token limits, tracked in MongoDB. We run two Gemini API keys: requests use the primary key, and if it is rate-limited or fails, the request is retried on the secondary key automatically."

**Expected result:** each panel shows structured results within a few seconds. If a limit is reached the UI shows the quota message instead of failing silently. If Gemini is unreachable, job match and the coach return the labelled local fallback.

---

## Step 9: Analytics (≈ 45 s)

**Open:** **Pipeline Analytics** (`/analytics`).

**Do:** change the range selector (Last 30 days / Last 90 days / Last 6 months) and point at the four charts: **Applications over time**, **Applications by stage**, **Applications by job type**, and **Work mode distribution**, plus the conversion metrics (response rate, interview conversion, offer conversion, rejection rate).

**Say:** "These are computed on the server from my own applications: for example, response rate is the share of submitted applications that reached assessment, interview, offer, or a rejection."

**Expected result:** charts reflect the applications you created in step 6; with no data, charts show empty states.

---

## Step 10: Google Calendar connection (≈ 45 s)

**Open:** **System Settings** (`/settings`, "Settings & Integrations"), scroll to **Google Calendar integration**.

**Do:**
1. If the account is already connected, show the status banner ("Google Calendar is actively connected"), the connected Google account, and the connection date, then click **Test Connection**.
2. *Optional, if you want to show the consent flow:* click **Connect Calendar** (the button reads **Reconnect Different Account** when already connected), choose a Google account, and approve the read-only permission; you are returned to Settings with a success message.

**Say:** "Google Calendar is linked through OAuth. The app requests read-only calendar access, stores the tokens encrypted with AES-256-GCM, and refreshes them automatically. It can read events from the primary calendar, but it does not create or edit events and does not sync interviews to Google. I can disconnect at any time, which revokes the token at Google."

**Expected result:** Test Connection reports the calendar connection as working for a linked account. A user who has not connected sees **Connect Calendar**. If the Google OAuth app is still in testing mode, only Google accounts added as test users can complete consent.

---

## Step 11: Closing summary (≈ 30 s)

**Open:** return to the **Dashboard**.

**Say:** "To recap: CareerPilot discovers jobs from three providers, tracks every application through a pipeline, visualizes progress, and uses Gemini for job-fit analysis, resume review, and coaching, with two API keys for resilience and per-user quotas. It runs without Redis; Redis only adds automatic interview-reminder emails. Next steps would be writing interviews to Google Calendar, a calendar view in the UI, and parsing PDF resumes. The code and documentation are at https://github.com/ANTARIKSH2007TAMULY/CAREERPILOT."

**Expected result:** the audience has seen discovery, tracking, analytics, AI, and the Calendar link on the live deployment.

---

## Timing summary

| Step | Topic | Time |
|---|---|---|
| 1 | Opening | 0:30 |
| 2 | Register / login | 0:45 |
| 3 | Dashboard | 0:45 |
| 4 | Job search and filters | 1:00 |
| 5 | Job details and saving | 0:45 |
| 6 | Application tracking | 1:15 |
| 7 | Profile | 0:30 |
| 8 | Gemini AI features | 1:30 |
| 9 | Analytics | 0:45 |
| 10 | Google Calendar | 0:45 |
| 11 | Closing | 0:30 |

Total ≈ 9 minutes at full length. To land in the 6–8 minute range, skip the optional items in steps 6 and 10 and shorten step 7 to a single field edit.

## If something goes wrong

- **Login succeeds but the app bounces back to `/login`:** the browser is blocking the API's cookie; allow third-party cookies for the site or use another browser.
- **First job search is slow or sparse:** providers are being fetched for the first time; wait a few seconds and search again.
- **AI shows a limit message:** wait for the next minute window (5 requests per minute) or continue with the other features.
- **AI responses look generic and mention a local estimate:** the app fell back to its heuristic mode; explain that this is the designed fallback when Gemini is unavailable.
