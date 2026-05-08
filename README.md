# Wrong.

> How wrong are you today?

A daily, playful prediction game. Answer 10 binary questions, pick a confidence level (60/70/80/90), and let reality score you.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Prisma + SQLite (local)
- Custom email/password auth (bcryptjs + JWT in an httpOnly cookie via `jose`)
- No external paid APIs
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
