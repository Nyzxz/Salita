# Salita — Filipino Words & the Stories Behind Them

An interactive web app for international friends learning common Filipino
words and phrases, paired with the history and culture behind each one.
Built as a strongly-typed full-stack TypeScript monorepo: a React client,
an Express API backed by MongoDB, and a shared types package that keeps
both sides honest.

## What's inside

- **Vocabulary & etymology explorer** — filterable cards across four
  categories (Greetings, Food & Dining, Cultural Values, Everyday Phrases),
  each with a phonetic guide, an English translation, the cultural context
  behind the word, and an audio-playback placeholder.
- **Language history timeline** — five eras from pre-colonial Baybayin
  script through Spanish rule, the American period, independence, and
  modern Taglish/slang, cross-linked to the vocabulary that came out of
  each one.
- **Practice module** — flip-card flashcards and a scored multiple-choice
  quiz, both driven by the same typed data.

## Project structure

```
filipino-lang-explorer/
├── shared/            @filipino-explorer/shared — type contracts only
│   └── src/types.ts     WordItem, LanguageMilestone, QuizQuestion, ApiResponse<T>, ...
├── server/            @filipino-explorer/server — Express + TypeScript API
│   └── src/
│       ├── data/        Mock WordItem / LanguageMilestone / QuizQuestion arrays
│       ├── routes/      /api/words, /api/milestones, /api/quiz
│       ├── middleware/  Error handling (shared ApiResponse envelope)
│       └── app.ts, index.ts
└── client/             @filipino-explorer/client — React + TypeScript (Vite + Tailwind)
    └── src/
        ├── api/          Typed fetch wrapper + endpoint functions
        ├── hooks/        useWords, useMilestones, useQuiz (built on a generic useAsync)
        └── components/   layout/, vocab/, timeline/, quiz/, common/
```

### Why a `shared` package, and how it's actually wired up

Both workspaces import from `shared/src/types.ts`, but **how** they import
from it differs on purpose:

- **Client (Vite):** uses the `@shared/*` alias (configured in
  `vite.config.ts` and mirrored in `tsconfig.app.json` for editor
  IntelliSense) pointing straight at `shared/src`. Vite bundles that source
  directly, so the client can import both types *and* the runtime
  `CATEGORY_META` constant with zero build step for `shared`.
- **Server (Node/NodeNext ESM):** imports only `import type { ... }` from
  `shared/src/types.ts` via a relative path. Type-only imports are fully
  erased at compile time, so there's nothing left to resolve at runtime —
  which sidesteps the usual monorepo headache of getting a second
  workspace's `.ts` source resolved by plain Node ESM. Anywhere the server
  needs an actual runtime value (e.g. validating a `?category=` query
  param), it uses a small local literal array with a comment noting it
  mirrors `shared/src/types.ts`, rather than pulling in a real cross-package
  runtime import.

This keeps both workspaces simple and correct in dev *and* after a
production build, without adding a bundler or a build step to `shared`
just to share four interfaces.

## Getting started

Requires Node.js 18.18+ and npm 10+.

```bash
# from the repo root
npm install          # installs all three workspaces
cp server/.env.example server/.env
cp client/.env.example client/.env

npm run dev           # runs the API (port 4000) and the client (port 5173) together
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` requests
to the Express server, so the client never needs to know the server's port.

Individual workspace scripts, if you'd rather run things separately:

```bash
npm run dev:server     # http://localhost:4000
npm run dev:client     # http://localhost:5173
```

### Building for production

```bash
npm run build          # builds server (dist/) then client (dist/)
npm run start           # runs the built server from server/dist/server/src/index.js
```

The built client (`client/dist/`) is static output — serve it from any
static host, or add a small Express static-file handler if you want the
server to serve it directly.

### Other scripts

```bash
npm run typecheck      # tsc --noEmit / tsc -b across all three workspaces
npm test --prefix server   # server unit tests
npm run lint           # ESLint across client/server/shared
npm run format          # Prettier, writes in place
```

## Roles

**Students** sign in to a six-tab dashboard (`/dashboard/student`):

| Tab | What it shows |
| --- | --- |
| Lectures | Teacher-written lectures for their grade, plus the vocabulary explorer |
| Quizzes | Teacher quizzes (timed, with due dates and attempt limits, answer review afterwards) and the practice flashcards/quiz |
| Activities | `ACTIVITY` tasks, each with a submission box |
| Performance Tasks | `PERFORMANCE_TASK` tasks, with an optional file attachment |
| My Grades | Everything submitted, with score and feedback once graded |
| Profile | Edit name/email and change password |

