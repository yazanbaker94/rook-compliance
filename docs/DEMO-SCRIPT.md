# Four-minute walkthrough

## 0:00 — Frame the problem

“Environmental consulting turns dense approvals into recurring operational work. I built Rook to carry one requirement all the way from the source document to reviewed field evidence.”

Mention that every record is synthetic and that AI output cannot become a compliance obligation without a person.

## 0:30 — Show portfolio awareness

Open the web overview. Point to readiness, open work, evidence coverage, and North Ridge’s explainable attention state. Open Facilities to show the chart.

Say: “The score is a navigation aid, not an unexplained AI verdict.”

## 1:05 — Review an approval

Choose **Import approval**, then show the page citation, extracted frequency, confidence, and original sentence. Reject one proposal, accept another, and change one decision.

Open **Obligations**. The accepted item is represented in the workflow. Drag a card from Upcoming to In field.

Say: “Automation saves reading and transcription time, while the consultant retains authorship and accountability.”

## 2:05 — Complete the work on Android

Open Rook Field. Turn on airplane mode if practical. Open the wastewater inspection, complete its checklist, enter a result, capture a photo/GPS point, and save.

Open the sync queue. Emphasize that the record is in SQLite and survives an app restart. Restore connectivity and sync.

Say: “Sync is idempotent, so repeated retries cannot duplicate the inspection.”

## 3:10 — Close the loop

Return to **Field work** in the web console. Review the reading, evidence count, location, capture time, sync time, and field note; then approve it.

## 3:40 — Show engineering ownership

Briefly show:

- the GraphQL schema and REST sync endpoint;
- the Python extractor and its tests;
- the Prisma data model;
- Docker Compose/Caddy; and
- GitHub Actions verification.

Close with: “I started from the open-ended shape of Corvus’s work and made the product, architecture, UX, safety boundaries, mobile behavior, and deployment decisions end to end.”
