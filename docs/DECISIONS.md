# Product and architecture decisions

## 1. Build one vertical product

The strongest answer to the brief is not separate web and Android toys. A single approval-to-evidence workflow proves architecture, product thinking, full-stack execution, mobile work, AI judgment, and deployment together.

## 2. Keep the environmental professional in control

Extraction produces **proposals**, not published obligations. Every proposal includes the exact source page, source text, confidence, and a review state. Acceptance and rejection are auditable actions. This avoids presenting probabilistic output as regulatory advice.

## 3. Treat offline as a data model, not a banner

Field sites often have unreliable coverage. Android records are written to SQLite before any network request. The user sees queued and synced states. A stable `localId` is sent as an idempotency key, so retries cannot create duplicate evidence.

## 4. Use GraphQL for the product, REST for constrained mobile sync

The web product benefits from flexible typed queries across facilities, obligations, proposals, and submissions. Mobile synchronization has a small, explicit batch contract and benefits from a simple REST endpoint that is easy to retry and observe.

## 5. Separate document intelligence from the core API

PDF parsing and future model inference have different dependencies and scaling characteristics from the transactional product. FastAPI isolates that workload while Node remains the source of product workflow rules.

## 6. Make the public demo safe and reproducible

The checked-in dataset is synthetic and deterministic. This supports a repeatable product evaluation without pretending that a portfolio prototype is authorized for client data. The production demo uses Prisma/PostgreSQL persistence, while authentication, tenancy, backups, retention, residency, and monitoring remain explicit hardening requirements.

## 7. Deploy the browser client and APIs differently when useful

The web frontend and APIs can be hosted independently when useful. The current deployment runs the stateful Node/Python services and an HTTPS API consumed by Android on a dedicated VPS. The included Docker Compose configuration also supports operating the complete demonstration as one isolated stack.

## 8. Scope deliberately

The first version optimizes for one convincing workflow. It does not include regulator integrations, real client data, OCR for scanned permits, automatic legal interpretations, Auth0, production PostgreSQL wiring, background media upload, push notifications, or app-store release. Those are explicit next increments, not hidden omissions.
