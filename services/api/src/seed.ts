import type { AuditEventRecord, Facility, FieldSubmission, Obligation, Proposal } from './types.js';

export const facilities: Facility[] = [
  { id: 'fac-north-ridge', name: 'North Ridge Gas Plant', client: 'Summit Energy', location: 'Grande Prairie, AB', readiness: 78, risk: 'HIGH' },
  { id: 'fac-clearwater', name: 'Clearwater Compressor', client: 'Summit Energy', location: 'Fox Creek, AB', readiness: 93, risk: 'LOW' },
  { id: 'fac-red-willow', name: 'Red Willow Terminal', client: 'Prairie Midstream', location: 'Red Deer, AB', readiness: 96, risk: 'LOW' },
];

export const obligations: Obligation[] = [
  { id: 'obl-water-01', facilityId: 'fac-north-ridge', title: 'Monthly wastewater discharge inspection', dueDate: '2026-08-25', frequency: 'Monthly', status: 'IN_PROGRESS', risk: 'HIGH', assignedTo: 'Jordan Lee', evidenceRequired: 'Checklist, discharge reading and site photo' },
  { id: 'obl-fugitive-01', facilityId: 'fac-clearwater', title: 'Q3 fugitive emissions review', dueDate: '2026-08-29', frequency: 'Quarterly', status: 'COMPLETE', risk: 'MEDIUM', assignedTo: 'Avery Chen', evidenceRequired: 'Survey summary and exception log' },
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
  { id: 'sub-water-2026-08', obligationId: 'obl-water-01', inspector: 'Jordan Lee', completedAt: '2026-08-25T13:15:00.000Z', notes: 'Discharge point accessible. Flow was stable with no visible sheen or odour. · GPS: 55.17020, -118.79410 · Monthly checklist complete', reading: 'pH 7.1 · Clear · No sheen', photoCount: 0, syncState: 'SYNCED', reviewStatus: 'APPROVED', reviewNote: 'Checklist and discharge reading verified against the monthly permit condition.', reviewedAt: '2026-08-25T14:05:00.000Z' },
  { id: 'sub-fugitive-q3-2026', obligationId: 'obl-fugitive-01', inspector: 'Avery Chen', completedAt: '2026-08-23T16:28:00.000Z', notes: 'Q3 LDAR survey completed across compressor, valves, and connectors. No components exceeded the action threshold. · GPS: 54.39280, -116.80640 · Exception log attached', reading: '426 components · 0 exceedances', photoCount: 0, syncState: 'SYNCED', reviewStatus: 'APPROVED', reviewNote: 'Survey coverage and exception log reviewed; no corrective work is outstanding.', reviewedAt: '2026-08-24T09:20:00.000Z' },
];

export const auditEvents: AuditEventRecord[] = [
  { id: 'audit-seed-water-synced', actorId: 'rook-field', action: 'FIELD_SYNCED', entityType: 'FieldSubmission', entityId: 'sub-water-2026-08', detail: JSON.stringify({ note: 'Monthly discharge checklist and meter reading synced from Rook Field.' }), createdAt: '2026-08-25T13:17:00.000Z' },
  { id: 'audit-seed-water-approved', actorId: 'Yazan Baker', action: 'FIELD_APPROVED', entityType: 'FieldSubmission', entityId: 'sub-water-2026-08', detail: JSON.stringify({ note: 'Evidence matched the permit condition and was approved for the August cycle.' }), createdAt: '2026-08-25T14:05:00.000Z' },
  { id: 'audit-seed-water-cycle', actorId: 'rook-scheduler', action: 'NEXT_CYCLE_OPENED', entityType: 'Obligation', entityId: 'obl-water-01', detail: JSON.stringify({ note: 'September inspection cycle opened after the August evidence package was accepted.' }), createdAt: '2026-08-25T14:06:00.000Z' },
  { id: 'audit-seed-fugitive-synced', actorId: 'rook-field', action: 'FIELD_SYNCED', entityType: 'FieldSubmission', entityId: 'sub-fugitive-q3-2026', detail: JSON.stringify({ note: 'Q3 LDAR survey summary and exception log synced from the field tablet.' }), createdAt: '2026-08-23T16:31:00.000Z' },
  { id: 'audit-seed-fugitive-approved', actorId: 'Yazan Baker', action: 'FIELD_APPROVED', entityType: 'FieldSubmission', entityId: 'sub-fugitive-q3-2026', detail: JSON.stringify({ note: 'Coverage confirmed for 426 components; no exceedances or follow-up repairs were identified.' }), createdAt: '2026-08-24T09:20:00.000Z' },
  { id: 'audit-seed-fugitive-complete', actorId: 'Yazan Baker', action: 'OBLIGATION_COMPLETED', entityType: 'Obligation', entityId: 'obl-fugitive-01', detail: JSON.stringify({ note: 'Q3 fugitive-emissions review closed with an approved survey package.' }), createdAt: '2026-08-24T09:22:00.000Z' },
  { id: 'audit-seed-ghgrp-uploaded', actorId: 'Morgan Reed', action: 'DOCUMENT_PACKAGE_UPLOADED', entityType: 'Obligation', entityId: 'obl-ghgrp-01', detail: JSON.stringify({ note: 'Draft emissions workbook, methodology memo, and source-data index uploaded for review.' }), createdAt: '2026-08-22T11:40:00.000Z' },
  { id: 'audit-seed-ghgrp-assigned', actorId: 'Yazan Baker', action: 'REVIEW_ASSIGNED', entityType: 'Obligation', entityId: 'obl-ghgrp-01', detail: JSON.stringify({ note: 'Technical review assigned to Morgan Reed; reviewer sign-off remains outstanding.' }), createdAt: '2026-08-22T12:05:00.000Z' },
];
