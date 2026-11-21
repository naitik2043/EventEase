# EventEase — Event Registration & Management System

A modular RESTful backend built with **Node.js, Express.js, MongoDB, and Mongoose** for the FSD practical assessment.

Users can create an account, log in, browse upcoming events, book seats, view their bookings, and cancel a booking. Admins can create, update, and delete events and view registrations for an event.

## 1. Features

- User registration and login with bcrypt password hashing.
- JWT-based authentication and Admin/User role authorization.
- Admin-only event creation, update, and deletion.
- Upcoming-event listing, name search, category filtering, and pagination.
- Event registration with duplicate-booking and seat-availability checks.
- Atomic seat decrement when a booking is confirmed.
- Cancellation that restores the seats.
- Users can see and cancel only their own registrations.
- Input validation, MongoDB query sanitization, Helmet, rate limiting, and centralized error handling.
- Modular models, controllers, routes, and middleware.

## 2. Requirements

- Node.js 18.18 or later (Node.js 20 LTS is a good choice).
- npm.
- MongoDB Community Server running locally, or a MongoDB Atlas connection string.
- Postman or Thunder Client for API testing.

## 3. Installation

Open a terminal in the `EventEase` folder:

```bash
npm install
```

If PowerShell blocks `npm` because script execution is disabled, use the Windows command shim:

```powershell
npm.cmd install
```

Create your local environment file by copying `.env.example` to `.env`.

PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set `MONGO_URI` and a long, random `JWT_SECRET`. For local MongoDB, the default URI is:

```env
MONGO_URI=mongodb://127.0.0.1:27017/eventease
```

Never commit `.env` or share its secrets.

## 4. Start MongoDB

Make sure your local MongoDB service is running before starting the API. If you use MongoDB Atlas, put your Atlas connection string in `MONGO_URI` instead.

## 5. Create the first Admin

Public registration intentionally creates a normal `User` role. A client cannot send `role: "Admin"` to promote itself.

Set these values in `.env`:

```env
ADMIN_NAME=EventEase Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChooseAStrongPassword123!
```

Run the seed command once:

```bash
npm run seed:admin
```

PowerShell alternative:

```powershell
npm.cmd run seed:admin
```

The seed command creates the Admin account if it does not exist. If the email already belongs to a registered account, it promotes that account to Admin without changing its password.

## 6. Run the server

Development mode (auto-restarts when files change):

```bash
npm run dev
```

PowerShell alternative:

```powershell
npm.cmd run dev
```

Normal mode:

```bash
npm start
```

The API runs at `http://localhost:5000` by default.

Health check:

```http
GET http://localhost:5000/api/health
```

## 7. Project structure

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
│   └── API_TESTING.md
├── .env.example
├── .gitignore
├── package.json
└── server.js
```

## 8. API reference

Base URL: `http://localhost:5000`

For protected endpoints, send the token from the login response in the request header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Authentication

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a normal user |
| POST | `/api/auth/login` | Public | Login and receive JWT |

Register body:

```json
{
  "name": "Naitik Gupta",
  "email": "naitik@example.com",
  "password": "StrongPass123!"
}
```

Login body:

```json
{
  "email": "naitik@example.com",
  "password": "StrongPass123!"
}
```

### Events

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/events` | Admin | Create an event |
| GET | `/api/events` | Public | List upcoming events |
| GET | `/api/events/:id` | Public | Get an event by ID |
| PUT | `/api/events/:id` | Admin | Update an event |
| DELETE | `/api/events/:id` | Admin | Delete an event |

Create event body:

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

`availableSeats` is initialized from `totalSeats` by the server. Do not send `createdBy` or `availableSeats`.

Search, filter, and pagination example:

```http
GET /api/events?search=web&category=Technology&page=1&limit=10
```

### Registrations

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/registrations` | Logged-in user | Book seats |
| GET | `/api/registrations/my` | Logged-in user | View own registrations |
| GET | `/api/registrations/event/:eventId` | Admin | View registrations for an event |
| PATCH | `/api/registrations/:id/cancel` | Registration owner | Cancel own registration |

Create registration body:

```json
{
  "eventId": "REPLACE_WITH_EVENT_MONGODB_ID",
  "numberOfSeats": 2
}
```

The API calculates `totalAmount` as `registrationFee * numberOfSeats`.

## 9. Important business rules

1. A public registration always creates a `User`; only the admin seed command creates/promotes an Admin account.
2. A user can have only one registration record for an event, including after cancelling it. The unique compound index enforces this at the database level.
3. Past events cannot be booked.
4. A booking is confirmed only if enough seats can be atomically reserved.
5. A user can view and cancel only their own registrations.
6. On cancellation, the registration status changes to `Cancelled` and the booked seat count is restored.
7. An event with confirmed registrations cannot be deleted.
8. When an Admin changes `totalSeats`, the number of already-booked seats is preserved; the new capacity cannot be lower than seats already booked.

## 10. API testing and submission evidence

Read [`docs/API_TESTING.md`](docs/API_TESTING.md) for a suggested Postman/Thunder Client sequence and test cases. Capture screenshots from your own running application showing the method, URL, request body or headers, response body, and status code.

The PDF assessment asks for screenshots covering registration/login, Admin event creation, a normal user's forbidden Admin action, a successful booking, own registrations, duplicate/insufficient-seat failures, missing-token rejection, and cancellation with restored seats.

## 11. Assessment note

This project provides the backend source and API setup. You still need to run it with your own MongoDB instance, verify the endpoints, and capture your own API-testing screenshots. Those screenshots cannot be pre-generated because they must come from your running application.
