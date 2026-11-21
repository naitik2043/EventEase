# EventEase Backend Architecture

## Product overview
EventEase is a backend-only event management REST API. It uses a layered Express application and MongoDB through Mongoose. No frontend or browser dashboard is included.

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

## Repository modules

| Path | Responsibility |
|---|---|
| app.js | Configures Express middleware, API docs, health check and route mounts |
| server.js | Node.js entry point, production configuration validation and graceful shutdown |
| config/db.js | Reuses the Mongoose connection |
| config/runtime.js | Validates production JWT and CORS configuration |
| routes/ | HTTP endpoints, request validation and authentication/authorization ordering |
| controllers/ | Authentication, event, registration, ticket, waitlist and analytics use cases |
| models/ | User, Event, Registration and Waitlist schemas and indexes |
| services/emailService.js | Best-effort booking and waitlist email delivery through Resend |
| middleware/ | JWT auth, Admin authorization, validation, request logging and centralized errors |
| utils/ | Shared application errors, async handler and structured logger |
| docs/ | OpenAPI contract, Swagger initializer, Postman collection and operational guides |
| scripts/ | Admin seeding and backend syntax validation |
| test/ | Unit tests and MongoDB-backed HTTP integration tests |
| Dockerfile / docker-compose.yml | API image and local MongoDB replica-set stack |

## Request lifecycle
1. An API client sends an HTTP request.
2. Locally, server.js validates production configuration, connects to MongoDB and starts Express.
3. app.js applies request logging, Helmet, CORS, request-size limits, MongoDB query sanitization and API rate limiting.
4. Routers validate request data and run JWT authentication where required.
5. Admin-only routes also run role authorization.
6. Controllers enforce business rules and use Mongoose models.
7. asyncHandler forwards rejected promises to centralized error handling.
8. Express returns JSON with consistent status codes and request IDs for errors.

## Health and readiness
GET /api/health is a liveness check confirming that the HTTP process responds. GET /api/health/ready checks the Mongoose connection state and returns HTTP 200 only when MongoDB is connected; otherwise it returns HTTP 503. Container orchestration should use the readiness endpoint when it needs to know whether the API can serve database-backed requests.

## Booking and cancellation consistency
A booking updates Event.availableSeats and creates a Registration inside one MongoDB transaction. The seat decrement is conditional on availableSeats being greater than or equal to the requested quantity. A unique compound index on { userId, eventId } prevents duplicate registrations for the same attendee/event pair.

Cancellation changes the registration state and restores seats in one transaction. Historical registration data is retained.

## FIFO waitlist
A Waitlist document stores the user, event, requested seat count, queue timestamp and status. The partial unique user/event index prevents duplicate active Waiting entries while allowing a user to leave and later rejoin.

After cancellation restores capacity, the transaction checks the oldest Waiting entry. Eligible requests are promoted in FIFO order, with the new Registration and seat reservation committed in the same transaction.

## QR ticket and event check-in
Every new confirmed Registration receives a cryptographically random ticket code. The authenticated ticket endpoint returns an opaque QR payload and image URL. The code contains no attendee personal information. Admin check-in atomically sets checkedInAt and checkedInBy; an already-used or cancelled ticket is rejected.

The QR image is rendered through an external QR image endpoint using only the opaque ticket code. An authenticated Admin API is still required to validate/check in a ticket.

## Email notifications
Booking confirmations and waitlist promotion messages can be sent through Resend when RESEND_API_KEY and MAIL_FROM are configured. Delivery is best-effort and outside the database transaction; a temporary mail outage does not undo a successful booking.

## Admin analytics
Protected analytics endpoints aggregate users, upcoming events, confirmed bookings, reserved seats, booking value, top events, recent activity, occupancy, active waitlist entries and check-in counts. Revenue is a booking-value calculation, not a payment-provider settlement report.

## MongoDB deployment requirement
Booking, cancellation and waitlist promotion use multi-document transactions. The database must be a replica set or supported sharded cluster. The included Docker Compose stack starts a one-node replica set for local development; it is not a high-availability production database.

## API documentation
The OpenAPI 3.0.3 contract is stored in docs/openapi.json. Express serves Swagger UI at /api-docs and the JSON contract at /api-docs/openapi.json.
