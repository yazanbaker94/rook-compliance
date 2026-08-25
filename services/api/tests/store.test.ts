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
});
