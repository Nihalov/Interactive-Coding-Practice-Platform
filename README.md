# CodeArena

CodeArena is an interactive Java coding-practice platform. Users can browse problems, run Java code against sample cases, submit it for asynchronous judging, review their submission history and progress, and keep a per-problem dry-run workspace.

## What is implemented

- Registration, login, JWT authentication, and role-protected admin APIs
- Problem browsing with difficulty filtering and pagination
- Sample execution and asynchronous submission judging through RabbitMQ
- Docker-isolated Java execution with CPU, memory, process, timeout, output, filesystem, and network restrictions
- PostgreSQL persistence, Redis-backed caching and rate limiting, submission recovery, and progress statistics
- A React/Monaco editor, submission history, and a saved workspace with editable arrays, variables, pointers, notes, connecting arrows, deletion, and undo/redo

The workspace editor and operational tooling are still being completed. WebSocket updates, a browser-based admin console, richer problem metadata, comprehensive automated tests, OpenAPI documentation, and CI are not implemented yet.

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

2. Start PostgreSQL, RabbitMQ, and Redis. On the current development machine, reuse the existing containers to keep the original problems and accounts:

   ```powershell
   docker start codearena-postgres codearena-rabbitmq-1 codearena-redis-1
   docker ps
   ```

   PostgreSQL is exposed at `localhost:5433`, RabbitMQ at `localhost:5672`, Redis at `localhost:6379`, and the RabbitMQ management UI is at [http://localhost:15672](http://localhost:15672).

   For a **fresh installation on another machine**, use `docker compose up -d` and wait for the services to become healthy. Compose creates a separate database volume; it does not import the original container's problems or accounts. The original PostgreSQL container and the Compose PostgreSQL container both require port 5433, so run only one of them at a time.

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
docker exec codearena-postgres pg_isready -U codearena -d codearena
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
docker stop codearena-postgres codearena-rabbitmq-1 codearena-redis-1
```

## Architecture

```text
React + Monaco -> Spring Boot API -> PostgreSQL
                              |-> Redis
                              |-> RabbitMQ -> submission worker -> Docker Java sandbox
```

The backend application and RabbitMQ worker currently run in the same Spring Boot process. The queue keeps long-running judging off the HTTP request thread; Docker executes each submission in an isolated container.

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
