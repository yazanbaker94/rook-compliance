# Verification record

Verified on August 25, 2026:

- Web production build: passed.
- Web production dependency audit: zero known vulnerabilities after updating Next.js to 16.3.2.
- API TypeScript build and Prisma client generation: passed.
- API unit tests: 3/3 passed, including duplicate-safe mobile sync.
- API REST bootstrap/sync and GraphQL smoke requests: passed against a running server.
- Android TypeScript check: passed.
- Expo Doctor: 21/21 checks passed.
- Android Metro production export: passed (628 modules bundled).
- Native arm64 Android debug APK: built and signed successfully; SHA-256 is recorded beside the artifact.
- Python extraction tests: 2/2 passed.
- Docker images for the web app, Node API, Python service, and PostgreSQL were built and started on the target Ubuntu VPS.
- Prisma's initial migration ran against PostgreSQL; the persistent production adapter seeded three synthetic facilities.
- Container health checks passed for PostgreSQL, the API, and document intelligence; the web container returned HTTP 200.
- Cloudflare Worker routing passed live checks at `https://swoop.video` for the dashboard, health endpoint, GraphQL, Android bootstrap, and document-service health.
- The raw VPS origin rejected requests without the private origin token.
- A real browser session loaded the dashboard and reported `API connected`.
- The existing VPS-hosted site returned HTTP 200 after both Caddy configuration reloads.
- The production dependency audit reports zero known vulnerabilities for both the API and web workspaces.

A standalone local release APK was attempted after the successful debug build, but the workstation ran out of disk space while Gradle was merging release libraries. The EAS `preview` profile remains the clean path to a shareable standalone APK; no source or integration error blocked that build.

Dependency audit note: Expo reports a moderate advisory in native project-generation tooling. Expo Doctor confirms the SDK 57 dependency set is aligned, and npm's suggested forced remediation would incorrectly downgrade Expo to SDK 46.
