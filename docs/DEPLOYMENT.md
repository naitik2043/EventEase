# EventEase Backend Deployment Guide

EventEase is an Express REST API service. It does not ship a browser frontend or a frontend build.

## Production requirements

- Node.js 22.12+ or Node.js 24.
- A managed MongoDB replica set or supported sharded cluster; booking and waitlist operations use transactions.
- A unique, high-entropy JWT_SECRET with at least 32 characters.
- An explicit CORS_ORIGIN allowlist if browser clients will call the API.
- HTTPS, restricted database network access, backups and monitoring.
- Optional Resend credentials for booking and waitlist notifications.

## Local Docker Compose

1. Copy the environment template.
2. Set a unique JWT secret and local Admin seed credentials.
3. Start the API and local one-node MongoDB replica set.

```bash
cp .env.example .env
docker compose up --build
docker compose exec api npm run seed:admin
```

API endpoints:

- Health: http://localhost:5000/api/health
- Swagger UI: http://localhost:5000/api-docs
- OpenAPI JSON: http://localhost:5000/api-docs/openapi.json

The Docker MongoDB replica set is for development/testing only. Use a managed, highly available replica set for production.

## Run as a Node.js service

1. Provision a MongoDB replica set.
2. Configure the environment variables in the hosting provider's secret manager.
3. Install production dependencies with `npm ci --omit=dev`.
4. Start the service with `npm start`.
5. Ensure the host provides the PORT environment variable and forwards HTTPS traffic to the application.
6. Run the Admin seed script once from a trusted environment connected to the production database.

```bash
npm ci --omit=dev
npm start
```

Do not run the Admin seed script automatically on every server startup or serverless cold start.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| PORT | No | HTTP port; defaults to 5000 |
| NODE_ENV | Production | Set to production |
| MONGO_URI | Yes | Managed MongoDB replica-set connection |
| JWT_SECRET | Yes | Unique random secret, 32+ characters |
| JWT_EXPIRES_IN | No | Defaults to 1d |
| CORS_ORIGIN | Production | Exact comma-separated browser client origins |
| RESEND_API_KEY | Optional | Resend API key |
| MAIL_FROM | Optional | Verified Resend sender |
| ADMIN_NAME | Admin seed | Initial Admin name |
| ADMIN_EMAIL | Admin seed | Initial Admin email |
| ADMIN_PASSWORD | Admin seed | Initial Admin password |

Keep credentials in the hosting provider's encrypted environment settings. Never commit real values to GitHub or expose them in logs/screenshots.

## Provision the first Admin

Public registration always creates a normal User. Provision the first Admin through a controlled seed operation:

```bash
npm run seed:admin
```

Run it once from a trusted terminal with MONGO_URI and ADMIN_* variables set.

## Email notifications

Booking confirmation and waitlist promotion emails are optional. Configure RESEND_API_KEY and MAIL_FROM only after verifying the sender/domain in Resend. Delivery is best-effort and does not change booking state if the provider is unavailable.

## Production checklist

- Use a managed MongoDB replica set with backups and tested restore procedures.
- Restrict Atlas network access to the backend host's egress IPs where possible.
- Use a unique JWT secret and explicit CORS allowlist.
- Use HTTPS and least-privilege MongoDB database credentials.
- Seed Admin credentials through a trusted environment.
- Configure Resend sender verification only if email is enabled.
- Run the integration suite against a disposable test database.
- Perform concurrency, load, abuse and security testing.
- Monitor API latency, errors, database load and email delivery.
- Configure operational log retention and an incident-response process.
