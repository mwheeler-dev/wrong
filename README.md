# Wrong.

> How wrong are you today?

A daily, playful prediction game. Answer 10 binary questions, pick a confidence level (60/70/80/90), and let reality score you.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Prisma + SQLite (local)
- Custom email/password auth (bcryptjs + JWT in an httpOnly cookie via `jose`)
- Optional OpenAI API for admin-only current-events question drafts
- Manual admin resolution

## Setup

1. **Install dependencies**
   ```
   npm install
   ```

2. **Configure environment**
   Copy `.env.example` to `.env` and edit the values:
   ```
   DATABASE_URL="file:./dev.db"
   AUTH_SECRET="<a long random string>"
   ADMIN_EMAIL="<the email you'll sign up with as admin>"
   ```

3. **Run the Prisma migration**
   ```
   npx prisma migrate dev --name init
   ```
   This creates `prisma/dev.db` and generates the Prisma client.

4. **Seed the database**
   ```
   npm run seed
   ```
   This inserts ~22 sample questions across all categories, all `PENDING`, published today, resolving in 3 days.

5. **Start the dev server**
   ```
   npm run dev
   ```
   Open http://localhost:3000

## How to play

- Sign up at `/signup`. Use the email you set in `ADMIN_EMAIL` if you want admin access.
- Visit `/play` for today's 10 questions. Each has a 30-second timer.
- For each: tap **YES** or **NO**, choose a confidence (60/70/80/90), and **Lock It In**.
- After locking in, you'll see crowd stats and an immediate result if the question is already resolved (otherwise: pending).
- After 10 questions you'll get the daily reflection prompt: *"What would change your mind?"* (optional).

## How resolution works

- An admin (account whose email matches `ADMIN_EMAIL`) visits `/admin`.
- They can create, edit, delete, and **resolve** questions.
- Resolving a question sets `correctAnswer = YES | NO` and `status = RESOLVED`, then atomically updates every related prediction's `score` and `resolvedAt`. Scoring is `+confidence` if correct, `-confidence` if wrong.
- Admin can also undo a resolution, which clears scores back to `null`.

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Landing |
| `/signup`, `/login` | Auth |
| `/play` | The 10-question round |
| `/dashboard` | Your stats: today / week / all-time, accuracy, avg confidence, most dangerous level, pending and resolved lists |
| `/leaderboards` | Weekly / all-time / category leaderboards (resolved scores only) |
| `/leagues` | Per-category breakdown |
| `/admin` | Admin-only: question CRUD + resolve |

## Architecture notes

- Pages are server components reading via Prisma; interactive sub-trees are client components (e.g. `PlayClient`, `AdminQuestionForm`).
- API routes live under `src/app/api/**`. Server actions are not used — fetch + JSON keeps things readable and easy to inspect.
- `Prediction` has `@@unique([userId, questionId])` so the same user cannot answer the same question twice (also enforced in the API).
- `DailyReflection` has `@@unique([userId, date])` and is upserted.
- All score-related views (dashboard totals, leaderboards) only count rows with non-null `score`.
- Crowd stats are returned only by the predict API after the user submits, so they cannot be peeked at beforehand.
- Admin gate is a single env var (`ADMIN_EMAIL`). No roles table.

## Scripts

- `npm run dev` — start dev server
- `npm run build && npm start` — production build
- `npm run seed` — re-seed sample questions
- `npm run prisma:studio` — open Prisma Studio
- `npm run prisma:migrate` — re-run migrations

## Admin question drafts and archive

`/admin` offers manual entry and **Generate with AI** (1–20 drafts, optional category/topic). Set `OPENAI_API_KEY` on the existing Railway **wrong** service to enable generation. The key stays on the server. `OPENAI_QUESTION_MODEL` optionally overrides the default `gpt-5.4-mini`; the model must support Responses web search and structured outputs. API usage is billed to that OpenAI API account separately from ChatGPT. No new services, dependencies, schema changes, migrations, or Android builds are required.

Generation researches current events and returns editable drafts with context sources. It does not write to the database. Review the question, official resolution source, criteria and timing; **Approve & create question** submits the existing `/api/admin/questions` POST, using the same publication and resolution behavior as manual entry. Navigate previous/next, skip, or restore skipped drafts. Unsaved edits survive carousel navigation; drafts are temporary and last until the page is reloaded. Created cards cannot be approved twice in the same review session. Manual entry works without an API key or if generation fails.

Larger draft requests run in groups of five. Each draft is validated independently; valid drafts remain reviewable when another draft or group fails, and the UI reports the skipped count. Recent saved questions and earlier drafts in the same run are excluded.

Pending question cards offer **Check with AI**. Checks research the saved resolution criteria and return a sourced YES/NO only when the outcome is final; unsettled, ambiguous, unverified, or failed checks are skipped. They never resolve questions or score predictions. Overdue and Needs Resolved Today offer bulk review for a chosen count or All, including other pages. Two independent requests run at a time, with progress, stop-after-current controls, and paginated results. Select verified results and approve them to use the existing resolution/scoring endpoint; each approval failure is isolated, and stale AI recommendations are rejected if the question changed. Keep the admin tab open while a bulk review is running.

Resolved questions live in `/admin/archive`, protected by the existing admin gate. Search text/criteria and filter by category, outcome and resolution deadline (UTC date boundaries). Results use server-side pagination (25 rows), compact expandable cards, and direct page jumps; existing Edit, Duplicate Card, Undo and Delete actions are preserved. The main admin queue fetches only pending questions plus a resolved count. All question/prediction records remain in the same tables, so player history and scoring continue to use their existing queries.

Verification: `node --import tsx --test tests/admin-questions.test.ts tests/admin-ai-checks.test.ts`, `npx tsc --noEmit`, and `npm run build`.
