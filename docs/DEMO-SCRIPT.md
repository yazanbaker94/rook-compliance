# Four-minute walkthrough

## 0:00 — Frame the problem

“Environmental consulting turns dense approvals into recurring operational work. I built Rook to carry one requirement all the way from the source document to reviewed field evidence.”

Mention that every record is synthetic and that AI output cannot become a compliance obligation without a person.

## 0:30 — Show portfolio awareness

Open the web overview. Point to readiness, open work, pending evidence, and North Ridge’s explainable attention state. Open Facilities to show the site-level readiness cards.

Say: “The score is a navigation aid, not an unexplained AI verdict.”

## 1:05 — Review an approval

Choose **Import approval** and upload `output/pdf/corvus-synthetic-operating-approval.pdf`. Show that three clauses were found on physical pages 14, 18, and 22. Edit the operational wording, then accept one proposal.

Open **Obligations**. Search for the accepted item, open its source-linked detail, and move it from Open to In progress.

Say: “Automation saves reading and transcription time, while the consultant retains authorship and accountability.”

## 2:05 — Complete the work on Android

Open Rook Field. Turn on airplane mode if practical. Open the wastewater inspection, complete its checklist, enter a result, capture a photo/GPS point, and save.

Open the sync queue. Emphasize that the record is in SQLite and survives an app restart. Restore connectivity and sync.

Say: “Sync is idempotent, so repeated retries cannot duplicate the inspection.”

## 3:10 — Close the loop

Return to **Field evidence** in the web console. Review the reading, evidence count, location, capture time, sync timeline, and field note. Demonstrate a correction note, then approve the evidence and show the completed obligation plus review history.

## 3:40 — Show engineering ownership

Briefly show:

- the GraphQL schema and REST sync endpoint;
- the Python extractor and its tests;
- the Prisma data model;
- Docker Compose/Caddy; and
- GitHub Actions verification.

Close with: “I started from the open-ended shape of Corvus’s work and made the product, architecture, UX, safety boundaries, mobile behavior, and deployment decisions end to end.”
