import { beforeEach, describe, expect, it } from 'vitest';
import { RookStore } from '../src/store.js';

describe('RookStore', () => {
  let store: RookStore;
  beforeEach(() => { store = new RookStore(); });

  it('creates an obligation only when a proposal is accepted', () => {
    const originalCount = store.obligations.length;
    store.reviewProposal('prop-01', 'REJECTED');
    expect(store.obligations).toHaveLength(originalCount);
    store.reviewProposal('prop-02', 'ACCEPTED');
    expect(store.obligations).toHaveLength(originalCount + 1);
    expect(store.obligations.at(-1)?.title).toContain('laboratory');
  });

  it('syncs mobile changes idempotently and advances the obligation', () => {
    const change = { localId: 'mobile-123', obligationId: 'obl-water-01', inspector: 'Jordan Lee', completedAt: '2026-08-25T10:00:00.000Z', notes: 'Inspection complete', reading: 'pH 7.2', photoCount: 2 };
    store.syncMobile([change]);
    store.syncMobile([change]);
    expect(store.submissions.filter(item => item.id === change.localId)).toHaveLength(1);
    expect(store.obligations.find(item => item.id === change.obligationId)?.status).toBe('AWAITING_REVIEW');
  });

  it('reports dashboard totals from current state', () => {
    expect(store.dashboard()).toMatchObject({ openObligations: 4, attentionRequired: 1, averageReadiness: 89, pendingReviews: 3 });
  });

  it('creates a complete obligation record and records an audit event', () => {
    const created = store.createObligation({ facilityId: 'fac-clearwater', title: 'Inspect containment berm', dueDate: '2026-09-15', frequency: 'Quarterly', risk: 'MEDIUM', assignedTo: 'Avery Chen', evidenceRequired: 'Checklist and two photos' });
    expect(created).toMatchObject({ status: 'OPEN', facilityId: 'fac-clearwater' });
    expect(store.listAuditEvents('Obligation', created.id)[0]?.action).toBe('OBLIGATION_CREATED');
  });

  it('persists proposal edits before accepting them', () => {
    store.updateProposal('prop-02', { title: 'Archive laboratory certificates', requirement: 'Keep certificates for five years.', frequency: 'For each sample' });
    store.reviewProposal('prop-02', 'ACCEPTED');
    expect(store.obligations.find(item => item.id === 'obl-prop-02')).toMatchObject({ title: 'Archive laboratory certificates', evidenceRequired: 'Keep certificates for five years.' });
  });

  it('reviews field evidence and advances its obligation', () => {
    const reviewed = store.reviewSubmission('sub-groundwater-01', 'APPROVED', 'Complete and traceable.');
    expect(reviewed).toMatchObject({ reviewStatus: 'APPROVED', reviewNote: 'Complete and traceable.' });
    expect(store.obligations.find(item => item.id === 'obl-groundwater-01')?.status).toBe('COMPLETE');
  });

  it('keeps an imported proposal attached to the selected facility when accepted', () => {
    const document = store.importDocument('fac-clearwater', 'Clearwater_Approval.pdf', [{
      title: 'Inspect compressor drainage', requirement: 'Inspect and record drainage conditions.', frequency: 'Monthly',
      sourcePage: 9, sourceText: 'The approval holder shall inspect compressor drainage monthly.', confidence: 0.95,
    }]);
    const proposal = store.proposals.find(item => item.documentId === document.id)!;
    store.reviewProposal(proposal.id, 'ACCEPTED');
    expect(store.obligations.find(item => item.id === `obl-${proposal.id}`)?.facilityId).toBe('fac-clearwater');
  });
});
