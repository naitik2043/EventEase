# Deployment Guide

EventEase is a Node.js API backed by MongoDB. Booking and cancellation use multi-document transactions, so the database must run as a replica set or on a supported sharded cluster.

## Recommended deployment checklist

1. Provision a managed MongoDB replica set.
2. Provision a Node.js 22, 24, or 26 runtime, or deploy the Docker image.
3. Configure NODE_ENV=production.
4. Set MONGO_URI to the private database connection string.
5. Set a unique, high-entropy JWT_SECRET of at least 32 characters.
6. Set JWT_EXPIRES_IN to the required token lifetime.
7. Set CORS_ORIGIN to exact trusted frontend origins, comma-separated.
8. Configure a strong Admin account through your secret manager.
9. Run npm run seed:admin as a controlled release operation.
10. Enable HTTPS, database backups, monitoring, and log retention at the hosting provider.

The application refuses to start in production if the JWT secret is missing/weak or the CORS allowlist is not configured.

## Docker deployment

The included Docker Compose stack starts MongoDB as a single-node replica set and the EventEase API.

```bash
cp .env.example .env
# Edit .env and provide strong local secrets.
docker compose up --build
```

The API is available at http://localhost:5000, health check at /api/health, and interactive documentation at /api-docs.

Seed the Admin account in a second terminal:

```bash
docker compose exec api npm run seed:admin
```

Stop the stack:

```bash
docker compose down
```

To remove the local database volume too (destructive):

```bash
docker compose down -v
```

Do not use the bundled single-node replica set as a highly available production database. Use a managed replica set for production.

## Operational considerations

- Configure HTTPS at the hosting provider or reverse proxy.
- Keep .env and database credentials out of Git.
- Use a secret manager rather than committing production values.
- Configure backups and test restoration.
- Monitor HTTP error rates, latency, process restarts, and database health.
- Set resource limits and log retention in the hosting platform.
- Run integration tests against a disposable test database, never production.