New or reset accounts must change their default password before anything else
works (enforced on the server, not just the UI). A notification bell shows new
content, grades and feedback. Students only see content for their own grade
(Grade 7–12) or marked "All grades".

**Teachers** get four tools from `/dashboard/admin`:

- **User management** — create students (an automatic default password is
  suggested), import a class from CSV, search and filter the directory, reset
  passwords, deactivate/reactivate, and delete accounts (which also removes
  their submissions and quiz results). Grades are limited to Grade 7–12.
- **Content studio** — write lectures, build quizzes, and set activities and
  performance tasks, each aimed at a grade level. Everything published can be
  edited or deleted afterwards. Quizzes support a time limit, a closing date, an
  attempt limit, and a switch for whether students may review correct answers.
- **Grading center** — Activities, Performance tasks and Quizzes tabs, paged 50
  at a time and refreshed every ten seconds while the tab is visible. Late and
  resubmitted work is flagged, attachments can be downloaded, and a grade is
  refused if the student resubmitted while the teacher was grading.
- **Class analytics** — per-quiz averages, question-by-question analysis (which
  questions the class misses), per-student progress, and a gradebook CSV export.

## Sign-in and sessions

The session token (HMAC-signed, valid eight hours) lives in an **httpOnly,
SameSite=Strict cookie**, so page scripts cannot read it. Every request from the
app also sends an `X-Requested-With: salita` header, which the server requires
for any change made with the cookie. A `Bearer` header is still accepted for
scripts and tests. Signing out clears the cookie on the server, and changing or
resetting a password invalidates every token issued before it.

Login protections:

- Every credential failure returns the same message, and a dummy password check
  keeps timing even, so usernames can't be discovered.
- An account locks for 15 minutes after 3 wrong passwords (silently).
- Failures are also counted per IP (30 per 15 minutes, stored in MongoDB), so one
  person can't lock the whole class out for long, and it works on Vercel.
- Deactivated users are cut off immediately, since every request re-checks the DB.

Before deploying to Vercel, set private `AUTH_SECRET` and `MONGO_URI`
environment variables and redeploy. Never commit `.env` files. Production login
does not migrate legacy demo users; local-only migration needs
`DEV_TEACHER_PASSWORD` and `DEV_STUDENT_PASSWORD` in the ignored `server/.env`.
When Express is deployed separately from the client, set `CORS_ORIGINS` to the
trusted frontend origins.

## Limits and safety

- Server-side length caps on all submitted and authored text (submissions
  10,000 characters, feedback 2,000, short fields 200, quiz questions 500),
  mirrored in the database models and the form inputs. Points are whole
  numbers up to 1000.
- Lists are paginated (`?page=&limit=`, default 50, max 200).
- File attachments (performance tasks only): PDF, PNG, JPG, DOCX or TXT, up to
  1 MB, checked by their real contents, stored in MongoDB, and served with
  download-only headers.
- Quiz time limits and attempt limits are enforced on the server, not the page.
- Express applies request throttling, Helmet headers and a JSON body limit.
  Vercel adds browser security headers, but its serverless functions do not run
  Express middleware.

## Vercel deployment

Root Directory is `client`; the API lives in `client/api/` as serverless
functions. The project uses **11 of the 12** functions the Hobby plan allows, so
new routes are multiplexed into existing functions with query parameters and
rewrites in `client/vercel.json` instead of adding files:

| Function | Also serves |
| --- | --- |
| `api/words.ts` | `/api/health` |
| `api/tasks.ts` | `/api/content/lectures`, `/api/content/tasks` (and `/:id` for edit/delete) |
| `api/quiz.ts` | `/api/quizzes/*` (start, submit, results, analytics, edit/delete) |
| `api/submissions.ts` | `/api/submissions/me`, file upload and download |
| `api/auth/me.ts` | profile, password change, logout, notifications |
| `api/admin/students.ts` | CSV import (`?action=import`), gradebook export (`?export=gradebook`) |

## API reference

