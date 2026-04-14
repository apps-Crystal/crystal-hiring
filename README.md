# Crystal Group — AI-Powered Hiring System

End-to-end hiring pipeline built on Next.js 15, Google Sheets, Google Drive, and Gemini 2.0 Flash. Covers requisition → screening → AI evaluation → interviews → document collection → offer approval → offer acceptance.

## Tech stack

- **Framework:** Next.js 15 (App Router, React 19, TypeScript, Tailwind v4)
- **Database:** Google Sheets (via `googleapis`)
- **File storage:** Google Drive (shared drive)
- **AI:** OpenRouter → Gemini 2.0 Flash (CV OCR, JD-based questions, scoring, document verification)
- **Auth:** JWT sessions (`jose`), public token links for external users
- **Email:** Nodemailer (Gmail SMTP by default)

## Local development

1. Clone the repo
2. `npm install`
3. Copy `.env.example` → `.env.local` and fill in the values (see [Environment variables](#environment-variables) below)
4. `npm run dev`
5. Open http://localhost:3000

## Environment variables

All required env vars are listed in [`.env.example`](.env.example). Fill each one before running the app.

**Critical notes:**

- **`GOOGLE_PRIVATE_KEY`** must keep the `-----BEGIN/END PRIVATE KEY-----` markers. Replace real newlines with escaped `\n`. On Vercel, paste it wrapped in double quotes.
- **`GOOGLE_SHEETS_SPREADSHEET_ID`** — share the sheet with the service account email as Editor.
- **`GOOGLE_DRIVE_ROOT_FOLDER_ID`** — use a Shared Drive (not My Drive) and add the service account as Content Manager.
- **`SMTP_PASS`** — Gmail App Password. Requires 2-Step Verification enabled on the sending account. Create at https://myaccount.google.com/apppasswords
- **`JWT_SECRET`** — generate a strong random string (32+ chars). Same value must be used across all instances.

## Deploying to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Crystal hiring system"
git push origin main
```

### 2. Import the repo in Vercel

- Go to https://vercel.com/new
- Import your GitHub repo
- Framework preset: **Next.js** (auto-detected)
- Leave build settings at defaults

### 3. Add environment variables

In **Project Settings → Environment Variables**, paste every key from `.env.example`:

| Name | Value |
|---|---|
| `GOOGLE_SHEETS_SPREADSHEET_ID` | your sheet ID |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | service account email |
| `GOOGLE_PRIVATE_KEY` | full PEM with `\n` escapes, wrapped in `"..."` |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | shared drive ID |
| `OPENROUTER_API_KEY` | OpenRouter key |
| `JWT_SECRET` | 32+ char random string |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | HR Gmail address |
| `SMTP_PASS` | 16-char app password |
| `SMTP_FROM` | HR Gmail address |
| `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` (update **after** first deploy) |

### 4. Deploy

Click **Deploy**. Vercel will build and give you a URL like `your-project.vercel.app`.

### 5. Update `NEXT_PUBLIC_APP_URL`

After the first deploy, copy the production URL, set it as `NEXT_PUBLIC_APP_URL`, and redeploy. This ensures candidate and management email token links point to the production URL (not `localhost:3000`).

### 6. Share Drive & Sheet with the service account

- Share your Google Sheet with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as **Editor**
- Add the service account to your Shared Drive as **Content Manager**

### Function timeouts

`vercel.json` already sets `maxDuration: 60` for the routes that run Gemini vision (document verification) and large file uploads. Default Vercel limit is 10s which isn't enough for those.

## SOP modules

| Module | Status | Access path |
|---|---|---|
| 1 — Job Requisition | Built | Sidebar → Requisitions |
| 2 — Candidate Screening | Built | Sidebar → Screening |
| 3 — AI Evaluation | Built | Auto-triggered on screening submit |
| 4 — Screened Candidates Table | Built | Sidebar → Candidates |
| 5 — Interview | Built | Sidebar → Interviews |
| 6 — Document Collection | Built | Sidebar → Documents |
| 7 — Offer Approval & Release | Built | Sidebar → Offers |
| 8 — Offer Acceptance | Built | Public `/offer/accept/<token>` |
| 9 — Onboarding | Pending | — |

## Folder structure

```
app/
  (dashboard)/dashboard/     # Authenticated HR dashboard pages
  api/                       # Server routes
  documents/submit/[token]/  # Public candidate document upload
  offer/accept/[token]/      # Public candidate offer acceptance
  offers/approve/[token]/    # Public management offer approval
components/ui/               # Button, Modal, Input, Badge, etc.
lib/
  sheets.ts                  # Google Sheets read/write (live-header matching)
  drive.ts                   # Google Drive upload/download/search
  auth.ts                    # JWT sessions + public tokens (offer, document, approval, interview)
  email.ts                   # Nodemailer templates for all 7 email types
  ai.ts                      # OpenRouter/Gemini: JD questions, CV OCR, scoring, doc verification
```

## Roles

- **CHRO** — full access (the developer account uses this role)
- **TA_HEAD** — pipeline owner; can raise offers but not approve
- **HR_SENIOR** — round 1 interviews + screened candidates
- **HR_EXEC** — day-to-day screening
- **MANAGEMENT** — offer approval only

## Public token links (no login required)

- `/documents/submit/<token>` — candidate uploads ID proof, degree, appointment letter, pay slips, CV
- `/offers/approve/<token>` — management approves/rejects offers from email
- `/offer/accept/<token>` — candidate accepts/declines offer, uploads signed letter + resignation proof
- `/interview/<token>` — external interviewer submits feedback

All tokens are JWTs signed with `JWT_SECRET` with 7–30 day expiries depending on use case.
