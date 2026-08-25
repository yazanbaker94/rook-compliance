import type { Facility, FieldSubmission, Obligation, Proposal } from './types.js';

export const facilities: Facility[] = [
  { id: 'fac-north-ridge', name: 'North Ridge Gas Plant', client: 'Summit Energy', location: 'Grande Prairie, AB', readiness: 78, risk: 'HIGH' },
  { id: 'fac-clearwater', name: 'Clearwater Compressor', client: 'Summit Energy', location: 'Fox Creek, AB', readiness: 93, risk: 'LOW' },
  { id: 'fac-red-willow', name: 'Red Willow Terminal', client: 'Prairie Midstream', location: 'Red Deer, AB', readiness: 96, risk: 'LOW' },
];

export const obligations: Obligation[] = [
  { id: 'obl-water-01', facilityId: 'fac-north-ridge', title: 'Monthly wastewater discharge inspection', dueDate: '2026-08-25', frequency: 'Monthly', status: 'IN_PROGRESS', risk: 'HIGH', assignedTo: 'Jordan Lee', evidenceRequired: 'Checklist, discharge reading and site photo' },
  { id: 'obl-fugitive-01', facilityId: 'fac-clearwater', title: 'Q3 fugitive emissions review', dueDate: '2026-08-29', frequency: 'Quarterly', status: 'OPEN', risk: 'MEDIUM', assignedTo: 'Avery Chen', evidenceRequired: 'Survey summary and exception log' },
  { id: 'obl-ghgrp-01', facilityId: 'fac-north-ridge', title: 'Annual GHGRP submission package', dueDate: '2026-09-13', frequency: 'Annual', status: 'OPEN', risk: 'MEDIUM', assignedTo: 'Morgan Reed', evidenceRequired: 'Approved calculations and reviewer sign-off' },
  { id: 'obl-groundwater-01', facilityId: 'fac-red-willow', title: 'Groundwater monitoring review', dueDate: '2026-09-21', frequency: 'Quarterly', status: 'AWAITING_REVIEW', risk: 'LOW', assignedTo: 'Jordan Lee', evidenceRequired: 'Lab certificate and trend commentary' },
];

export const proposals: Proposal[] = [
  { id: 'prop-01', documentId: 'doc-demo-approval', title: 'Inspect wastewater discharge point', requirement: 'Complete an inspection of the wastewater discharge point and record observed conditions.', frequency: 'Monthly', sourcePage: 14, sourceText: 'The approval holder shall inspect the wastewater discharge point at least once during each calendar month.', confidence: 0.97, status: 'PROPOSED' },
  { id: 'prop-02', documentId: 'doc-demo-approval', title: 'Retain laboratory certificates', requirement: 'Keep laboratory certificates and supporting chain-of-custody documentation.', frequency: 'For each sample', sourcePage: 18, sourceText: 'Analytical results and chain-of-custody records must be retained for a minimum of five years.', confidence: 0.94, status: 'PROPOSED' },
  { id: 'prop-03', documentId: 'doc-demo-approval', title: 'Submit annual monitoring report', requirement: 'Prepare and submit the annual monitoring report by March 31.', frequency: 'Annual', sourcePage: 22, sourceText: 'An annual monitoring report for the preceding calendar year shall be submitted no later than March 31.', confidence: 0.99, status: 'PROPOSED' },
];

export const submissions: FieldSubmission[] = [
  { id: 'sub-groundwater-01', obligationId: 'obl-groundwater-01', inspector: 'Jordan Lee', completedAt: '2026-08-24T17:42:00.000Z', notes: 'All wells accessible. MW-03 label is faded and should be replaced. · GPS: 52.26800, -113.81100 · Checklist complete', reading: 'pH 7.4 · 12.6 °C', photoCount: 3, syncState: 'SYNCED', reviewStatus: 'PENDING', reviewNote: '', reviewedAt: null },
];
