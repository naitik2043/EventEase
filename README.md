# EventEase

### Event Management & Registration REST API

A modular, role-based REST API for event discovery, administration, and seat-aware attendee registration, built with **Node.js, Express.js, MongoDB, and Mongoose**.

EventEase demonstrates layered backend architecture, JWT authentication, role-based authorization, transactional booking workflows, request validation, operational safeguards, interactive API documentation, automated testing, and containerized local development.

<p align="center">
  <a href="https://github.com/naitik2043/EventEase/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/naitik2043/EventEase/actions/workflows/ci.yml/badge.svg"></a>
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-22%2B-339933?logo=nodedotjs&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white">
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Replica%20Set-47A248?logo=mongodb&logoColor=white">
  <img alt="OpenAPI" src="https://img.shields.io/badge/OpenAPI-3.0.3-6BA539?logo=swagger&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-blue.svg">
</p>

---

## Project at a glance

| Area | Details |
|---|---|
| Application | Event management and attendee registration API |
| Architecture | Layered Express application |
| Runtime | Node.js 22+ (supported LTS releases) |
| API framework | Express.js 4 |
| Database | MongoDB replica set |
| Data modeling | Mongoose |
| Authentication | JWT |
| Password hashing | bcryptjs |
| Validation | express-validator |
| API specification | OpenAPI 3.0.3 / Swagger UI |
| Testing | Node.js Test Runner and MongoDB-backed HTTP integration tests |
| Local infrastructure | Docker Compose |
| CI | GitHub Actions |

## Core capabilities

### Authentication and access control
- User registration and login.
- Password hashing with bcryptjs.
- JWT-based authentication for protected routes.
- Separate User and Admin permissions.
- Public registration always assigns the normal User role.
- Admin account provisioning through a controlled seed script.

### Event management
- Admin-only event creation, editing, and deletion.
- Public upcoming-event discovery.
- Search by event name and description.
- Category filtering, date sorting, and pagination.
- Server-managed event capacity and creator assignment.
- Deletion protection for events with confirmed registrations.

### Registration and seat management
- Authenticated event registration.
- Duplicate user/event registration protection.
- Seat availability validation.
- Conditional seat reservation to prevent overbooking.
- Transactional registration and seat decrement.
- Transactional cancellation and seat restoration.
- Server-side registration fee calculation.
- User-owned registration listing.

### API and operational safeguards
- Request validation at route boundaries.
- Centralized JSON error responses.
- HTTP security headers through Helmet.
- Configurable CORS allowlist.
- Request-size limits and MongoDB query sanitization.
- General API and stricter authentication rate limits.
- Request IDs and structured JSON request logs.
- Production-safe internal error responses.
- Graceful shutdown on SIGINT/SIGTERM.

## Architecture

```text
                 API CLIENT
              Postman / Swagger
                      |
                      v
                  Express
                      |
       Request ID + HTTP Request Logging
                      |
       Helmet / CORS / Parsing / Sanitization
                      |
                 API Routers
                      |
        Validation / JWT Authentication
                      |
             Role Authorization
                      |
                 Controllers
                      |
             Mongoose + Sessions
                      |
             MongoDB Replica Set
```

The codebase separates HTTP setup, routes, controllers, models, middleware, configuration, utilities, scripts, and documentation. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for module responsibilities and the request lifecycle.

## Project structure

```text
EventEase/
├── app.js
├── server.js
├── config/
│   └── db.js
├── controllers/
│   ├── authController.js
│   ├── eventController.js
│   └── registrationController.js
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_TESTING.md
│   ├── DEPLOYMENT.md
│   ├── openapi.json
│   ├── swagger-initializer.js
│   └── EventEase.postman_collection.json
├── docker/
│   └── mongo-init.js
├── middleware/
│   ├── adminMiddleware.js
│   ├── authMiddleware.js
│   ├── errorMiddleware.js
│   ├── requestLogger.js
│   └── validateRequest.js
├── models/
│   ├── Event.js
│   ├── Registration.js
│   └── User.js
├── routes/
│   ├── authRoutes.js
│   ├── eventRoutes.js
│   └── registrationRoutes.js
├── scripts/
│   └── seedAdmin.js
├── test/
│   ├── AppError.test.js
│   ├── api.integration.test.js
│   └── asyncHandler.test.js
├── utils/
│   ├── AppError.js
│   ├── asyncHandler.js
│   └── logger.js
├── .github/
│   ├── dependabot.yml
│   └── workflows/
│       ├── ci.yml
│       └── codeql.yml
├── .dockerignore
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── LICENSE
├── SECURITY.md
├── package.json
└── README.md
```

## Quick start

### Prerequisites

- Node.js 22 or a later supported LTS release.
- npm.
- Docker Desktop with Docker Compose, or a MongoDB replica set.
- Postman or a browser for API verification.

> **Important:** EventEase uses MongoDB transactions for booking and cancellation. A standalone MongoDB server does not support these transactions. Use the included Docker Compose replica set or a compatible managed MongoDB replica set.

### Option A — Run with Docker Compose

1. Clone the repository:

```bash
git clone https://github.com/naitik2043/EventEase.git
cd EventEase
```

