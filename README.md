# EventEase — Event Registration & Management API

A role-based REST API for managing events and attendee bookings, built with **Node.js, Express.js, MongoDB, and Mongoose**.

EventEase supports public event discovery, secure user authentication, Admin-managed events, seat-aware registrations, booking cancellation, and an API testing workflow.

<p align="center">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-18.18%2B-339933?logo=nodedotjs&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white">
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white">
  <img alt="API" src="https://img.shields.io/badge/Architecture-REST%20API-blue">
  <img alt="License" src="https://img.shields.io/badge/License-Not%20Declared-lightgrey">
</p>

## Contents

- [Core capabilities](#core-capabilities)
- [Technology stack](#technology-stack)
- [Getting started](#getting-started)
- [Environment configuration](#environment-configuration)
- [Run the API](#run-the-api)
- [Project structure](#project-structure)
- [API reference](#api-reference)
- [Booking rules](#booking-rules)
- [Security notes](#security-notes)
- [Testing](#testing)
- [Project documentation](#project-documentation)
- [Known scope and next steps](#known-scope-and-next-steps)

## Core capabilities

- **Authentication:** Register and log in with password hashing using bcryptjs; receive a JWT for authenticated requests.
- **Role-based authorization:** Separate normal User and Admin permissions. Public registration cannot assign the Admin role.
- **Event management:** Admins can create, update, and delete events; deletion is blocked while confirmed bookings exist.
- **Event discovery:** Public upcoming-event listing with search, category filtering, sorting by date, and pagination.
- **Seat-aware booking:** Validate event availability, prevent duplicate user/event registrations, and reserve seats using a conditional MongoDB update.
- **Booking management:** Users can view and cancel their own registrations. Cancellation restores the reserved seats.
- **API safeguards:** Request validation, authentication rate limiting, general API rate limiting, Helmet security headers, MongoDB query sanitization, and centralized error responses.

## Technology stack

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Node.js | Executes server-side JavaScript |
| Web framework | Express.js | HTTP server, routing, and middleware |
| Database | MongoDB | Stores users, events, and registrations |
| ODM | Mongoose | Schemas, validation, queries, and indexes |
| Authentication | JSON Web Token (JWT) | Authenticates protected API requests |
| Password security | bcryptjs | Hashes and verifies passwords |
| Validation | express-validator | Validates request fields |
| Security | Helmet, express-rate-limit, express-mongo-sanitize | Adds HTTP and request-level protections |
| API testing | Postman / Thunder Client | Exercises endpoints and verifies responses |

## Getting started

### Prerequisites

- Node.js **18.18 or later** (Node.js 20 LTS is recommended).
- npm.
- A running MongoDB Community Server instance, or a MongoDB Atlas connection string.
- Postman or Thunder Client for API verification.

### 1. Clone the repository

```bash
git clone https://github.com/naitik2043/EventEase.git
cd EventEase
```

### 2. Install dependencies

```bash
npm install
```

On Windows PowerShell, use `npm.cmd` if PowerShell blocks the npm script:

```powershell
npm.cmd install
```

### 3. Create your local environment file

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Open `.env` and add your own configuration. See [Environment configuration](#environment-configuration).

### 4. Start MongoDB

Make sure your local MongoDB service is running before starting the API. For MongoDB Atlas, use the connection URI supplied by Atlas in `MONGO_URI`.

### 5. Seed the Admin account

Set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in your local `.env`, then run:

```bash
npm run seed:admin
```

Windows PowerShell:

```powershell
npm.cmd run seed:admin
```

The seed script creates the Admin account when the email is new. When that email already exists, it updates that account's name, role, and password using the values in `.env`. **Running the seed script for an existing account therefore resets its password to the configured `ADMIN_PASSWORD`.**

### 6. Start the development server

```bash
npm run dev
```

Windows PowerShell:

```powershell
npm.cmd run dev
```

The API uses port `5000` by default. Open:

- Health check: `http://localhost:5000/api/health`

Expected health response:

```json
{
  "success": true,
  "message": "EventEase API is running."
}
```

For a standard non-development start, run `npm start`.

## Environment configuration

The repository includes a safe template at [`.env.example`](.env.example). Copy it to `.env` and configure your own values:

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port; defaults to `5000` |
| `NODE_ENV` | Runtime environment, such as `development` or `production` |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign and verify JWTs |
| `JWT_EXPIRES_IN` | Token lifetime; defaults to `1d` |
| `CORS_ORIGIN` | Optional comma-separated allowed frontend origins |
| `ADMIN_NAME` | Admin display name used by the seed script |
| `ADMIN_EMAIL` | Admin account email used by the seed script |
| `ADMIN_PASSWORD` | Admin password used by the seed script |

Use a long, unique, random `JWT_SECRET` and a strong Admin password. Never commit `.env`, production secrets, database credentials, or real access tokens. The empty `CORS_ORIGIN` value is convenient for local practical work; configure explicit trusted origins before deployment.

## Project structure

```text
EventEase/
├── config/
│   └── db.js
├── controllers/
│   ├── authController.js
│   ├── eventController.js
│   └── registrationController.js
├── middleware/
│   ├── adminMiddleware.js
│   ├── authMiddleware.js
│   ├── errorMiddleware.js
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
├── utils/
│   ├── AppError.js
│   └── asyncHandler.js
├── docs/
│   ├── API_TESTING.md
│   ├── ARCHITECTURE.md
│   └── EventEase.postman_collection.json
├── test/
│   ├── AppError.test.js
│   └── asyncHandler.test.js
├── .github/
│   └── workflows/
│       └── ci.yml
├── Result/                       # Project/API evidence screenshots
├── .env.example
├── .gitignore
├── package.json
└── server.js
```

## API reference

**Base URL:** `http://localhost:5000`

Protected routes require the JWT returned by the login endpoint:

```http
Authorization: Bearer <YOUR_JWT_TOKEN>
```

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Create a normal User account |
| `POST` | `/api/auth/login` | Public | Authenticate and receive a JWT |

Register request:

```json
{
  "name": "Demo User",
  "email": "demo.user@example.com",
  "password": "StrongPass123!"
}
```

Login request:

```json
{
  "email": "demo.user@example.com",
  "password": "StrongPass123!"
}
```

### Events

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/events` | Public | List upcoming events |
| `GET` | `/api/events/:id` | Public | Get event details |
| `POST` | `/api/events` | Admin | Create an event |
| `PUT` | `/api/events/:id` | Admin | Update an event |
| `DELETE` | `/api/events/:id` | Admin | Delete an event if it has no confirmed registrations |

Create-event request:

```json
{
  "eventName": "Web Development Workshop",
  "description": "A practical workshop on modern web development.",
  "category": "Technology",
  "eventDate": "2027-03-15T10:00:00.000Z",
  "venue": "KIET Group of Institutions, Ghaziabad",
  "totalSeats": 100,
  "registrationFee": 250
}
```

The server initializes `availableSeats` from `totalSeats` and assigns `createdBy` from the authenticated Admin. Clients must not send either field.

Search, category filter, and pagination example:

```http
GET /api/events?search=web&category=Technology&page=1&limit=10
```

### Registrations

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/registrations` | Authenticated User | Book event seats |
| `GET` | `/api/registrations/my` | Authenticated User | List the current user's registrations |
| `GET` | `/api/registrations/event/:eventId` | Admin | List registrations for an event |
| `PATCH` | `/api/registrations/:id/cancel` | Registration owner | Cancel the user's booking |

Create-registration request:

```json
{
  "eventId": "REPLACE_WITH_EVENT_MONGODB_ID",
  "numberOfSeats": 2
}
```

The server calculates `totalAmount` from the event's registration fee and requested seat count.

## Booking rules

1. Public registration always creates a normal `User`; clients cannot self-assign the Admin role.
2. A user can create only one registration record for a given event. The unique compound index also prevents a second record after cancellation.
3. Past events cannot be booked.
4. Seat availability is checked and decremented by a conditional database update, so concurrent booking attempts cannot reserve more seats than the stored availability.
5. Users can view and cancel only their own registrations.
6. Cancelling a confirmed registration restores the reserved seat count.
7. Events with confirmed registrations cannot be deleted.
8. When an Admin changes `totalSeats`, already-booked seats are preserved; capacity cannot be reduced below the number of seats already booked.

## Security notes

- `.env` is local-only; `.env.example` contains placeholders and is safe to share.
- Passwords are hashed with bcryptjs and are excluded from normal User queries.
- JWT-protected routes load the current user from the database before authorizing the request.
- Admin-only actions use a separate role-check middleware.
- Authentication endpoints have a stricter rate limit than the general API.
- Helmet, request validation, MongoDB query sanitization, and a centralized error handler are enabled.
- Set `NODE_ENV=production`, configure explicit `CORS_ORIGIN` values, use HTTPS, and rotate secrets appropriately when deploying.

## Testing

Use the included [Postman collection](docs/EventEase.postman_collection.json) or follow the step-by-step [API testing guide](docs/API_TESTING.md).

The guide covers registration/login, Admin event creation, role authorization, event discovery, successful and failed booking cases, protected-route behavior, cancellation, and seat restoration.

Run the automated unit tests with:

```bash
npm test
```

The current unit tests cover the shared `AppError` and `asyncHandler` utilities and do not require MongoDB. GitHub Actions runs this test suite on pushes and pull requests targeting `main`, using Node.js 20 and 22. These are **not full API integration tests**: use the Postman collection or Thunder Client against a running MongoDB-backed server to verify endpoint behavior. Capture real request/response screenshots from your own server for assessment evidence.

## Known scope and next steps

- This repository contains the **backend API**; a separate frontend application is not included.
- Booking creation and seat reservation use a unique registration index, an atomic conditional seat update, and compensating cleanup. They are **not implemented as a multi-document MongoDB transaction**.
- Event deletion currently checks for confirmed registrations and then deletes in separate operations. A registration request can theoretically race with that check; use a transaction or event lifecycle lock before production deployment.
- The Postman collection is a starter workflow and should be run against your own local database.
- Potential next steps: broader automated integration tests (especially booking concurrency and cancellation), structured logging, monitoring, OpenAPI documentation, and a frontend client.

## Project documentation

- [Architecture guide](docs/ARCHITECTURE.md) — request lifecycle, modules, authentication, event management, and booking flow.
- [API testing guide](docs/API_TESTING.md) — step-by-step Postman/Thunder Client test sequence.
- [Postman collection](docs/EventEase.postman_collection.json) — importable API requests.
- [Contributing guide](CONTRIBUTING.md) — development workflow and commit conventions.

## License

No standalone open-source `LICENSE` file is included in this repository. All rights remain with the author unless a license is added.
