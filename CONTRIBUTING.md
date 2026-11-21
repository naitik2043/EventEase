# Contributing to EventEase

Thank you for helping improve EventEase. Keep changes focused, tested, and documented.

## Development setup

1. Fork or clone the repository.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and configure a local MongoDB connection.
4. Start MongoDB.
5. Run `npm run seed:admin` when you need a local Admin account.
6. Start the API with `npm run dev`.

## Working practices

- Create a feature branch from `main` for a focused change.
- Keep controllers, routes, middleware, models, and utilities in their existing layers.
- Validate untrusted request data at the route boundary.
- Keep authorization checks on the server; never trust a role supplied by a client.
- Preserve the seat-capacity and ownership rules when changing registration behavior.
- Do not commit `.env`, real credentials, tokens, database dumps, or `node_modules`.
- Update the README, API testing guide, Postman collection, or architecture notes when behavior changes.

## Commit messages

Use clear, conventional prefixes:

- `feat:` new user-facing capability
- `fix:` bug fix
- `docs:` documentation-only change
- `test:` tests or test data
- `refactor:` code restructuring without intended behavior change
- `chore:` maintenance and tooling

Prefer small commits that represent real, reviewable changes. Do not create empty commits or split an unchanged file into artificial commits merely to inflate the commit count.

## Verification

Before opening a pull request:

- Install dependencies with `npm ci` or `npm install`.
- Run the API locally with MongoDB available.
- Exercise affected endpoints using the Postman collection or Thunder Client.
- Verify successful and failure cases, including authentication and authorization boundaries.
- Check `git diff` and `git status` to ensure no secrets or generated files are staged.

The repository currently has a manual API-testing workflow and does not yet define an automated test command. Include the steps and results you manually verified in your pull request description.

## Pull requests

Provide a concise summary, the reason for the change, endpoints or files affected, verification performed, and screenshots for API behavior or documentation changes where useful.
