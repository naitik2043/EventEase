# EventEase

### Full-Stack Event Management & Registration Platform

EventEase is a role-based event management platform for discovering events, reserving seats, managing attendee registrations, issuing QR tickets, and checking attendees in at the venue.

The project combines a responsive browser dashboard with a modular **Node.js, Express.js, MongoDB and Mongoose** API. It focuses on real backend engineering concerns such as transactional seat reservations, FIFO waitlist promotion, JWT authorization, API validation, automated tests, deployment configuration and operational visibility.

**Live frontend:** [eventease-topaz-five.vercel.app](https://eventease-topaz-five.vercel.app) · **Interactive API docs:** [Swagger UI](https://eventease-topaz-five.vercel.app/docs.html)

> Deployment note: the Vercel production frontend is deployed. The API needs a MongoDB replica-set connection named MONGO_URI before authentication, event data and booking workflows can operate.

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

## Product overview

EventEase supports two roles:

| Role | Capabilities |
|---|---|
| Attendee | Discover events, filter/search, book seats, view bookings, access QR tickets, cancel a booking, join/view a waitlist |
| Admin | Create/update/delete events, review attendees, view platform/event analytics, inspect waitlists, validate tickets and check attendees in |

### Attendee experience

- Responsive event catalogue with search and category filters.
- Authenticated registration with server-calculated booking amounts.
- Personal bookings and ticket details.
- QR ticket payload with an opaque, cryptographically random ticket code.
- Booking cancellation with automatic waitlist promotion.
- Personal waitlist activity and promotion status.

### Admin experience

- Event creation and event operations.
- Attendee and waitlist queue visibility by event.
- Single-use ticket check-in with duplicate-scan protection.
- Platform overview metrics, top events and recent registration activity.
- Event-level occupancy, booking, revenue and check-in metrics.

## Engineering highlights

### Transactional booking and cancellation

Booking inserts a Registration and decrements Event.availableSeats inside one MongoDB transaction. The conditional capacity update prevents the seat count from becoming negative when requests race. A unique compound index prevents duplicate registrations for the same user/event.

Cancellation marks the registration as cancelled and restores seats in a transaction. The historical registration is retained so that one attendee cannot register repeatedly for the same event.

### FIFO waitlist promotion

When a registration is cancelled, EventEase checks the oldest waiting request. Eligible entries are promoted in queue order, with the new Registration and seat reservation committed in the same transaction. A larger first-in-line party is not skipped just because a later smaller party would fit.

### QR tickets and check-in

Every new confirmed booking receives a random ticket code. The attendee can retrieve a QR payload from the ticket endpoint. An authenticated Admin validates the opaque code and records checkedInAt/checkedInBy. Cancelled tickets and repeated check-in attempts are rejected.

The QR image is rendered using an external QR image endpoint. Only the opaque ticket code is sent to that service; attendee name and email are not encoded in the QR data.

### Email notifications

Booking confirmations and waitlist promotion notifications can be sent through Resend. Email delivery is optional and best-effort; a provider outage does not roll back a confirmed database booking.

### Security and operations

- JWT authentication and server-side User/Admin authorization.
- bcryptjs password hashing.
- Request validation through express-validator.
- Helmet, configurable CORS, rate limiting and MongoDB query sanitization.
- Request IDs and structured JSON logs.
- Production startup checks for JWT secret and CORS configuration.
- Graceful shutdown for local Node.js execution.
- CodeQL, Dependabot and GitHub Actions CI.

## Technology stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | HTML, CSS, modern JavaScript modules | Responsive attendee and Admin dashboard |
| Backend | Node.js, Express.js | REST API and business logic |
| Database | MongoDB replica set | Persistent data and multi-document transactions |
| ODM | Mongoose | Schemas, indexes, queries and sessions |
| Authentication | JSON Web Token | Protected API access |
| Password security | bcryptjs | Password hashing |
| Validation | express-validator | Request validation |
| Security | Helmet, CORS, express-rate-limit, express-mongo-sanitize | HTTP and API safeguards |
| Email | Resend REST API | Booking and waitlist notifications |
| API documentation | OpenAPI 3.0.3, Swagger UI | Interactive API exploration |
| Testing | Node.js Test Runner, native fetch | Unit and HTTP integration tests |
| Infrastructure | Docker, Docker Compose | Repeatable local environment |
| CI / Security | GitHub Actions, CodeQL, Dependabot | Automated quality and security workflows |
| Hosting configuration | Vercel | Static frontend and serverless Express adapter |

## Architecture

```text
                EVENTEASE WEB CLIENT
             Events · Bookings · Admin
                       |
                 Same-origin API
                       |
               Vercel Serverless
              api/[...slug].js
                       |
                   Express
                       |
       Middleware · Validation · JWT · RBAC
                       |
                 Controllers
                       |
               Mongoose Models
                       |
                MongoDB Replica Set
              /        |         \
           Users     Events   Registrations
                                  |
                               Waitlist
```

For a detailed module and request-flow explanation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Repository structure

```text
EventEase/
├── api/
│   └── [...slug].js
├── client/
│   ├── app.js
│   ├── api.js
│   ├── index.html
│   ├── styles.css
│   ├── docs.html
│   ├── docs-initializer.js
│   └── openapi.json
├── config/
│   ├── db.js
│   └── runtime.js
├── controllers/
│   ├── analyticsController.js
│   ├── authController.js
│   ├── eventController.js
│   └── registrationController.js
├── docs/
│   ├── API_TESTING.md
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── EventEase.postman_collection.json
│   └── openapi.json
├── models/
│   ├── Event.js
│   ├── Registration.js
│   ├── User.js
│   └── Waitlist.js
├── routes/
│   ├── analyticsRoutes.js
│   ├── authRoutes.js
│   ├── eventRoutes.js
│   └── registrationRoutes.js
├── services/
│   └── emailService.js
├── scripts/
│   └── seedAdmin.js
├── test/
├── utils/
├── .github/
│   ├── dependabot.yml
│   └── workflows/
├── Dockerfile
├── docker-compose.yml
├── vercel.json
├── app.js
├── server.js
├── package.json
└── LICENSE
```

## Quick start — Docker (recommended)

### Prerequisites

- Docker Desktop with Docker Compose.
- Node.js 22+ and npm for local test commands.
- A browser or Postman.

MongoDB transactions require a replica set. The included Compose stack starts MongoDB as a single-node replica set for development.

1. Clone the repository:

```bash
git clone https://github.com/naitik2043/EventEase.git
cd EventEase
```

2. Create the environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Edit .env. Use a unique random JWT secret and set the Admin seed name, email and password. Email provider variables are optional.

4. Start the application:

```bash
docker compose up --build
```

5. In a second terminal, seed the Admin account:

```bash
docker compose exec api npm run seed:admin
```

Open:

- Web application: http://localhost:5000
- API health: http://localhost:5000/api/health
- Swagger UI: http://localhost:5000/api-docs
- OpenAPI JSON: http://localhost:5000/api-docs/openapi.json

Stop the stack with `docker compose down`. To also remove the local database volume, use `docker compose down -v` (destructive).

## Run locally without Docker

1. Start MongoDB as a replica set.
2. Install root dependencies:

```bash
npm ci
```

3. Create .env from .env.example and set MONGO_URI to a replica-set connection string, for example:

```text
mongodb://127.0.0.1:27017/eventease?replicaSet=rs0
```

4. Seed the Admin and start the API:

```bash
npm run seed:admin
npm run dev
```

The Express server serves the API, docs, and browser dashboard from the same origin at http://localhost:5000.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| PORT | No | API port; defaults to 5000 |
| NODE_ENV | Production | Runtime mode |
| MONGO_URI | Yes | MongoDB replica-set connection URI |
| MONGO_TEST_URI | Integration tests | Dedicated test DB; database name must contain test |
| JWT_SECRET | Yes | Unique, random signing secret (32+ characters) |
| JWT_EXPIRES_IN | No | Token lifetime; defaults to 1d |
| CORS_ORIGIN | Production | Comma-separated trusted origins |
| APP_BASE_URL | Recommended | Base URL included in notification emails |
| RESEND_API_KEY | Optional | Resend email API key |
| MAIL_FROM | Optional | Verified Resend sender address |
| ADMIN_NAME | Admin seed | Admin display name |
| ADMIN_EMAIL | Admin seed | Admin email |
| ADMIN_PASSWORD | Admin seed | Admin seed password |

Never commit .env, production credentials, tokens, or database connection strings. Public registration always creates a normal User; Admin accounts must be provisioned through the seed script.

## REST API reference

Base URL: http://localhost:5000

Protected endpoints require:

```http
Authorization: Bearer <JWT>
```

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /api/auth/register | Public | Register a normal user |
| POST | /api/auth/login | Public | Login and receive a JWT |

### Events

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | /api/events | Public | Search/filter/paginate upcoming events |
| GET | /api/events/admin/all | Admin | Paginated catalogue including past events |
| GET | /api/events/:id | Public | Event details |
| POST | /api/events | Admin | Create event |
| PUT | /api/events/:id | Admin | Update event |
| DELETE | /api/events/:id | Admin | Delete event without confirmed registrations |
| GET | /api/events/:id/analytics | Admin | Event-level performance metrics |

### Registrations and tickets

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /api/registrations | User | Reserve seats |
| GET | /api/registrations/my | User | View own bookings |
| PATCH | /api/registrations/:id/cancel | Owner | Cancel booking and release seats |
| GET | /api/registrations/:id/ticket | Owner / Admin | Retrieve QR ticket payload |
| POST | /api/registrations/check-in | Admin | Verify ticket and check attendee in |
| GET | /api/registrations/event/:eventId | Admin | View event attendees |

### Waitlist and analytics

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /api/registrations/waitlist | User | Join FIFO waitlist |
| GET | /api/registrations/waitlist/my | User | View own waitlist requests |
| DELETE | /api/registrations/waitlist/:id | Owner | Leave a waiting queue position |
| GET | /api/registrations/event/:eventId/waitlist | Admin | View event waitlist queue |
| GET | /api/analytics/overview | Admin | Platform-wide metrics |

### API documentation

- Local Express Swagger UI: /api-docs
- Static web Swagger UI: /docs.html
- OpenAPI contract: [docs/openapi.json](docs/openapi.json)

## Testing

Run syntax checks and the unit/integration test suite:

```bash
npm ci
npm run build
npm test
```

For local integration tests, set MONGO_TEST_URI to an isolated replica-set database whose name contains test.

```bash
MONGO_TEST_URI="mongodb://127.0.0.1:27017/eventease_test?replicaSet=rs0" npm test
```

The GitHub Actions workflow provisions a disposable MongoDB replica set and tests on Node.js 22, 24 and 26. The suite covers authentication, role enforcement, event creation, booking, duplicate protection, cancellation and seat restoration, insufficient capacity, concurrent bookings, waitlist promotion, ticket check-in and analytics.

See [docs/API_TESTING.md](docs/API_TESTING.md) for manual verification and additional production test cases.

## Deployment

The root vercel.json configures the static browser client and the serverless Express API adapter. To enable a working live environment:

1. Import this repository into Vercel, keeping the root directory as the repository root.
2. Configure MONGO_URI, JWT_SECRET, NODE_ENV=production, and CORS_ORIGIN in Vercel Project Settings.
3. Connect a managed MongoDB replica set.
4. Optionally configure RESEND_API_KEY, MAIL_FROM, and APP_BASE_URL.
5. Seed the initial Admin from a trusted environment connected to the intended database.
6. Deploy and verify /, /api/health, /docs.html, authentication and a test booking.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for environment setup and production operations. A Vercel Git project may build the frontend before production environment variables are configured; API routes will not be operational until those secrets and database access are provided.

## Scope and operational notes

- The local Docker MongoDB node is for development, not high availability.
- Email is optional and uses Resend when configured.
- The QR image is generated by a third-party QR service from an opaque random ticket code; attendee personal details are not encoded.
- Payment capture/settlement is not implemented. Analytics revenue represents confirmed booking value, not collected payments.
- Before production launch, conduct an independent security review, load/concurrency testing, backup/restore validation and provider-specific monitoring setup.

## License

Distributed under the MIT License. See [LICENSE](LICENSE).

## Author

**Naitik Gupta**

- GitHub: [@naitik2043](https://github.com/naitik2043)
- Project: [EventEase](https://github.com/naitik2043/EventEase)
