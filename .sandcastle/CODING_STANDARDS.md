# Coding Standards

<!-- Customize this file with your project's coding standards.
     The reviewer agent loads it during code review via @.sandcastle/CODING_STANDARDS.md
     so these standards are enforced during review without costing tokens during implementation. -->

## Style

<!-- Example:
- Use camelCase for variables and functions
- Use PascalCase for classes and types
- Prefer named exports over default exports
-->

### Naming
- **camelCase** for variables, functions, and properties (`electionRes`, `makeBallotEvent`, `setSnack`)
- **PascalCase** for TypeScript interfaces, types, React components, and service/model class files (`Election`, `IRequest`, `IElectionContext`, `GenericBallotView`, `Elections.ts`, `EmailService.ts`)
- **snake_case** for database/domain-model fields (`election_id`, `ballot_id`, `date_submitted`, `num_winners`)
- **SCREAMING_SNAKE_CASE** for module-level constants and feature-flag keys (`FREE_TIER_PRIVATE_VOTER_LIMIT`, `CLASSIC_DOMAIN`)
- **PascalCase** for feature-area folders under `components/` (`Election/`, `Admin/`, `ElectionForm/`, `GenericBallotView/`)
- **camelCase** for utility/hook files (`useAPI.ts`, `controllerUtils.ts`)

### Exports
- **Default exports** for React components (`export default function MyComponent`)
- **Named exports** for utilities, hooks, and backend controllers (`export { createElectionController }`, `export const useGetElection = ...`)
- **Barrel `index.ts` files** to re-export from a feature folder (`export * from './archiveElectionController'`)

### TypeScript
- Backend has **strict mode enabled** (`"strict": true`, `strictNullChecks: true`); frontend does not (`"strict": false`)
- Use **`interface`** for object contracts and context shapes (`IElectionContext`, `IBallotStore`, `IRequest`)
- Use **`type`** for unions, primitives, and mapped/utility types (`PartialBy<T, K>`, `ElectionState`)
- Extend domain models with partial types rather than redefining: `export interface NewElection extends PartialBy<Election, 'election_id' | 'create_date' | ...> {}`
- Frontend uses the `~/` path alias for `src/`-relative imports (`import { ... } from "~/components/util"`)

### Imports
Order imports as: (1) external packages, (2) monorepo packages (`@equal-vote/*`), (3) local relative paths. No blank line required between groups but keep the order consistent.

## Testing

<!-- Example:
- Every public function must have at least one test
- Use descriptive test names that explain the expected behavior
-->

### Backend unit tests (Jest)
- Test files use **`.test.ts`** suffix and live next to the file under test (or in `packages/backend/src/test/`)
- Structure with nested `describe`/`it` (or `test`) blocks; one top-level `describe` per module
- Use the shared `TestHelper` class for database setup/teardown; call `jest.clearAllMocks()` and `th.afterEach()` in `afterEach`
- Centralize fixture data in `packages/backend/src/test/testInputs.ts` (`testInputs.Election1`, `testInputs.user1token`, etc.)
- Mock model dependencies via files in `packages/backend/src/Models/__mocks__/`
- Assert with Jest's `expect()` API (`toBe`, `toBeTruthy`, `toHaveLength`, etc.)

### E2E tests (Playwright)
- Test files use **`.spec.ts`** suffix and live in `testing/tests/`
- Group tests with `test.describe()`; one describe block per user flow
- Target elements by role and accessible name: `page.getByRole('button', { name: 'Create Election' })`
- For MUI Switch, target by `role="switch"` and label name (see CLAUDE.md for full details)
- All test files depend on the `auth.setup.ts` setup project (user must be logged in)

### What to test
- Every API controller should have a corresponding test in `packages/backend/src/test/`
- All voting-algorithm tabulators must have unit tests in `packages/backend/src/Tabulators/*.test.ts`
- Key user flows (create election, cast ballot, view results) must have Playwright E2E coverage

## Architecture

<!-- Example:
- Keep modules focused on a single responsibility
- Prefer composition over inheritance
-->

### Backend controller pattern
- One exported controller function per file; name the file after the function (`castVoteController.ts`)
- Signature: `async function xyzController(req: IElectionRequest, res: Response, next: NextFunction)`
- Log entry with `Logger.info(req, "Xyz Controller")` as the first line
- Throw `@curveball/http-errors` types for HTTP failures (`BadRequest`, `Unauthorized`, `Conflict`); `asyncHandler` catches and forwards them
- Access all services/models through `ServiceLocator` (`ServiceLocator.electionsDb()`, `ServiceLocator.emailService()`)

### Backend model pattern
- Define a store interface first (`IBallotStore.ts`), then implement it in the concrete class (`Ballots.ts`)
- Constructor takes the Kysely DB client: `constructor(postgresClient: Kysely<Database>)`
- Method signature convention: `async methodName(param: Type, ctx: ILoggingContext, reason: string): Promise<ReturnType>`
- Log on entry: `Logger.debug(ctx, 'ClassName.methodName', relevantData)`

### Backend logging
- Use the static `Logger` service (`Logger.debug`, `.info`, `.warn`, `.error`, `.state`)
- Always pass the request/context as the first argument so log lines carry a `contextId`

### Frontend context/state
- React Context API is the state primitive (no Redux or Zustand)
- Pattern: define `interface IXyzContext` → create context with `createContext<IXyzContext>(defaultValue)` → export a `XyzContextProvider` component → export a `useXyz()` custom hook (`export default function useXyz() { return useContext(XyzContext) }`)
- Compose top-level providers through `ComposeContextProviders` in `App.tsx` rather than nesting JSX manually

### Frontend component structure
- Organize by feature/page under `packages/frontend/src/components/` (e.g., `Election/Admin/`, `Election/Voting/`, `Election/Results/`)
- Define a `Props` interface (or inline type) at the top of the component file, immediately before the component function
- Use default parameter values for optional props rather than `| undefined` checks in the body

### Shared domain models
- All shared types live in `packages/shared/src/domain_model/`; both backend and frontend import from `@equal-vote/star-vote-shared`
- Pair each domain model interface with a `xyzValidation(obj: Xyz): string | null` function in the same file
- Domain model fields use `snake_case` even though application code uses `camelCase`
