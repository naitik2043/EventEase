# EventEase Architecture

This document describes the current backend implementation in this repository.

## 1. High-level design

EventEase follows a layered Express application structure:

```text
HTTP client (Postman / Thunder Client / future frontend)
                     |
                     v
              Express server
                     |
        Security + parsing middleware
                     |
           API route modules
                     |
       Validation / authentication
                     |
                Controllers
                     |
          Mongoose models / queries
                     |
                  MongoDB
                     |
          Central error middleware
                     |
               JSON response
```

The server connects to MongoDB before it starts listening for HTTP requests. API routes are mounted under `/api`.

## 2. Request lifecycle

1. `server.js` loads environment variables and configures Express.
2. Helmet, CORS, JSON/body parsing, MongoDB query sanitization, and API rate limiting run before route handlers.
3. A route applies request validators and `validateRequest` where request data is expected.
4. Protected routes run `protect`, which verifies the Bearer JWT and loads the current user from MongoDB.
5. Admin-only routes additionally run `restrictToAdmin`.
6. A controller performs the business operation through Mongoose models.
7. Successful requests return a JSON response; rejected async controller operations are forwarded to the centralized error handler.

## 3. Main modules

| Directory / file | Responsibility |
|---|---|
| `server.js` | Application setup, global middleware, route mounting, health endpoint, server startup |
| `config/db.js` | MongoDB connection through Mongoose |
| `models/User.js` | User data, role, password hashing and password comparison |
| `models/Event.js` | Event data, capacity, fee, creator, and event indexes |
| `models/Registration.js` | Booking data, status, amount, and unique user/event index |
| `routes/` | HTTP endpoints, validation chains, middleware composition |
| `controllers/` | Authentication, event, and registration use cases |
| `middleware/authMiddleware.js` | JWT verification and current-user lookup |
| `middleware/adminMiddleware.js` | Admin role authorization |
| `middleware/validateRequest.js` | Converts validation failures into application errors |
| `middleware/errorMiddleware.js` | Not-found handling and consistent JSON errors |
| `utils/AppError.js` | HTTP-aware operational error type |
| `utils/asyncHandler.js` | Forwards rejected async handlers to Express error middleware |
| `scripts/seedAdmin.js` | Creates or updates the configured Admin account |
| `docs/` | API testing instructions and Postman collection |

## 4. Authentication and authorization

### Registration

- `POST /api/auth/register` validates name, email, and password.
- The controller checks whether the email already exists.
- New public accounts are explicitly created with role `User`; role data from a request is not used.
- The User model hashes the password before saving.
- A JWT is returned after successful registration.

### Login and protected routes

- `POST /api/auth/login` loads the user's password for comparison and checks it with bcryptjs.
- A signed JWT containing the user ID is returned.
- `protect` requires the `Authorization: Bearer <token>` header, verifies the JWT, and loads the current user record.
- `restrictToAdmin` checks the current database role and rejects non-Admin accounts with HTTP 403.

## 5. Booking lifecycle

### Create a booking

1. The registration router requires authentication and validates the event ID and seat count.
2. The controller checks that the event exists and is in the future.
3. It checks whether the user already has a registration record for the event.
4. It creates the registration record. A unique compound index on `{ userId, eventId }` is the final duplicate guard.
5. It conditionally decrements `availableSeats` only when the event is still upcoming and has at least the requested number of seats.
6. If that seat update fails, the just-created registration is deleted and the request returns an error.
7. The created registration is populated with basic event details and returned.

### Cancel a booking

1. The controller finds the registration by both its ID and the authenticated user's ID.
2. It rejects missing or already-cancelled registrations.
3. It conditionally changes the status from `Confirmed` to `Cancelled`.
4. It increments the event's `availableSeats` by the number previously booked.
5. If the event cannot be found for seat restoration, the controller attempts to revert the registration status and reports an error.

### Consistency boundary

The seat decrement/increment operations use MongoDB conditional updates, and duplicate registrations are protected by a unique index. However, registration records and event seat counts are separate MongoDB documents. The current implementation uses compensating cleanup; it does **not** wrap both writes in a multi-document transaction. A deployment that requires stronger crash-safe consistency should use MongoDB transactions on a replica set and add integration tests for concurrent booking and cancellation.

Event deletion also uses a read/check/delete sequence across separate operations. A booking request could interleave between the confirmed-registration check and the event deletion. Before production use, protect event lifecycle changes with a transaction or an explicit event state/locking strategy, and add a concurrency test for deletion racing with registration.

## 6. Event lifecycle

- Public clients can list upcoming events and read event details.
- Event listing supports search, category filtering, page number, and page size.
- Only Admins can create, update, or delete events.
- The server initializes available capacity and assigns the creator; clients cannot set these protected fields.
- Deletion is rejected while confirmed registrations exist. Cancelled registration records are removed when an event is deleted.
- When an Admin changes total capacity, the controller preserves the number of seats already booked and calculates the new available capacity.

## 7. Error handling

Controllers use `asyncHandler` to forward asynchronous errors. `AppError` carries an HTTP status code and optional details. The centralized error middleware normalizes common Mongoose and body-parser errors, handles unknown routes, and avoids exposing internal 500-level messages in production.

## 8. Configuration and operational controls

- `MONGO_URI` selects the MongoDB database.
- `JWT_SECRET` and `JWT_EXPIRES_IN` configure token signing and lifetime.
- `CORS_ORIGIN` can restrict browser origins; configure explicit trusted origins for deployment.
- Helmet, request-size limits, MongoDB sanitization, a general API rate limit, and a stricter authentication rate limit are configured in the server/routes.

For the exact supported endpoint list and example payloads, see [API reference in the README](../README.md#api-reference). For a practical request sequence, see [API_TESTING.md](./API_TESTING.md).
