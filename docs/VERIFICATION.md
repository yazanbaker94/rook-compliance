# Verification record

Verified on August 26, 2026:

- Web production build: passed.
- Web production dependency audit: zero known vulnerabilities after updating Next.js to 16.3.2.
- API TypeScript build and Prisma client generation: passed.
- API unit tests: 9/9 passed, including duplicate-safe mobile sync, proposal review, imported-facility retention, obligation creation, audited assignment, audit events, and evidence approval.
- API REST bootstrap/sync and GraphQL smoke requests: passed against a running server.
- Android TypeScript check: passed.
- Expo Doctor: 21/21 checks passed.
- Android Metro production export: passed (628 modules bundled).
- Universal and arm64 Android release APKs: built and signed successfully; SHA-256 values are recorded in [`artifacts/README.md`](../artifacts/README.md).
- Python extraction tests: 5/5 passed, including a real 22-page synthetic PDF upload, line-wrap normalization, and physical page citations.
- Docker images for the web app, Node API, Python service, and PostgreSQL were built and started on the target Ubuntu VPS.
- Prisma's initial migration ran against PostgreSQL; the persistent production adapter seeded three synthetic facilities.
- Container health checks passed for PostgreSQL, the API, and document intelligence; the web container returned HTTP 200.
- Cloudflare Worker routing passed live checks at `https://swoop.video/corvus` for the dashboard, health endpoint, GraphQL, Android bootstrap, and document-service health; the existing Swoop website remained at the domain root.
- The raw VPS origin rejected requests without the private origin token.
- Browser acceptance tests passed for hash navigation/reload, obligation search/filter/create/status/detail/assignment, proposal edit/accept, PDF upload/extraction, cross-document proposal queue counts, field correction/approval, audit history, source citation display, and web-to-Android assignment handoff.
- The existing VPS-hosted site returned HTTP 200 after both Caddy configuration reloads.
- The production dependency audit reports zero known vulnerabilities for both the API and web workspaces.

Standalone universal and arm64 release APKs were subsequently built, signed, checksummed, and attached to the v0.1.0 GitHub release.

Dependency audit note: Expo reports a moderate advisory in native project-generation tooling. Expo Doctor confirms the SDK 57 dependency set is aligned, and npm's suggested forced remediation would incorrectly downgrade Expo to SDK 46.
