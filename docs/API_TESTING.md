# EventEase API Testing Guide

Base URL: http://localhost:5000

Interactive documentation:
- Local Express: http://localhost:5000/api-docs
- Frontend Swagger UI: http://localhost:5000/docs.html

Protected requests require:

```http
Authorization: Bearer <JWT>
```

## Manual verification flow

1. Start EventEase with a MongoDB replica set and seed an Admin.
2. Register a normal user using POST /api/auth/register.
3. Log in as Admin and User through POST /api/auth/login.
4. Create an upcoming event with the Admin token.
5. Confirm that a User token receives 403 when creating/updating/deleting events.
6. Browse and filter upcoming events through GET /api/events.
7. Book seats using POST /api/registrations.
8. View bookings using GET /api/registrations/my.
9. View the ticket using GET /api/registrations/:id/ticket; capture the QR code and opaque ticket code.
10. Verify the ticket using POST /api/registrations/check-in with the Admin token.
11. Verify a second check-in attempt receives 409.
12. Cancel a different confirmed registration using PATCH /api/registrations/:id/cancel.
13. Confirm seats are restored and the oldest eligible waitlist requests are promoted.
14. Join a waitlist using POST /api/registrations/waitlist, then check GET /api/registrations/waitlist/my.
15. Leave a waiting queue position using DELETE /api/registrations/waitlist/:id, then rejoin and verify the cancelled entry remains as history.
16. Test that a checked-in registration cannot be cancelled.
17. Review all Admin events, including past events, using GET /api/events/admin/all.
18. Edit total event capacity and verify that already-reserved seats are preserved.
19. Review the event queue using GET /api/registrations/event/:eventId/waitlist with an Admin token.
20. Review platform metrics using GET /api/analytics/overview and GET /api/events/:id/analytics.
21. Test invalid ticket codes, duplicate registrations, insufficient capacity, cancelled-ticket access and cross-user ticket access.

## Frontend verification

Run the Vite production build and React compilation:

```bash
npm run build
```

For local UI development, start the Express API with `npm run dev` and the Vite server with `npm run dev:web`. Vite proxies same-origin API requests to the Express server.

## Automated API tests

Unit and integration suite:

```bash
npm ci
npm run build
npm test
```

MongoDB-backed integration tests require a dedicated database whose name includes test and a replica-set connection:

```bash
MONGO_TEST_URI="mongodb://127.0.0.1:27017/eventease_test?replicaSet=rs0" npm test
```

The GitHub Actions workflow starts a disposable MongoDB replica set, builds the React/Vite frontend, validates Docker configuration and builds the production image. The matrix runs on Node.js 22 and 24.

## Important additional test scenarios

Before production release, extend or perform load tests for:
- Simultaneous booking when the remaining capacity is smaller than the incoming request burst.
- Simultaneous cancellations and FIFO waitlist promotion.
- Duplicate ticket check-in attempts.
- Waitlist queue order when the oldest request needs more seats than currently available.
- Event deletion while waitlist requests exist.
- Email provider timeouts and rejected sender configuration.

## Evidence screenshots

Capture real requests from Postman or Swagger UI. Show the method, endpoint, sanitized request body, response body and HTTP status. Never include JWTs, passwords, private keys, or real user email addresses in public screenshots.
