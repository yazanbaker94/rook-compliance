import { randomUUID } from 'node:crypto';
import { facilities as seededFacilities, obligations as seededObligations, proposals as seededProposals, submissions as seededSubmissions } from './seed.js';
import type { MobileChange, Obligation, Proposal } from './types.js';

export class RookStore {
  facilities = structuredClone(seededFacilities);
  obligations = structuredClone(seededObligations);
  proposals = structuredClone(seededProposals);
  submissions = structuredClone(seededSubmissions);

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
      const obligation: Obligation = {
        id: `obl-${proposal.id}`,
        facilityId: 'fac-north-ridge',
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
    return proposal;
  }

  syncMobile(changes: MobileChange[]) {
    const acceptedIds: string[] = [];
    for (const change of changes) {
      if (this.submissions.some(item => item.id === change.localId)) {
        acceptedIds.push(change.localId);
        continue;
      }
      if (!this.obligations.some(item => item.id === change.obligationId)) throw new Error(`Unknown obligation ${change.obligationId}`);
      this.submissions.push({ id: change.localId || randomUUID(), obligationId: change.obligationId, inspector: change.inspector, completedAt: change.completedAt, notes: change.notes, reading: change.reading, photoCount: change.photoCount, syncState: 'SYNCED' });
      const obligation = this.obligations.find(item => item.id === change.obligationId);
      if (obligation) obligation.status = 'AWAITING_REVIEW';
      acceptedIds.push(change.localId);
    }
    return { acceptedIds, serverTime: new Date().toISOString() };
  }
}

export const store = new RookStore();
