# Repository Guidelines

## Project Structure & Module Organization
Citoid is a Node.js service with a flat top-level layout.

- `server.js`: service entrypoint (`service-runner`, launched via Bun script).
- `app.js`: Express app initialization, middleware, route loading, and config defaults.
- `routes/`: API route handlers (`citoid`, `info`, `root`).
- `lib/`: core business logic (citation pipeline, Zotero integration, translators, external API adapters).
- `test/`: Mocha test suites by area: `features/app`, `features/errors`, `features/scraping`, `features/unit`, `zotero`.
- `config.dev.yaml`, `config.prod.yaml`, `config.yaml`: runtime configuration.
- `.pipeline/` and `dist/`: CI/container build configuration and packaging artifacts.

## Build, Test, and Development Commands
Use Bun (recommended) with Node.js 20 or 22 available for compatibility checks.

- `bun install`: install dependencies (uses `bun.lock`).
- `bun run start`: run via `service-runner` using `config.yaml`.
- `bun run local`: run local CLI wrapper (`scripts/citoid-local.js`).
- `bun run test`: lint + core feature suites.
- `bun run test:zotero`: full test run including Zotero-heavy tests.
- `bun run coverage`: run `nyc` coverage.
- `bun run lint` / `bun run lint:fix`: enforce/fix ESLint rules.

## Coding Style & Naming Conventions
- Follow ESLint config `wikimedia/server` (`.eslintrc.json`).
- Use tabs for indentation and single quotes in JS, matching existing files.
- Prefer `camelCase` for variables/functions; keep existing class-style filenames in `lib/` (for example `CitoidService.js`).
- Route and translator files are typically lowercase (`routes/info.js`, `lib/translators/crossRef.js`).

## Testing Guidelines
- Frameworks: Mocha + Chai; `nock` for HTTP mocking; `nyc` for coverage.
- Place tests near matching domains (`test/features/unit/*`, `test/features/scraping/*`, etc.).
- Name tests by behavior or integration target (for example `semantic-scholar-service.js`, `redirect.js`).
- Run `bun run test` before submitting; run `bun run test:zotero` when changing Zotero/translators/scraping flow.

## Commit & Pull Request Guidelines
- Commit messages are short, imperative, and often prefixed by scope/type, e.g. `build: Update cheerio to 1.2.0` or `Fix error logging`.
- Keep commits focused; separate dependency bumps from behavior changes.
- Main review workflow is Gerrit (`.gitreview` points to `gerrit.wikimedia.org`). Include:
  - what changed and why,
  - testing performed (`bun run test`, targeted suites),
  - linked Phabricator task when applicable.
- If a GitHub PR is used as a mirror workflow, include equivalent details and logs.
