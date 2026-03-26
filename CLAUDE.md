# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git
- Always use the full remote URL (not a remote name) when running git push (e.g. `git push https://github.com/ArendPeter/bettervoting.git <branch>`).
- Never push to any URL matching `github.com/Equal-Vote/*` without explicit confirmation.

## Commands

### Development
```bash
# Run frontend dev server
npm run dev -w @equal-vote/star-vote-frontend

# Run backend dev server (watch mode)
npm run dev -w @equal-vote/star-vote-backend

# Full local stack (app + postgres + keycloak + nginx + playwright)
docker compose up
```

### Building
```bash
# Build all packages
npm run build -ws

# Build a single package
npm run build -w @equal-vote/star-vote-backend
npm run build -w @equal-vote/star-vote-frontend
npm run build -w @equal-vote/star-vote-shared
```

### Testing
```bash
# Run backend unit tests
npm test -w @equal-vote/star-vote-backend

# Run a single backend test file
npx jest --testPathPattern=<filename> -w @equal-vote/star-vote-backend

# Run Playwright E2E tests (terminal-friendly output)
cd testing && npx playwright test --reporter=list

# Run a single Playwright test file
cd testing && npx playwright test tests/<filename>.spec.ts --reporter=list
```

### Database
```bash
# Run migrations
npm run migrate:latest -w @equal-vote/star-vote-backend

# Migrate up/down one step
npm run migrate:up -w @equal-vote/star-vote-backend
npm run migrate:down -w @equal-vote/star-vote-backend
```

### Linting
```bash
npm run lint -w @equal-vote/star-vote-frontend
```

## Architecture

This is a TypeScript monorepo with three packages: `backend`, `frontend`, and `shared`.

### Shared (`packages/shared/`)
Provides common TypeScript domain types (`Ballot`, `Candidate`, `Election`, `Race`, `ElectionRoll`, etc.), utilities, and a generated JSON schema. Both backend and frontend import from `@equal-vote/star-vote-shared`.

### Backend (`packages/backend/`)
Express app on port 5000 (or `BACKEND_PORT`). Entry point is `src/index.ts` which calls `makeApp()` and `setupSockets()`.

- **Routing** (`src/Routes/`): `/API/Elections`, `/API/Ballots`, `/API/Roll` (all require `getUser` middleware), `/API/Token`, `/API/Docs` (Swagger), `/API/SendGridWebhook`
- **Controllers** (`src/Controllers/`): Business logic for elections, ballots, rolls, users, SendGrid webhooks
- **Models** (`src/Models/`): Database access layer using Kysely (type-safe query builder over PostgreSQL)
- **Services** (`src/Services/`): Account, Azure Blob Storage, SendGrid email, logging, EventQueue (pg-boss)
- **Tabulators** (`src/Tabulators/`): Voting algorithm implementations (STAR, IRV, Approval, Ranked Robin, Plurality, STV)
- **Migrations** (`src/Migrations/`): Kysely database migrations
- **Auth** (`src/auth/`): Keycloak JWT integration
- **ServiceLocator**: Creates and shares Kysely DB instance, pg Pool, and pg-boss queue

The backend also serves the frontend static build with dynamic meta tag injection for election pages.

### Frontend (`packages/frontend/`)
React 17 app with Material-UI, built via RSBuild. Entry point is `src/index.tsx` → `App.tsx`.

- **Routing**: React Router v6. Key routes: `/` (landing), `/new_election`, `/election/:id` (or `/:id`), `/manage`, `/browse`, `/sandbox`
- **State**: React Context API providers wrapping the app — `FeatureFlagContext`, `ThemeContext`, `AuthSessionContext`, `ConfirmDialogContext`, `SnackbarContext`, `ReturnToClassicContext`
- **Components** (`src/components/`): Organized by feature — Election, ElectionForm, Header, Footer, etc.
- **i18n**: i18next with translation files in `src/i18n/`
- **Real-time**: socket.io-client for live election updates

### Testing (`testing/`)
Playwright E2E tests. `playwright.config.ts` reads `FRONTEND_URL` from `testing/.env`. Authentication is handled by the `auth.setup.ts` setup project; all other tests depend on it. Browsers: Chromium and Firefox (2 workers).

### Key Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `KEYCLOAK_URL`, `KEYCLOAK_SECRET` — Auth
- `SENDGRID_API_KEY`, `FROM_EMAIL_ADDRESS` — Email
- `ALLOWED_URLS` — CORS origins (default: https://bettervoting.com/)
- `DEV_DATABASE` — Set to `FALSE` to disable SSL for local Postgres
- `LOG_LEVEL` — Logging verbosity
- `FRONTEND_URL` (testing only) — Base URL for Playwright tests
