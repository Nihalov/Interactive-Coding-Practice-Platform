# CodeArena

CodeArena is an interactive Java coding-practice platform. Users can browse problems, run Java code against sample cases, submit it for asynchronous judging, review their submission history and progress, and keep a per-problem dry-run workspace.

## What is implemented

- Registration, login, JWT authentication, role-protected admin APIs, and an admin dashboard for problem/test-case management
- Problem browsing with case-insensitive title/slug search, difficulty filtering, sorting, and pagination
- Opening a problem editor or dry-run workspace saves an in-progress status; judged submissions count attempts and accepted solutions mark problems solved
- Sample execution and asynchronous submission judging through RabbitMQ
- Docker-isolated Java execution with CPU, memory, process, timeout, output, filesystem, and network restrictions
- PostgreSQL persistence, Redis-backed caching and rate limiting, submission recovery, and progress statistics
- A React/Monaco editor, submission history, and a saved workspace with editable arrays, variables, pointers, notes, connecting arrows, deletion, and undo/redo

Operational tooling is still being completed. WebSocket updates, richer problem metadata, comprehensive integration tests, OpenAPI documentation, and CI are not implemented yet.

## Prerequisites

- Java 25 and Maven Wrapper support (`java --version`)
- Node.js 20 or later and npm
- Docker Desktop with Docker Compose
- The Docker image used for untrusted Java execution:

  ```powershell
  docker pull eclipse-temurin:21-jdk
  ```

## Local setup

1. Create local configuration. Do not commit the resulting `.env` file.

   ```powershell
   Copy-Item .env.example .env
   ```

   Replace every `CHANGE_ME` value. Use a distinct, locally generated value for `JWT_SECRET` that is at least 32 characters long.

