import { randomUUID } from 'node:crypto';
import { auditEvents as seededAuditEvents, facilities as seededFacilities, obligations as seededObligations, proposals as seededProposals, submissions as seededSubmissions } from './seed.js';
import type { AuditEventRecord, CreateObligationInput, DocumentRecord, ImportedProposalInput, MobileChange, Obligation, ObligationStatus, Proposal, SubmissionReviewStatus } from './types.js';

export class RookStore {
  facilities = structuredClone(seededFacilities);
  obligations = structuredClone(seededObligations);
  proposals = structuredClone(seededProposals);
  submissions = structuredClone(seededSubmissions);
  documents: DocumentRecord[] = [{ id: 'doc-demo-approval', facilityId: 'fac-north-ridge', name: 'North_Ridge_Approval.pdf', createdAt: '2026-08-25T08:00:00.000Z' }];
  auditEvents: AuditEventRecord[] = structuredClone(seededAuditEvents);

  async initialize() {}

  listFacilities() {
    return this.facilities;
  }

  listObligations(facilityId?: string) {
    return facilityId ? this.obligations.filter(item => item.facilityId === facilityId) : this.obligations;
  }

  listProposals(documentId?: string) {
    return documentId ? this.proposals.filter(item => item.documentId === documentId) : this.proposals;
  }

  listSubmissions() {
    return this.submissions;
  }

  listDocuments() {
    return this.documents;
  }

  listAuditEvents(entityType?: string, entityId?: string) {
    return this.auditEvents.filter(item => (!entityType || item.entityType === entityType) && (!entityId || item.entityId === entityId)).slice().reverse();
  }

  dashboard() {
    const open = this.obligations.filter(item => item.status !== 'COMPLETE').length;
    const attention = this.obligations.filter(item => item.risk === 'HIGH' && item.status !== 'COMPLETE').length;
    const averageReadiness = Math.round(this.facilities.reduce((sum, item) => sum + item.readiness, 0) / this.facilities.length);
    return { openObligations: open, attentionRequired: attention, averageReadiness, pendingReviews: this.proposals.filter(item => item.status === 'PROPOSED').length, fieldSubmissions: this.submissions.length };
  }

  reviewProposal(id: string, status: 'ACCEPTED' | 'REJECTED'): Proposal {
    const proposal = this.proposals.find(item => item.id === id);
    if (!proposal) throw new Error(`Proposal ${id} was not found`);
    proposal.status = status;
    if (status === 'ACCEPTED' && !this.obligations.some(item => item.id === `obl-${proposal.id}`)) {
      const facilityId = this.documents.find(item => item.id === proposal.documentId)?.facilityId ?? 'fac-north-ridge';
      const obligation: Obligation = {
        id: `obl-${proposal.id}`,
        facilityId,
        title: proposal.title,
        dueDate: '2026-09-30',
        frequency: proposal.frequency,
        status: 'OPEN',
        risk: 'MEDIUM',
        assignedTo: 'Unassigned',
        evidenceRequired: proposal.requirement,
      };
      this.obligations.push(obligation);
    }
    if (status === 'REJECTED') this.obligations = this.obligations.filter(item => item.id !== `obl-${proposal.id}`);
    this.recordAudit('demo-consultant', `PROPOSAL_${status}`, 'Proposal', id, { sourcePage: proposal.sourcePage });
    return proposal;
  }

  updateProposal(id: string, input: { title: string; requirement: string; frequency: string }) {
    const proposal = this.proposals.find(item => item.id === id);
    if (!proposal) throw new Error(`Proposal ${id} was not found`);
    Object.assign(proposal, input);
    this.recordAudit('demo-consultant', 'PROPOSAL_EDITED', 'Proposal', id, input);
    return proposal;
  }

  importDocument(facilityId: string, name: string, imported: ImportedProposalInput[]) {
    if (!this.facilities.some(item => item.id === facilityId)) throw new Error(`Facility ${facilityId} was not found`);
    const documentId = `doc-${randomUUID()}`;
    const document = { id: documentId, facilityId, name, createdAt: new Date().toISOString() };
    this.documents.push(document);
    for (const item of imported) this.proposals.push({ id: `prop-${randomUUID()}`, documentId, ...item, status: 'PROPOSED' });
    this.recordAudit('demo-consultant', 'DOCUMENT_IMPORTED', 'Document', documentId, { name, proposalCount: imported.length });
    return document;
  }

  createObligation(input: CreateObligationInput) {
    if (!this.facilities.some(item => item.id === input.facilityId)) throw new Error(`Facility ${input.facilityId} was not found`);
    const obligation: Obligation = { id: `obl-${randomUUID()}`, status: 'OPEN', ...input };
    this.obligations.push(obligation);
    this.recordAudit('demo-consultant', 'OBLIGATION_CREATED', 'Obligation', obligation.id, { title: obligation.title });
    return obligation;
  }

  updateObligationStatus(id: string, status: ObligationStatus) {
    const obligation = this.obligations.find(item => item.id === id);
    if (!obligation) throw new Error(`Obligation ${id} was not found`);
    obligation.status = status;
    this.recordAudit('demo-consultant', 'OBLIGATION_STATUS_CHANGED', 'Obligation', id, { status });
    return obligation;
  }

  reviewSubmission(id: string, status: SubmissionReviewStatus, note: string) {
    const submission = this.submissions.find(item => item.id === id);
    if (!submission) throw new Error(`Submission ${id} was not found`);
    submission.reviewStatus = status;
    submission.reviewNote = note;
    submission.reviewedAt = new Date().toISOString();
    const obligation = this.obligations.find(item => item.id === submission.obligationId);
    if (obligation) obligation.status = status === 'APPROVED' ? 'COMPLETE' : 'IN_PROGRESS';
    this.recordAudit('demo-consultant', `FIELD_${status}`, 'FieldSubmission', id, { note });
    return submission;
  }

  syncMobile(changes: MobileChange[]) {
    const acceptedIds: string[] = [];
    for (const change of changes) {
      if (this.submissions.some(item => item.id === change.localId)) {
        acceptedIds.push(change.localId);
        continue;
      }
      if (!this.obligations.some(item => item.id === change.obligationId)) throw new Error(`Unknown obligation ${change.obligationId}`);
      this.submissions.push({ id: change.localId || randomUUID(), obligationId: change.obligationId, inspector: change.inspector, completedAt: change.completedAt, notes: change.notes, reading: change.reading, photoCount: change.photoCount, syncState: 'SYNCED', reviewStatus: 'PENDING', reviewNote: '', reviewedAt: null });
      const obligation = this.obligations.find(item => item.id === change.obligationId);
      if (obligation) obligation.status = 'AWAITING_REVIEW';
      acceptedIds.push(change.localId);
    }
    return { acceptedIds, serverTime: new Date().toISOString() };
  }

  private recordAudit(actorId: string, action: string, entityType: string, entityId: string, detail: Record<string, unknown>) {
    this.auditEvents.push({ id: `audit-${randomUUID()}`, actorId, action, entityType, entityId, detail: JSON.stringify(detail), createdAt: new Date().toISOString() });
  }
}

export const store = new RookStore();
