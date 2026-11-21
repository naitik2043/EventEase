# EventEase API testing checklist

Use Postman or Thunder Client. Start MongoDB and run `npm run seed:admin`, then start the API.

Base URL: `http://localhost:5000`

For protected requests, add:

```http
Authorization: Bearer <token>
```

## Suggested test sequence

### 1. Register a normal user

`POST /api/auth/register`

```json
{
  "name": "Demo User",
  "email": "demo.user@example.com",
  "password": "DemoPass123!"
}
```

Expected: `201 Created`, user data and JWT.

### 2. Login as Admin

`POST /api/auth/login`

```json
{
  "email": "admin@example.com",
  "password": "the ADMIN_PASSWORD from your .env"
}
```

Expected: `200 OK`, Admin role and JWT. Save this token as `adminToken` in Postman.

### 3. Login as normal user

`POST /api/auth/login` using the normal user's email and password. Save the token as `userToken`.

### 4. Create event as Admin

`POST /api/events` with `adminToken`.

```json
{
  "eventName": "Backend Development Workshop",
  "description": "Hands-on Node and Express session.",
  "category": "Technology",
  "eventDate": "2027-06-15T10:00:00.000Z",
  "venue": "KIET Group of Institutions, Ghaziabad",
  "totalSeats": 10,
  "registrationFee": 150
}
```

Expected: `201 Created`. Copy the returned event `_id` for the next tests.

### 5. Attempt to create event as normal user

Repeat `POST /api/events` with `userToken`.

Expected: `403 Forbidden`.

### 6. Browse upcoming events

`GET /api/events?search=Backend&category=Technology&page=1&limit=5`

Expected: `200 OK` and pagination information.

### 7. Book seats as normal user

`POST /api/registrations` with `userToken`.

```json
{
  "eventId": "PASTE_EVENT_ID_HERE",
  "numberOfSeats": 2
}
```

Expected: `201 Created`, `totalAmount: 300`, `registrationStatus: Confirmed`. Save registration `_id`.

### 8. View the logged-in user's registrations

`GET /api/registrations/my` with `userToken`.

Expected: `200 OK`, only the current user's registrations.

### 9. Try duplicate registration

Repeat step 7 for the same event and user.

Expected: `409 Conflict`.

### 10. Try insufficient seats

Create another upcoming event with only 1 seat. Try to book 2 seats.

Expected: `409 Conflict`; available seats should remain unchanged.

### 11. Try protected API without a token

Call `POST /api/registrations` or `POST /api/events` without the Authorization header.

Expected: `401 Unauthorized`.

### 12. Cancel the registration

`PATCH /api/registrations/PASTE_REGISTRATION_ID_HERE/cancel` with `userToken`.

Expected: `200 OK`; response should show the restored `availableSeats`.

### 13. Verify event seat count

`GET /api/events/PASTE_EVENT_ID_HERE`

Expected: `availableSeats` is back to 10 after the 2-seat registration is cancelled.

## Screenshot evidence

Capture genuine screenshots from your own local server. For each test, show the HTTP method, full endpoint, relevant request body or Authorization header, response body, and HTTP status. Include both successful and failed cases as required by the assessment brief.
