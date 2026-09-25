# Interactive Coding Practice Platform

A production-style **Interactive Coding Practice Platform** built with Java and Spring Boot.

The platform allows users to browse programming problems, write and execute Java solutions, submit solutions against predefined test cases, view detailed execution results, track their progress, and use a virtual workspace for algorithm dry-runs and notes.

> **Status:** 🚧 Under active development

## Overview

Traditional coding-practice platforms are good at code editing and automated evaluation, but algorithm practice often requires learners to mentally simulate data structures and program execution or use paper and external notebooks for dry runs.

This project combines an online Java coding environment with a persistent virtual workspace for algorithm practice.

### Core capabilities

- User registration and authentication
- JWT-based authentication and authorization
- Programming problem browsing and filtering
- Online Java code editor
- Sample code execution
- Solution submission and automated test evaluation
- Submission history and execution results
- User progress and statistics
- Virtual dry-run workspace for algorithms and notes
- Asynchronous code execution using RabbitMQ and workers
- Isolated Java code execution using Docker containers
- Redis caching for suitable read-heavy operations
- WebSocket-based real-time submission updates
- Admin management of problems and test cases

## Architecture

The application is designed around a Spring Boot backend and a separate execution-worker architecture.

```text
                         ┌─────────────────────┐
                         │       Client        │
                         │   Web / REST API    │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Spring Boot      │
                         │      Backend        │
                         │                     │
                         │ REST + Security     │
                         │ JWT + Validation    │
                         │ JPA + Hibernate     │
                         └──────┬──────┬───────┘
                                │      │
                   ┌────────────┘      └─────────────┐
                   ▼                                 ▼
            ┌─────────────┐                   ┌─────────────┐
            │ PostgreSQL  │                   │    Redis    │
            │             │                   │    Cache    │
            └─────────────┘                   └─────────────┘

                         ┌─────────────────────┐
                         │      RabbitMQ       │
                         │    Job Queue        │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │  Execution Worker   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Docker Sandbox      │
                         │                     │
                         │ JDK 21              │
                         │ javac / java        │
                         │ Resource limits     │
                         └─────────────────────┘
```

### Submission execution flow

```text
POST /api/submissions
        │
        ▼
Validate request
        │
        ▼
Create Submission
status = QUEUED
        │
        ▼
Publish execution job
        │
        ▼
RabbitMQ
        │
        ▼
Execution Worker
        │
        ▼
Prepare isolated environment
        │
        ▼
Compile Java source
        │
        ├── Compilation failure
        │        └── COMPILATION_ERROR
        │
        ▼
Execute with resource limits
        │
        ▼
Run test cases
        │
        ▼
Compare actual vs expected output
        │
        ▼
Store execution results
        │
        ▼
Update submission status
```

Submitted code is treated as **untrusted code**. It must not execute directly inside the main application process. The execution layer is isolated and applies timeout, CPU, memory, filesystem, and network restrictions.

## Technology Stack

| Area | Technology |
|---|---|
| Language | Java 21+ |
| Backend | Spring Boot |
| API | REST |
| Security | Spring Security + JWT |
| Database | PostgreSQL |
| ORM | Spring Data JPA + Hibernate |
| Validation | Jakarta Bean Validation |
| Messaging | RabbitMQ |
| Caching | Redis |
| Code Execution | JDK + Docker-based isolated workers |
| Real-Time | WebSocket / STOMP or simpler WebSocket protocol |
| Testing | JUnit 5 + Mockito + Spring Boot Test |
| Build | Maven |
| Containerization | Docker + Docker Compose |
| API Documentation | OpenAPI / Swagger |
| Version Control | Git + GitHub |
| Observability | SLF4J / Logback initially |

## Project Structure

The project is being developed with a feature-oriented Spring Boot package structure:

```text
src/
└── main/
    ├── java/
    │   └── <base-package>/
    │       ├── auth/
    │       │   ├── controller/
    │       │   ├── service/
    │       │   ├── repository/
    │       │   └── entity/
    │       │
    │       ├── problem/
    │       │   ├── controller/
    │       │   ├── service/
    │       │   ├── repository/
    │       │   └── entity/
    │       │
    │       ├── submission/
    │       ├── workspace/
    │       └── common/
    │           ├── exception/
    │           ├── response/
    │           └── config/
    │
    └── resources/
```

The execution worker and Docker execution environment will be separated from the main backend as the submission pipeline is implemented.

## Main Domain Model

The initial database design contains:

- **User** — account, credentials, role, and creation information
- **Problem** — programming problem metadata and starter code
- **Topic** — problem topics
- **ProblemTopic** — problem/topic relationship
- **TestCase** — problem test inputs and expected outputs
- **Submission** — submitted source code and execution status
- **SubmissionTestResult** — result of a submission against an individual test case
- **Workspace** — persistent algorithm dry-run workspace
- **UserProblemProgress** — solved status, attempts, and best submission

## Submission Statuses

The execution pipeline supports the following statuses:

