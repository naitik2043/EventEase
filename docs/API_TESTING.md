# EventEase API Testing Guide

Base URL: http://localhost:5000

Interactive documentation: http://localhost:5000/api-docs

Use the included Postman collection or Swagger UI. Protected requests require:

```http
Authorization: Bearer <JWT>
```

## Suggested manual test sequence

1. Register a normal account using POST /api/auth/register.
2. Log in as the seeded Admin using POST /api/auth/login.
3. Log in as the normal user and save both JWTs.
4. Create an upcoming event using the Admin token.
5. Attempt to create an event with the User token; expect 403 Forbidden.
6. Browse events using GET /api/events?search=Workshop&category=Technology&page=1&limit=5.
7. Book seats as the normal user using POST /api/registrations.
8. View the user's registrations using GET /api/registrations/my.
9. Repeat the same booking; expect 409 Conflict.
10. Attempt to book more seats than are available; expect 409 Conflict and unchanged capacity.
11. Cancel the booking using PATCH /api/registrations/:id/cancel.
12. Fetch the event and verify the cancelled seats have been restored.
13. Attempt to delete an event with confirmed registrations; expect 409 Conflict.

## Automated tests

Unit tests:

```bash
npm run test:unit
```

MongoDB-backed integration tests require a dedicated test database running as a replica set. The database name must include test; the test suite refuses to run against another database name.

```bash
MONGO_TEST_URI="mongodb://127.0.0.1:27017/eventease_test?replicaSet=rs0" npm test
```

With Docker Compose, start the local replica set first:

```bash
docker compose up -d mongo
```

The GitHub Actions workflow provisions a disposable MongoDB replica set and runs unit and integration tests across Node.js 22, 24 and 26.

## Integration coverage

The integration suite covers public role assignment, login, invalid credentials, protected routes, Admin authorization, event creation and discovery, booking, duplicate prevention, cancellation and seat restoration, insufficient capacity, and deletion protection.

## Concurrency verification

The conditional seat decrement and MongoDB transaction provide the core concurrency-safety mechanism. Before a production release, run a stress test against the target MongoDB replica-set topology with simultaneous booking requests and verify that confirmed seat totals never exceed event capacity.

## Evidence screenshots

For assessment evidence, capture genuine requests from Postman or Swagger UI. Include the HTTP method, full endpoint, relevant request body or Authorization header, response body and HTTP status. Include both successful and rejected cases.
