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
