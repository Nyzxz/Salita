# Salita — Filipino Words & the Stories Behind Them

An interactive web app for international friends learning common Filipino
words and phrases, paired with the history and culture behind each one.
Built as a strongly-typed full-stack TypeScript monorepo: a React client,
an Express API serving mock data, and a shared types package that keeps
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
npm run lint           # ESLint across client/server/shared
npm run format          # Prettier, writes in place
```

## API reference

All responses use the shared envelope:
`{ success: boolean; data: T; error?: string }`.

| Method | Path                     | Description                                          |
| ------ | ------------------------ | ----------------------------------------------------- |
| GET    | `/api/health`            | Liveness check.                                       |
| GET    | `/api/words`             | All vocabulary words.                                 |
| GET    | `/api/words?category=food` | Words filtered by category (`greetings`, `food`, `values`, `phrases`). |
| GET    | `/api/words/:id`         | A single word by id.                                  |
| GET    | `/api/milestones`        | The full language history timeline, oldest first.     |
| GET    | `/api/quiz`              | All quiz questions.                                   |
| GET    | `/api/quiz?count=5`      | A random subset of `count` questions.                 |

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
- **Persistence:** the API is intentionally stateless mock data. Swapping
  `server/src/data/*.ts` for a real database means changing the *data
  layer* only — routes, middleware, and every shared type stay the same.
