# Contributing to EventEase

Thank you for considering a contribution.

## Development setup

1. Use Node.js 22 or a later supported LTS release.
2. Start a MongoDB replica set. Transactions are required by booking and cancellation.
3. Copy .env.example to .env and configure local values.
4. Install dependencies with npm ci.
5. Seed a local Admin account with npm run seed:admin.
6. Start the API with npm run dev.

The included Docker Compose configuration provides a local single-node MongoDB replica set.

## Engineering practices

- Keep route declarations, controllers, models, middleware and shared utilities in their existing layers.
- Validate untrusted request data at the route boundary.
- Enforce permissions on the server; never trust a role supplied by a client.
- Preserve transactional booking and cancellation behavior.
- Add or update integration tests for API behavior and database invariants.
- Update the OpenAPI specification and documentation whenever endpoint behavior changes.
- Never commit .env, tokens, database credentials, backups or generated dependencies.

## Verification

```bash
npm ci
npm run test:unit
```

For the complete suite, configure an isolated MongoDB replica set and set MONGO_TEST_URI to a database whose name includes test, then run:

```bash
npm test
```

Also verify affected endpoints using the Postman collection or Swagger UI, review git diff, and ensure no secrets are staged.

## Commit messages

Use conventional prefixes:

- feat: new capability
- fix: bug fix
- docs: documentation
- test: tests
- refactor: restructuring without intended behavior change
- chore: maintenance and tooling

Prefer small, reviewable commits that describe meaningful changes.

## Pull requests

Describe the problem, implementation, API or data-model changes, tests run, and operational requirements. Include screenshots for meaningful API or documentation changes.
