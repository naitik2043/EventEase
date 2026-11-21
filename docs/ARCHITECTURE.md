# EventEase Architecture

## Product overview

EventEase is a full-stack event management platform. The frontend is a component-based React application built with Vite; the backend is a layered Express REST API backed by MongoDB.

```text
             Browser / Responsive UI
            Events · My Bookings · Admin
                       |
                 Same-origin API
                       |
               Vercel Serverless
             api/[...slug].js adapter
                       |
                 Express app.js
                       |
       Security · CORS · Validation · JWT
                       |
       Routes · Controllers · Middleware
                       |
               Mongoose Models
                       |
                MongoDB Replica Set
           /         |          \
       Users       Events    Registrations
                               |
                         Waitlist entries
```

## Repository modules

| Path | Responsibility |
|---|---|
| frontend/src/ | React attendee and Admin dashboards, API client, reusable UI components |
| frontend/public/ | Static Swagger UI assets and OpenAPI contract |
| frontend/vite.config.js | Vite development proxy and production build configuration |
| api/[...slug].js | Serverless adapter for the Express application |
| app.js | Configures Express middleware, docs, health check and route mounts |
| server.js | Local Node.js entry point, production config validation and graceful shutdown |
| config/db.js | Reuses the Mongoose connection across requests |
| routes/ | API endpoints, authentication/authorization ordering and validation |
| controllers/ | Authentication, event, registration, ticket, waitlist and analytics use cases |
| models/ | User, Event, Registration and Waitlist schemas and indexes |
| services/emailService.js | Best-effort booking and waitlist email delivery via Resend |
| middleware/ | JWT auth, Admin authorization, validation, request logging and errors |
| utils/ | Shared error and structured logging utilities |
| docs/ | API contract, test guide, deployment notes and architecture |
| test/ | Unit tests and MongoDB-backed HTTP integration tests |

## Request lifecycle

1. A browser or API client sends a request.
2. Locally, server.js connects to MongoDB and starts Express. On Vercel, api/[...slug].js reuses a cached connection and forwards the request to the same Express app.
3. app.js applies request IDs, logging, Helmet, CORS, request-size limits, MongoDB query sanitization and rate limits.
4. Routers validate request data and run JWT authentication where required.
5. Admin-only routes also run role authorization.
6. Controllers enforce business rules and use Mongoose models.
7. asyncHandler forwards rejected promises to centralized error handling.
8. The client receives JSON with consistent status codes and request IDs for errors.

## Booking and cancellation consistency

A booking updates two documents: Event.availableSeats and a Registration record. Both writes happen in one MongoDB transaction. The seat decrement is conditional on availableSeats being greater than or equal to the requested quantity. A unique compound index on { userId, eventId } prevents a second registration record for the same event/user pair.

Cancellation changes the registration state and restores the seats in one transaction. The cancelled record is retained, preserving the one-registration-per-event business rule.

## FIFO waitlist

A Waitlist document records the user, event, requested seat count, queue timestamp and status. The partial unique user/event index prevents duplicate active Waiting entries while allowing a user to leave and later rejoin the queue.

After cancellation restores capacity, the transaction checks the oldest Waiting entry. Eligible requests are promoted in FIFO order, with a registration record and ticket created in the same transaction. A party that does not fit blocks later smaller requests rather than allowing them to jump the queue.

## QR ticket and event check-in

Every new confirmed Registration receives a cryptographically random ticket code. The attendee ticket endpoint returns an opaque QR payload and image URL. The code contains no attendee personal information. Admin check-in atomically sets checkedInAt and checkedInBy; an already-used or cancelled ticket is rejected.

The current QR image is rendered through an external QR image endpoint using only the opaque ticket code. An authenticated Admin API is still required to validate/check in a ticket.

## Email notifications

Booking confirmation and waitlist promotion messages are sent through Resend when RESEND_API_KEY and MAIL_FROM are configured. Email delivery is best-effort and is deliberately outside the database transaction; a temporary mail outage does not undo a successful booking. No email credential is required for local development.

## Admin analytics

The protected analytics endpoints aggregate users, upcoming events, confirmed bookings, reserved seats, booking revenue, top events, recent activity, occupancy and check-in counts. Revenue is a booking-value calculation, not a payment-provider settlement report.

## MongoDB deployment requirement

Booking, cancellation, and event deletion use multi-document transactions. The database must be a replica set or supported sharded cluster. The included Docker Compose stack starts a one-node replica set for local development. It is not a high-availability production database.

## API and frontend documentation

The OpenAPI 3.0.3 contract is stored in docs/openapi.json and copied to frontend/public/openapi.json for the static Swagger UI page. Locally, API docs are available at /api-docs; on the static frontend, open /docs.html.
