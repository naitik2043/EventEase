# EventEase API Testing Guide

Base URL: http://localhost:5000

Interactive documentation:
- Swagger UI: http://localhost:5000/api-docs
- OpenAPI JSON: http://localhost:5000/api-docs/openapi.json

Protected requests require:

```http
Authorization: Bearer <JWT>
```

## Manual API verification flow
1. Start EventEase with a MongoDB replica set and seed an Admin.
2. Verify GET /api/health returns HTTP 200.
3. Register a normal user using POST /api/auth/register.
4. Log in as Admin and User through POST /api/auth/login.
5. Create an upcoming event with the Admin token.
6. Confirm a normal User receives 403 when creating, updating or deleting events.
7. Browse and filter events through GET /api/events.
8. Book seats using POST /api/registrations.
9. View bookings using GET /api/registrations/my.
10. View a ticket using GET /api/registrations/:id/ticket.
11. Verify the ticket using POST /api/registrations/check-in with the Admin token.
12. Verify a second check-in attempt receives 409.
13. Cancel a different confirmed registration using PATCH /api/registrations/:id/cancel.
14. Confirm seats are restored and the oldest eligible waitlist request is promoted.
15. Join a waitlist using POST /api/registrations/waitlist and inspect it with GET /api/registrations/waitlist/my.
16. Leave a waiting queue position using DELETE /api/registrations/waitlist/:id, then rejoin and verify the cancelled entry remains as history.
17. Test that a checked-in registration cannot be cancelled.
18. Review all Admin events using GET /api/events/admin/all.
19. Edit event capacity and verify reserved-seat accounting.
20. Review the event waitlist using GET /api/registrations/event/:eventId/waitlist.
21. Review platform and event analytics.
22. Test invalid ticket codes, duplicate registrations, insufficient capacity, cancelled-ticket access and cross-user ticket access.

## Automated checks

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

MongoDB-backed integration tests require a dedicated replica-set database whose name contains test:

```bash
MONGO_TEST_URI="mongodb://127.0.0.1:27017/eventease_test?replicaSet=rs0" npm test
```

The GitHub Actions workflow provisions a disposable MongoDB replica set, validates backend JavaScript, checks Docker Compose configuration, builds the production API image, and runs the API tests on Node.js 22 and 24.

## Important additional test scenarios
Before production release, extend or perform load tests for:
- Simultaneous booking when remaining capacity is smaller than an incoming request burst.
- Simultaneous cancellations and FIFO waitlist promotion.
- Duplicate ticket check-in attempts.
- Queue ordering when the oldest request needs more seats than are currently available.
- Event deletion while waitlist requests exist.
- Email provider timeouts and rejected sender configuration.

## Evidence screenshots
Capture real API requests from Postman or Swagger UI. Show the method, endpoint, sanitized request body, response body and HTTP status. Never include JWTs, passwords, private keys, database connection strings or real user email addresses in public screenshots.
