# Deployment Guide

EventEase supports local Docker execution and a Vercel Git deployment. It requires a MongoDB replica set because bookings, cancellations and waitlist promotions use multi-document transactions.

## Local Docker Compose

1. Copy the environment template.
2. Configure a strong local JWT secret and Admin seed credentials.
3. Start MongoDB and the API.

```bash
cp .env.example .env
docker compose up --build
docker compose exec api npm run seed:admin
```

The local application is available at http://localhost:5000 and the Swagger UI at http://localhost:5000/api-docs.

The included MongoDB single-node replica set is for development and testing only. Do not use it as a highly available production database.

## Vercel Git deployment

The root vercel.json builds the React application with Vite into frontend/dist and deploys that output together with the Express catch-all serverless function at api/[...slug].js. The frontend uses same-origin /api requests, so a separate API hostname is not required.

1. Import the GitHub repository in Vercel.
2. Keep the project Root Directory at the repository root.
3. Use the repository's default Build Command and Output Directory from vercel.json (npm run build / frontend/dist).
4. Add the required Production and Preview environment variables in Vercel Project Settings.
5. Connect a managed MongoDB replica set (for example, MongoDB Atlas).
6. Deploy the main branch and verify /, /api/health, /docs.html, login and a test booking.

Required Vercel environment variables:

| Variable | Required | Notes |
|---|---|---|
| MONGO_URI | Yes | Managed replica-set connection string; allow access from the deployment platform |
| JWT_SECRET | Yes | Unique random secret with at least 32 characters |
| JWT_EXPIRES_IN | No | JWT lifetime; defaults to 1d |
| NODE_ENV | Production | Set to production |
| CORS_ORIGIN | Production | Exact deployed application origin |
| APP_BASE_URL | Recommended | Deployed application URL used in notification content |
| RESEND_API_KEY | Optional | Resend API key for email notifications |
| MAIL_FROM | Optional | Verified sender address/domain in Resend |
| ADMIN_NAME | Admin seed | Used only by npm run seed:admin |
| ADMIN_EMAIL | Admin seed | Used only by npm run seed:admin |
| ADMIN_PASSWORD | Admin seed | Used only by npm run seed:admin |

Do not put production credentials in GitHub files, README examples, or screenshots. Configure them in Vercel's encrypted Environment Variables UI. Keep Preview and Production database credentials separated where possible.

## Provisioning the first Admin

The application intentionally does not allow public users to select an Admin role. Create the first Admin through a controlled seed operation against the intended database. Run npm run seed:admin from a trusted environment with MONGO_URI and ADMIN_* variables set. Avoid running the seed operation on every serverless cold start.

## Email notifications

Booking confirmation and waitlist promotion emails are optional. Configure RESEND_API_KEY and MAIL_FROM only after verifying the sender/domain in Resend. Delivery is best-effort and does not change booking state if the email provider is unavailable.

## QR tickets

Ticket codes are random, opaque identifiers. The UI uses an external QR image endpoint to render the opaque code as a QR image; no attendee email or name is sent to that service. Admin check-in is performed by the authenticated API, not by trusting the QR image itself.

## Production checklist

- Use a managed MongoDB replica set with backups and tested restore procedures.
- Use a unique JWT secret and exact CORS allowlist.
- Use HTTPS and restrict database network access.
- Seed Admin credentials through a secret manager or trusted terminal.
- Configure Resend sender verification if email notifications are enabled.
- Review CodeQL and Dependabot alerts.
- Run the integration suite against a disposable test database.
- Perform concurrency, load, abuse and security testing.
- Monitor API latency, errors, database load, and email delivery.
- Configure retention policies for operational logs.