```text
QUEUED
RUNNING
ACCEPTED
WRONG_ANSWER
COMPILATION_ERROR
RUNTIME_ERROR
TIME_LIMIT_EXCEEDED
MEMORY_LIMIT_EXCEEDED
SYSTEM_ERROR
```

## REST API

The initial API design includes:

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/users/me
```

### Problems

```text
GET /api/problems
GET /api/problems/{id}
GET /api/problems?difficulty=MEDIUM&topic=ARRAY
```

### Submissions

```text
POST /api/submissions
GET  /api/submissions/{id}
GET  /api/users/me/submissions
GET  /api/problems/{id}/submissions
```

### Workspace

```text
GET /api/problems/{id}/workspace
PUT /api/problems/{id}/workspace
```

### Progress

```text
GET /api/users/me/progress
GET /api/users/me/stats
```

### Administration

```text
POST /api/admin/problems
PUT  /api/admin/problems/{id}
POST /api/admin/problems/{id}/test-cases
```

## Development Roadmap

The project is intentionally being developed incrementally.

### Phase 1 — Project Foundation

- Create Spring Boot project and package structure
- Configure Maven
- Configure PostgreSQL
- Configure profiles and environment variables
- Configure Docker Compose
- Establish common exception handling
- Establish API response conventions
- Set up Git repository and documentation

### Phase 2 — Authentication

- User entity and repository
- Registration and login
- Spring Security
- JWT authentication
- User/admin authorization

### Phase 3 — Problem Management

- Problem, Topic, and TestCase entities
- Admin problem CRUD
- Problem listing and filtering
- Pagination
- Problem details
- Initial problem seed data

### Phase 4 — Basic Code Runner

- Accept Java source code
- Compile Java source
- Execute a controlled development test program
- Capture compilation errors and program output
- Add execution timeouts

### Phase 5 — Submission Pipeline

- Submission persistence
- RabbitMQ integration
- Execution worker
- Asynchronous execution
- Persist execution results
- Expose submission status
- Retry and dead-letter handling

### Phase 6 — Secure Execution

- Docker-based execution
- Fresh container per submission
- Execute test cases inside the isolated container
- CPU and memory limits
- Network restrictions
- Filesystem restrictions
- Container cleanup

### Phase 7 — Virtual Workspace

- Define versioned JSON workspace state
- Define supported workspace element types
- Workspace validation
- Workspace persistence
- Associate workspace with user and problem
- Save/load APIs
- Frontend canvas/editor
- Arrays, pointers, variables, notes, and arrows
- Frontend undo/redo

### Phase 8 — Progress & Caching

- Solved-problem tracking
- Attempt tracking
- User statistics
- Redis caching
- Optional leaderboard

### Phase 9 — Real-Time Features

- WebSocket submission updates
- Queued/running/completed status updates
- Optional algorithm execution events

### Phase 10 — Production Hardening

- Unit tests
- Integration tests
- API tests
- Improved logging and monitoring
- Rate limiting
- OpenAPI documentation
- Full Docker containerization
- CI/CD
- Deployment

## Reliability

Submission records are persisted before execution is processed asynchronously.

The execution pipeline is designed around:

```text
Persistent Submission
        +
RabbitMQ acknowledgements
        +
Retry handling
        +
Dead-letter handling
```

This prevents a worker failure from permanently losing a user's submission.

## Security

Security is a core part of the execution architecture.

The system will:

- Never execute untrusted Java code directly in the main application process in the secured architecture
- Isolate submitted programs in Docker containers
- Apply execution time limits
- Apply CPU and memory restrictions
- Restrict network access
- Restrict filesystem access
- Clean up execution containers after completion
- Authenticate protected APIs using Spring Security and JWT

## Testing Strategy

Testing will be introduced throughout development rather than postponed until the final phase.

The project uses:

- JUnit 5
- Mockito
- Spring Boot Test
- Unit tests for business logic
- Integration tests for persistence and infrastructure
- API tests
- Execution/evaluation pipeline tests

The compilation, execution, evaluation, retry, and worker logic are particularly important areas for automated testing.

## Running the Project

The project is currently under development. Setup and execution instructions will be expanded as the infrastructure is added.

The intended local development environment will use Docker Compose for infrastructure services such as:

```text
PostgreSQL
RabbitMQ
Redis
```

The Java backend and execution workers will be developed using Maven and Java 21+.

## Engineering Concepts Demonstrated

This project is designed to demonstrate practical backend and distributed-system concepts, including:

- REST API design
- Authentication and authorization
- JWT security
- Relational database modeling
- JPA/Hibernate
- Transaction management
- Pagination and filtering
- Asynchronous processing
- Message queues
- Worker pools
- Retry and dead-letter handling
- Caching
- Concurrency
- Containerization
- Sandboxing
- Resource limits
- WebSockets
- Exception handling
- Validation
- Logging and observability
- Unit and integration testing
- API documentation
- CI/CD
- Basic distributed-system design

## Project Status

🚧 **Under Development**

The implementation follows the staged roadmap above. Infrastructure and features are being introduced incrementally so that each major subsystem can be developed and tested before additional complexity is added.

## License

License information will be added as the project is finalized.