2. Create your local environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Edit .env. Set a strong JWT_SECRET, Admin name, email, and password. Docker Compose supplies the internal MongoDB replica-set URI to the API container.

4. Start the API and database:

```bash
docker compose up --build
```

5. In a second terminal, create the Admin account:

```bash
docker compose exec api npm run seed:admin
```

The API is available at:

- API health: http://localhost:5000/api/health
- Interactive documentation: http://localhost:5000/api-docs
- OpenAPI JSON: http://localhost:5000/api-docs/openapi.json

Stop the stack with `docker compose down`. To delete the local database volume as well, use `docker compose down -v` (this permanently deletes local MongoDB data).

### Option B — Run locally

1. Start a MongoDB replica set and create a database.
2. Clone the repository and install dependencies:

```bash
git clone https://github.com/naitik2043/EventEase.git
cd EventEase
npm ci
```

3. Create and configure .env:

```bash
cp .env.example .env
```

Set MONGO_URI to your replica-set connection string. A typical local URI is:

```text
mongodb://127.0.0.1:27017/eventease?replicaSet=rs0
```

4. Seed the Admin account:

```bash
npm run seed:admin
```

5. Start the development server:

```bash
npm run dev
```

For a standard start:

```bash
npm start
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| PORT | No | HTTP port; defaults to 5000 |
| NODE_ENV | Production | Runtime environment |
| MONGO_URI | Yes | MongoDB replica-set connection URI |
| MONGO_TEST_URI | Integration tests | Isolated test database URI; database name must include test |
| JWT_SECRET | Yes | Long, random JWT signing secret |
| JWT_EXPIRES_IN | No | JWT lifetime; defaults to 1d |
| CORS_ORIGIN | Production | Comma-separated trusted frontend origins |
| ADMIN_NAME | Admin seed | Admin display name |
| ADMIN_EMAIL | Admin seed | Admin account email |
| ADMIN_PASSWORD | Admin seed | Strong Admin password |

Never commit .env, database credentials, JWT secrets, access tokens, or production configuration. The seed script updates the configured Admin account when the email already exists, including resetting its password to the configured value.

## API reference

**Base URL:** http://localhost:5000

Protected routes require:

```http
Authorization: Bearer <JWT>
```

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /api/auth/register | Public | Create a normal User account |
| POST | /api/auth/login | Public | Authenticate and receive a JWT |

### Events

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | /api/events | Public | List upcoming events |
| GET | /api/events/:id | Public | Get event details |
| POST | /api/events | Admin | Create an event |
| PUT | /api/events/:id | Admin | Update an event |
| DELETE | /api/events/:id | Admin | Delete an event if no confirmed registrations exist |

Example event search:

```http
GET /api/events?search=workshop&category=Technology&page=1&limit=10
```

### Registrations

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /api/registrations | Authenticated | Book event seats |
| GET | /api/registrations/my | Authenticated | List the current user's registrations |
| GET | /api/registrations/event/:eventId | Admin | List registrations for an event |
| PATCH | /api/registrations/:id/cancel | Registration owner | Cancel a registration |

### Interactive API documentation

Swagger UI is served at /api-docs. The versioned API contract is maintained in [docs/openapi.json](docs/openapi.json).

## Data model

- **User:** name, email, password hash, role.
- **Event:** event details, date, venue, seat capacity, fee, creator reference.
- **Registration:** user reference, event reference, seat count, total amount, registration status and date.

A unique compound index on { userId, eventId } prevents duplicate registration records for the same user/event pair.

## Testing and CI

Run unit tests:

```bash
npm run test:unit
```

Run the full suite with an isolated MongoDB replica set:

```bash
MONGO_TEST_URI="mongodb://127.0.0.1:27017/eventease_test?replicaSet=rs0" npm test
```

The integration suite exercises real HTTP requests against MongoDB and covers authentication, role enforcement, event creation and discovery, successful and rejected bookings, duplicate prevention, cancellation, seat restoration, insufficient capacity, and deletion protection.

GitHub Actions runs the suite against Node.js 22, 24, and 26 with a disposable MongoDB replica set. See [docs/API_TESTING.md](docs/API_TESTING.md) for the test workflow.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production configuration, managed MongoDB requirements, Docker deployment, secret handling, and operational considerations.

The repository includes a Dockerfile and Docker Compose setup for repeatable local execution. No public production deployment URL is currently configured.

## Engineering notes and current scope

- Booking, cancellation, and event deletion use MongoDB transactions. Deploy to a replica set or supported sharded cluster.
- The included Docker Compose replica set is intended for local development and testing, not high availability.
- Integration tests require an isolated test database. They are skipped by the default test runner when MONGO_TEST_URI is not configured.
- The repository contains the backend API and API documentation; a separate React frontend is not included.
- Payment processing, QR ticket issuance/check-in, email delivery, waitlists, and event analytics are not part of the current implementation.
- Before production launch, perform load testing, security review, backup/restore verification, and provider-specific monitoring setup.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

## Author

**Naitik Gupta**

- GitHub: [@naitik2043](https://github.com/naitik2043)
- Repository: [EventEase](https://github.com/naitik2043/EventEase)
