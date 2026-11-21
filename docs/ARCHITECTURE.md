# EventEase Architecture

## Overview

EventEase is a layered REST API. Its modules separate HTTP setup, route definitions, validation, authentication, business logic, persistence, and operational utilities.

```text
HTTP Client (Postman / Swagger UI)
                  |
                  v
                 app.js
                  |
        request ID + HTTP logging
                  |
        Helmet / CORS / parsing
                  |
       sanitization / rate limiting
                  |
                Routes
                  |
       Validation / authentication
                  |
          Authorization checks
                  |
              Controllers
                  |
        Mongoose models / sessions
                  |
                MongoDB
                  |
       Centralized error handler
                  |
             JSON response
```

## Main modules

| Path | Responsibility |
|---|---|
| app.js | Creates the Express app, middleware, route mounts and API docs |
| server.js | Validates production settings, connects the database and handles shutdown |
| config/db.js | Establishes the Mongoose connection |
| routes/ | Declares endpoints, validation and middleware ordering |
| controllers/ | Implements authentication, event and registration use cases |
| models/ | Defines User, Event and Registration schemas and indexes |
| middleware/authMiddleware.js | Verifies JWT and loads the current user |
| middleware/adminMiddleware.js | Enforces Admin permissions |
| middleware/requestLogger.js | Adds a request ID and logs method, path, status and latency |
| middleware/errorMiddleware.js | Normalizes errors into consistent JSON responses |
| utils/AppError.js | HTTP-aware operational error class |
| utils/asyncHandler.js | Forwards rejected async handlers to Express error middleware |
| utils/logger.js | Writes structured JSON log records |
| scripts/seedAdmin.js | Creates or updates the configured Admin account |
| docs/openapi.json | OpenAPI contract served by Swagger UI |
| test/ | Unit and optional MongoDB-backed HTTP integration tests |

## Request lifecycle

1. server.js validates production settings and connects to MongoDB.
2. app.js configures request logging, Helmet, CORS, body parsing, sanitization and rate limits.
3. A route applies request validation where applicable.
4. Protected routes run protect, which verifies the Bearer JWT and loads the current user.
5. Admin-only routes additionally run restrictToAdmin.
6. Controllers execute business logic through Mongoose models.
7. asyncHandler forwards rejected promises to centralized error middleware.
8. The client receives JSON; error responses include a request ID.

## Authentication and authorization

Public registration always assigns the User role on the server. Passwords are hashed with bcryptjs before persistence. Login verifies the submitted password and issues a signed JWT. Protected routes validate the token and fetch the current user from MongoDB, so authorization uses the current database role rather than trusting a client-provided role.

## Transactional booking

Registration and event capacity are separate documents. Booking now runs the conditional seat decrement and registration insert inside one MongoDB transaction. If either operation fails, the transaction aborts and both changes are rolled back.

The event seat update includes the condition availableSeats >= numberOfSeats. The unique compound index { userId, eventId } remains the final duplicate-registration guard.

Cancellation runs the status transition and seat restoration in one transaction. Event deletion also performs the confirmed-registration check, registration cleanup, and event deletion transactionally.

**Deployment requirement:** MongoDB transactions require a replica set or supported sharded cluster. A standalone MongoDB server is not sufficient. The included Docker Compose environment initializes a local single-node replica set for development and testing.

## API documentation

The OpenAPI 3.0.3 contract is stored in docs/openapi.json and exposed through Swagger UI at /api-docs. The raw specification is available at /api-docs/openapi.json.

## Operational controls

- Production startup requires a strong JWT secret and explicit CORS allowlist.
- Request IDs are returned in the X-Request-ID header.
- Request logs omit tokens, passwords, request bodies and query strings.
- Production 500 responses do not expose internal error messages or stack traces.
- The server closes its HTTP listener and disconnects Mongoose on SIGINT/SIGTERM.
- Docker and GitHub Actions configuration are included.
