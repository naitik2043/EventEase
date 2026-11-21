# EventEase

### Backend-Only Event Management REST API

EventEase is a backend service for event discovery, attendee registration, seat reservations, QR ticketing, waitlist management, event check-in, and administrative analytics. It is built with **Node.js, Express.js, MongoDB, and Mongoose**.

This repository intentionally contains the API and its supporting backend infrastructure only. It does not include a React application, browser dashboard, static website, or frontend deployment.

<p align="center">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-22%20%7C%2024-339933?logo=nodedotjs&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white">
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Replica%20Set-47A248?logo=mongodb&logoColor=white">
  <img alt="OpenAPI" src="https://img.shields.io/badge/OpenAPI-3.0.3-6BA539?logo=swagger&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-blue.svg">
</p>

---

## Capabilities

| Area | Backend capabilities |
|---|---|
| Authentication | User registration, login, JWT access tokens, bcrypt password hashing |
| Authorization | Server-side User/Admin role checks |
| Events | Create, update, delete, search, filter, paginate, and view events |
| Seat reservations | Capacity validation, duplicate prevention, transactional booking |
| Cancellation | Transactional cancellation and seat restoration |
| Waitlist | FIFO queue, withdrawal, rejoining, transactional promotion |
| Tickets | Opaque random ticket codes and QR ticket payloads |
| Check-in | Admin-only ticket validation and single-use check-in |
| Analytics | Platform and event-level booking, occupancy, revenue and check-in metrics |
| Notifications | Optional booking and waitlist emails through Resend |
| API documentation | OpenAPI 3.0.3 contract and Swagger UI at `/api-docs` |

## Engineering highlights

### Transactional bookings
A booking creates a Registration and decrements Event.availableSeats inside a MongoDB transaction. Capacity is updated conditionally so concurrent requests cannot reserve more seats than are available. A unique compound index prevents duplicate registrations for the same attendee and event.

Cancellation changes the registration state and restores seats in a transaction. Historical registration data is retained.

### FIFO waitlist
Waitlist entries are processed in queue order. When capacity becomes available, the oldest eligible entry is promoted, and the registration plus seat reservation are committed transactionally. Queue order is preserved.

### QR tickets and check-in
Confirmed registrations receive cryptographically random opaque ticket codes. An authenticated Admin can validate a code and mark the attendee checked in. Cancelled tickets and repeat check-ins are rejected.

### API security
- JWT authentication and server-enforced User/Admin authorization.
- bcryptjs password hashing.
- express-validator request validation.
- Helmet security headers and configurable CORS.
- Rate limiting and MongoDB query sanitization.
- Request IDs and structured JSON logs.
- Production checks for JWT secret and CORS configuration.
- Graceful shutdown for the Node.js server.

## Technology stack

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Node.js 22 / 24 | JavaScript server runtime |
| API framework | Express.js 4 | HTTP routing and middleware |
| Database | MongoDB replica set | Persistent records and multi-document transactions |
| ODM | Mongoose 8 | Schemas, indexes, queries and sessions |
| Authentication | JSON Web Token | Stateless API authentication |
| Password security | bcryptjs | Password hashing |
| Validation | express-validator | Request validation |
| Security | Helmet, CORS, express-rate-limit, express-mongo-sanitize | API protection |
| Email | Resend REST API | Optional transactional notifications |
| API contract | OpenAPI 3.0.3, Swagger UI | API documentation |
| Testing | Node.js Test Runner, native fetch | Unit and HTTP integration tests |
| Infrastructure | Docker, Docker Compose | Repeatable local API and MongoDB setup |
| CI / security | GitHub Actions, CodeQL, Dependabot | Automated testing and dependency/security checks |

## Architecture

```text
        API Client / Postman / Swagger UI
                      |
                HTTP / JSON
                      |
                Express app.js
                      |
      Security · CORS · Validation · JWT
                      |
            Routes and Middleware
                      |
                 Controllers
                      |
               Mongoose Models
                      |
              MongoDB Replica Set
           /       |          \
        Users    Events   Registrations
                              |
                           Waitlist
```

For the module breakdown and request lifecycle, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Repository structure

```text
EventEase/
├── config/
├── controllers/
├── docs/
│   ├── API_TESTING.md
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── EventEase.postman_collection.json
│   ├── openapi.json
│   └── swagger-initializer.js
├── middleware/
├── models/
├── routes/
├── scripts/
├── services/
├── test/
├── utils/
├── docker/
│   └── mongo-init.js
├── .github/
├── Dockerfile
├── docker-compose.yml
├── app.js
├── server.js
├── package.json
└── LICENSE
```

## Prerequisites

- Node.js 22.12+ or Node.js 24.
- npm.
- MongoDB running as a replica set (transactions are required).
- Docker Desktop with Docker Compose (recommended local setup).

## Quick start with Docker

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

3. Update `.env` with a unique JWT secret and local Admin seed credentials. Docker Compose provisions a one-node MongoDB replica set for development.

4. Start the API and database:

```bash
docker compose up --build
```

5. In another terminal, create the initial Admin account:

```bash
docker compose exec api npm run seed:admin
```

The backend is available at:

- Liveness endpoint: http://localhost:5000/api/health
- Readiness endpoint: http://localhost:5000/api/health/ready
- Swagger UI: http://localhost:5000/api-docs
- OpenAPI JSON: http://localhost:5000/api-docs/openapi.json