2. Start PostgreSQL, RabbitMQ, and Redis through Compose:

   ```powershell
   docker compose up -d
   docker compose ps
   ```

   PostgreSQL is exposed at `localhost:5433`, RabbitMQ at `localhost:5672`, Redis at `localhost:6379`, and the RabbitMQ management UI is at [http://localhost:15672](http://localhost:15672).

   On the current development machine, an ignored `compose.override.yaml` automatically selects `postgres:16` and reuses the original database volume as an external volume. The database runs as `codearena-postgres-1` inside the `codearena` stack. The old standalone `codearena-postgres` container is retained but must stay stopped: it uses the same data and port. Database backups are kept in the ignored `backups/` directory.

   For a **fresh installation on another machine**, the base Compose file creates a new database volume. It does not import existing problems or accounts. To reuse an existing PostgreSQL installation, stop its container before starting Compose, use a compatible image and data mount, and configure its volume as external in a local override. Never run two PostgreSQL servers against the same data directory.

3. Start the backend in a second terminal.

   ```powershell
   Set-Location backend
   .\mvnw.cmd spring-boot:run
   ```

   The backend loads `../.env` automatically when started from `backend`. It listens on [http://localhost:8080](http://localhost:8080). Hibernate creates or updates the local schema; use only a disposable development database until migrations are added.

4. Start the frontend in a third terminal.

   ```powershell
   Set-Location frontend
   npm ci
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api` requests to the backend.

## Verify the local stack

Run these checks after startup:

```powershell
# Load the local configuration for the Redis check in this PowerShell session.
Get-Content .env | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') { Set-Item -Path "Env:$($matches[1])" -Value $matches[2] }
}

docker ps
docker compose exec postgres pg_isready -U codearena -d codearena
docker exec codearena-rabbitmq-1 rabbitmq-diagnostics -q ping
docker exec -e REDISCLI_AUTH=$env:REDIS_PASSWORD codearena-redis-1 redis-cli ping
```

The expected results are `accepting connections`, `Ping succeeded`, and `PONG`.

Then create an account at `/register`, log in, open a seeded/admin-created problem, run the supplied `Solution` code, and submit it. A completed submission should appear in **My submissions** and update the dashboard.

## Everyday commands

```powershell
# Frontend quality checks
Set-Location frontend
npm run lint
npm test
npm run build

# Backend tests
Set-Location ..\backend
.\mvnw.cmd test

# Stop infrastructure without deleting data
Set-Location ..
docker compose stop
```

## Architecture

```text
React + Monaco -> Spring Boot API -> PostgreSQL
                              |-> Redis
                              |-> RabbitMQ -> submission worker -> Docker Java sandbox
```

The backend application and RabbitMQ worker currently run in the same Spring Boot process. The queue keeps long-running judging off the HTTP request thread; Docker executes each submission in an isolated container.

## Automated tests

Run the backend unit tests from `backend` with Java 25:

```powershell
.\mvnw.cmd test
```

These tests do not start Spring Boot, load `.env`, connect to PostgreSQL/RabbitMQ/Redis, or execute submitted Java code. `JudgeServiceTest` uses a deterministic execution session to check verdicts, output comparison, case ordering, stop-on-failure behavior, and cleanup/error propagation. `WorkspaceValidatorTest` checks schema and element limits, array values, coordinates, pointer references and indexes, and arrow endpoints.

Run the frontend workspace tests from `frontend`:

```powershell
npm test
```

These cover workspace editing, reference cleanup, undo/redo, and admin HTTP request/response contracts. Database/API integration, authentication/authorization, worker recovery, and actual Docker sandbox behavior still need separate test coverage.

## Admin dashboard

Log in with an existing `ADMIN` account and select **Admin** in the navigation, or open `/admin`. The dashboard shows problem counts by difficulty, a paginated catalog, and links to create or manage problems.

Use the difficulty cards or filters to narrow the library, sort by title or creation order, and choose 10, 25, or 50 rows per page. Editor forms show unsaved changes, validate required fields inline, and offer a plain-text statement preview. Leaving an edited form through navigation, browser Back, or logout asks whether to discard edits; refreshing or closing the tab uses the browser's native warning.

Create a problem, then add its test cases on the management page. Test cases default to **Hidden**; choose **Sample** when the input and expected output should be visible to learners. Inputs and outputs may be empty, and their whitespace is preserved. You can edit or delete individual cases and change their visibility.

The test-case list has separate sample/hidden filters. Switching or closing a test-case editor with unsaved edits asks for confirmation. Deletion uses keyboard-accessible confirmation dialogs; cancelling keeps the existing data and edits.

Problem edits keep the existing slug/URL. Deleting a problem requires confirmation and is refused by the backend if submissions exist. Regular user accounts cannot access the admin pages, and all write/hidden-test endpoints continue to require the backend's `ADMIN` role.

Registration always creates a `USER`; there is no public admin signup or role-changing control. If an existing account's role is changed through database administration, log out and log in again to obtain a JWT containing its new role.

## Important development notes

- Never use `app.runner.mode=local` with untrusted code. The default Docker mode is required for normal development.
- `.env` contains credentials and is intentionally ignored by Git. `.env.example` contains placeholders only.
- The Compose file manages dependencies, not the backend/frontend. Run those locally using the commands above so the Docker executor can access the host Docker daemon.
- Container data stays in Docker volumes when stopped. The original PostgreSQL container uses its existing volume; Compose installations use separate named volumes.

## Dry-run workspace

Open a problem and select **Dry-run workspace**. Add elements using the toolbar, then select one on the canvas or through the element dropdown. The editor lets you update names, JSON array values, variable values, notes, pointer targets/indexes, and arrow endpoints/labels. Click **Apply changes**, then **Save** to persist the workspace.

Use **Undo/Redo**, Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, or Ctrl+Y for workspace changes. Each drag is one undo step. Delete/Backspace removes the selected element when not typing in a field. Deleting an element removes connected arrows and detaches its pointers; undo restores them together. Editing fields keeps the browser's normal text undo behavior.

## Reference documentation

The design material and historical API notes are in [`Documentations/`](Documentations). The root README is the current local setup reference; update it whenever configuration or endpoints change.
