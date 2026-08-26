# Four-minute product walkthrough

This evaluation path demonstrates the complete approval-to-evidence lifecycle with synthetic data.

## 0:00 — Problem and safety boundary

Environmental approvals contain commitments that must become scheduled, assigned, evidence-backed work. Rook preserves the relationship between the source clause, the operational obligation, the field submission, and the reviewer’s final decision.

AI output remains a proposal until a consultant accepts it. No generated interpretation becomes an official obligation automatically.

## 0:30 — Portfolio and facility awareness

The **Overview** presents high-risk work, open obligations, evidence awaiting review, pending document proposals, facility readiness, and the review queue.

The **Facilities** view explains readiness at site level. Readiness is a navigation aid derived from open and high-risk obligations, not an unexplained model score.

## 1:05 — Human-reviewed approval extraction

The **Approvals & permits** workflow accepts [`output/pdf/corvus-synthetic-operating-approval.pdf`](../output/pdf/corvus-synthetic-operating-approval.pdf). The 22-page synthetic document produces three proposals with physical-page citations on pages 14, 18, and 22.

Each proposal exposes its source text, confidence, operational wording, frequency, evidence requirement, applicability, and decision state. Editing is audited. Acceptance creates a source-linked obligation; rejection remains in the audit trail.

## 2:05 — Assignment and offline field execution

The **Obligations** register supports search, facility/status filters, source inspection, status changes, and owner assignment. Work assigned to **Jordan Lee** appears in Rook Field through the production mobile bootstrap API.

On Android, assignments are cached in SQLite. The field workflow records a checklist, reading or completion reference, field notes, camera evidence, and optional GPS. Saving is local-first, and each queued record carries a stable local identifier so retries cannot create duplicate evidence.

## 3:10 — Evidence decision and audit closure

After synchronization, **Field evidence** exposes the reading, capture time, sync state, GPS location, photos, field note, and review history. A consultant can approve the submission or return it with a correction note.

Approval completes the related obligation. A correction returns the obligation to field work and surfaces the reviewer note in the Android app.

## 3:40 — Engineering evidence

The repository includes:

- a Next.js/TypeScript consultant console;
- a Node.js GraphQL API and idempotent mobile REST sync contract;
- a Prisma/PostgreSQL operational data model;
- a FastAPI document-extraction service with PDF tests;
- an Expo/React Native Android application with SQLite persistence;
- Docker Compose, Caddy, and path-scoped Cloudflare routing; and
- GitHub Actions verification and deployment workflows.

The current boundary is intentionally explicit: this is a production-shaped synthetic-data demonstration, not a system authorized to store real client information.