All responses use the envelope `{ success, data, error?, meta? }`; paginated
lists add `meta: { total, page, limit }`. "Signed in" means a valid session
cookie.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/api/health` | Liveness check. `?deep=1` also pings the database. Public. |
| POST | `/api/auth/login` | Sign in; sets the session cookie. 401 on any failure, 429 when throttled. |
| GET / PUT | `/api/auth/me` | Current user / edit own name and email. |
| POST | `/api/auth/me?action=password` | Change password (issues a fresh cookie). |
| POST | `/api/auth/me?action=logout` | Clear the session cookie. |
| GET | `/api/auth/me?action=notifications` | Own notifications and unread count. |
| POST | `/api/auth/me?action=notifications-read` | Mark `{ ids }` or `{ all: true }` read. |
| GET | `/api/words`, `/api/milestones`, `/api/quiz` | Practice content. Signed in. |
| GET | `/api/content/lectures` | Lectures (students: their grade only). |
| POST / PUT / DELETE | `/api/content/lectures[/:id]` | Create, edit, delete. Teacher. |
| GET | `/api/tasks` | Activities and performance tasks. |
| POST / PUT / DELETE | `/api/content/tasks[/:id]` | Create, edit, delete. Teacher. |
| GET | `/api/quizzes` | Quizzes (teachers also receive correct answers, for editing). |
| POST / PUT / DELETE | `/api/quizzes[/:id]` | Create, edit, delete. Teacher. |
| POST | `/api/quizzes/:id/start` | Open a quiz (starts the clock; checks due date and attempts). Student. |
| POST | `/api/quizzes/:id/submit` | Submit answers; returns the score and, if allowed, the review. Student. |
| GET | `/api/quizzes/attempts/me` | Own attempts, with review where allowed. Student. |
| GET | `/api/quizzes/results` | All attempts, paged. Teacher. |
| GET | `/api/quizzes/analytics` | Class and per-student analytics. Teacher. |
| GET | `/api/submissions/me` | Own submissions. Student. |
| POST | `/api/submissions` | Submit or resubmit `{ taskId, content, attachmentId? }`. Student. |
| POST | `/api/submissions?route=attachment` | Upload a file for a task. Student. |
| GET | `/api/submissions?route=attachment&id=` | Download a file (its owner or a teacher). |
| GET | `/api/admin/submissions` | Submissions, paged; `status`, `taskType`, `taskId` filters. Teacher. |
| PUT | `/api/admin/submissions/:id` | Grade `{ grade, feedback?, expectedSubmittedAt? }`; 409 if the work changed. Teacher. |
| GET | `/api/admin/students` | Directory, paged; `q`, `section`, `status` filters. `?export=gradebook` returns a CSV. Teacher. |
| POST | `/api/admin/students` | Create a student. `?action=import` creates up to 10 from CSV rows. Teacher. |
| PUT / DELETE | `/api/admin/students/:id` | Update details, reset password, change status / delete. Teacher. |

## Tests and CI

```bash
cd server && npm test      # node:test unit tests: scoring, parsing, cookies, tokens, CSV, uploads
```

`.github/workflows/ci.yml` typechecks and tests the server and builds the client
on every push and pull request.

## Design notes

The UI leans into a "night crossing" palette — deep indigo/teal background,
a single warm gold accent, a muted clay secondary — instead of a generic
light SaaS look, echoing the seafaring trade routes (and star navigation)
that first carried loanwords into the islands. Typefaces are Fraunces
(display) and Public Sans (body), loaded from Google Fonts in `index.html`.

Word histories are intentionally simplified for first-time learners.
Etymology in the Philippines is often genuinely debated among linguists
(see `Po`/`Opo` and `Bahala Na` in `server/src/data/words.data.ts`) —
the app hedges those with "likely" / "believed to" rather than asserting
a single settled origin.

## Pushing to GitHub

This workspace is ready to become a fresh repository:

```bash
git init
git add .
git commit -m "Initial commit: Salita — Filipino vocabulary & culture explorer"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

`.gitignore` already excludes `node_modules/`, build output, `.env` files,
and editor cruft, so nothing generated gets committed.

## Extending the app

- **Real audio:** drop files under `client/public/audio/` and set
  `audioUrl` on the relevant `WordItem` in `server/src/data/words.data.ts` —
  the `AudioButton` component already handles the playable case.
- **More words/eras:** add entries to the arrays in `server/src/data/`;
  types will guide you (e.g. `category` only accepts the four known
  values), and quiz questions in `quiz.data.ts` can reference any
  `WordItem` by its `id`.
- **Persistence:** MongoDB stores users, authored learning content, submissions,
  grades, and quiz attempts. Keep `MONGO_URI` and `AUTH_SECRET` in deployment
  environment settings, not in source control.