The root path `/` intentionally returns an API 404 response. There is no website or frontend in this repository.

Stop containers with `docker compose down`. To remove the local database volume as well, use `docker compose down -v` (this permanently removes local MongoDB data).

## Run locally without Docker

1. Start MongoDB as a replica set.
2. Install dependencies:

```bash
npm ci
```

3. Copy `.env.example` to `.env` and set `MONGO_URI` to your replica-set connection string. Example:

```text
mongodb://127.0.0.1:27017/eventease?replicaSet=rs0
```

4. Create the first Admin account:

```bash
npm run seed:admin
```

5. Start the API:

```bash
npm run dev
```

For a production-style local run:

```bash
npm start
```

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| PORT | No | HTTP port; defaults to 5000 |
| NODE_ENV | Production | Runtime mode |
| MONGO_URI | Yes | MongoDB replica-set connection URI |
| MONGO_TEST_URI | Integration tests | Isolated test database; name must contain `test` |
| JWT_SECRET | Yes | Unique random signing secret of at least 32 characters |
| JWT_EXPIRES_IN | No | Token lifetime; defaults to `1d` |
| CORS_ORIGIN | Production | Comma-separated trusted client origins |
| RESEND_API_KEY | Optional | Resend API key for transactional email |
| MAIL_FROM | Optional | Verified Resend sender |
| ADMIN_NAME | Admin seed | Initial Admin display name |
| ADMIN_EMAIL | Admin seed | Initial Admin email |
| ADMIN_PASSWORD | Admin seed | Initial Admin password |

Never commit `.env`, credentials, JWTs, or database connection strings. Public registration always creates a normal User; Admin accounts must be provisioned through the seed script.

## REST API reference

Base URL: `http://localhost:5000`

Protected endpoints require:

```http
Authorization: Bearer <JWT>
```

### Health and authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/health` | Public | API liveness check |
| GET | `/api/health/ready` | Public | Readiness check including MongoDB connection state |
| POST | `/api/auth/register` | Public | Register a normal user |
| POST | `/api/auth/login` | Public | Authenticate and receive a JWT |

### Events

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/events` | Public | Search, filter and paginate upcoming events |
| GET | `/api/events/:id` | Public | Get event details |
| GET | `/api/events/admin/all` | Admin | List all events, including past events |
| POST | `/api/events` | Admin | Create an event |
| PUT | `/api/events/:id` | Admin | Update an event |
| DELETE | `/api/events/:id` | Admin | Delete an event without confirmed registrations |
| GET | `/api/events/:id/analytics` | Admin | Event-level performance metrics |

### Registrations and tickets

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/registrations` | User | Reserve seats |
| GET | `/api/registrations/my` | User | View own bookings |
| PATCH | `/api/registrations/:id/cancel` | Owner | Cancel a booking and release seats |
| GET | `/api/registrations/:id/ticket` | Owner / Admin | Retrieve an opaque QR ticket |
| POST | `/api/registrations/check-in` | Admin | Validate a ticket and check in an attendee |
| GET | `/api/registrations/event/:eventId` | Admin | View event registrations |

### Waitlist and analytics

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/registrations/waitlist` | User | Join the FIFO waitlist |
| GET | `/api/registrations/waitlist/my` | User | View own waitlist entries |
| DELETE | `/api/registrations/waitlist/:id` | Owner | Leave a waiting queue position |
| GET | `/api/registrations/event/:eventId/waitlist` | Admin | View the event waitlist |
| GET | `/api/analytics/overview` | Admin | Platform-wide analytics |

## API documentation

- Swagger UI: `/api-docs`
- OpenAPI JSON: `/api-docs/openapi.json`
- Source contract: [docs/openapi.json](docs/openapi.json)
- Postman collection: [docs/EventEase.postman_collection.json](docs/EventEase.postman_collection.json)

## Testing and quality checks

Syntax validation:

```bash
npm run build
```

Unit tests:

```bash
npm run test:unit
```

Full suite:

```bash
npm ci
npm test
```

The HTTP integration suite requires a dedicated MongoDB replica set. The database name must contain `test`:

```bash
MONGO_TEST_URI="mongodb://127.0.0.1:27017/eventease_test?replicaSet=rs0" npm test
```

GitHub Actions runs backend syntax checks, MongoDB-backed integration tests, Docker Compose validation and production Docker image build on Node.js 22 and 24.

For manual endpoint verification and concurrency scenarios, see [docs/API_TESTING.md](docs/API_TESTING.md).

## Deployment

This repository is an Express API service. It can run as a Node.js process or as the included Docker container on a backend hosting provider.

The application requires:

- A MongoDB replica set or supported sharded cluster.
- A unique production `JWT_SECRET`.
- An explicit `CORS_ORIGIN` allowlist when browser clients are used.
- HTTPS and restricted database network access.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production configuration. This repository contains no frontend build or Vercel frontend adapter.

## Scope

- No React, Vite, browser UI, or frontend source is included.
- No payment capture or settlement is implemented. Revenue analytics represent confirmed booking value.
- Email notifications are optional and best-effort.
- MongoDB transactions require a replica set; the included single-node Docker replica set is for local development only.

## License

Distributed under the MIT License. See [LICENSE](LICENSE).

## Author

**Naitik Gupta**

- GitHub: [@naitik2043](https://github.com/naitik2043)
- Repository: [EventEase](https://github.com/naitik2043/EventEase)
