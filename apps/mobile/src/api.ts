import * as Network from 'expo-network';
import { markSubmissionsSynced } from './storage';
import type { Assignment, QueuedSubmission, SubmissionReviewStatus } from './types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://swoop.video/corvus';

type MobileBootstrap = {
  facilities: { id: string; name: string }[];
  obligations: {
    id: string;
    facilityId: string;
    title: string;
    dueDate: string;
    frequency: string;
    risk: Assignment['risk'];
    evidenceRequired: string;
  }[];
  submissions: {
    id: string;
    obligationId: string;
    completedAt: string;
    reviewStatus: SubmissionReviewStatus;
    reviewNote: string;
    reviewedAt: string | null;
  }[];
};

export async function fetchCorrectionAssignments(): Promise<Assignment[]> {
  const response = await fetch(`${API_URL}/api/mobile/bootstrap`);
  if (!response.ok) throw new Error(`Workspace refresh failed with status ${response.status}`);
  const workspace = await response.json() as MobileBootstrap;
  const facilities = new Map(workspace.facilities.map((item) => [item.id, item]));
  const obligations = new Map(workspace.obligations.map((item) => [item.id, item]));
  const latestByObligation = new Map<string, MobileBootstrap['submissions'][number]>();

  for (const submission of workspace.submissions) {
    const current = latestByObligation.get(submission.obligationId);
    if (!current || new Date(submission.completedAt).getTime() > new Date(current.completedAt).getTime()) {
      latestByObligation.set(submission.obligationId, submission);
    }
  }

  return [...latestByObligation.values()].flatMap((submission) => {
    if (submission.reviewStatus !== 'CORRECTION_REQUESTED') return [];
    const obligation = obligations.get(submission.obligationId);
    if (!obligation) return [];
    const facility = facilities.get(obligation.facilityId);
    return [{
      id: obligation.id,
      facility: facility?.name ?? 'Assigned facility',
      title: obligation.title,
      dueLabel: 'Correction requested',
      evidenceRequired: obligation.evidenceRequired,
      risk: obligation.risk,
      correctionNote: submission.reviewNote || 'Review the consultant feedback and submit corrected evidence.',
      correctionReviewedAt: submission.reviewedAt,
    }];
  });
}

export async function syncQueuedSubmissions(submissions: QueuedSubmission[]) {
  const queued = submissions.filter((submission) => submission.syncState === 'QUEUED');
  if (!queued.length) return { synced: 0, reason: 'empty' as const };

  const network = await Network.getNetworkStateAsync();
  if (!network.isConnected || network.isInternetReachable === false) {
    return { synced: 0, reason: 'offline' as const };
  }

  const response = await fetch(`${API_URL}/api/mobile/sync`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      deviceId: 'rook-field-demo',
      changes: queued.map((item) => ({
        localId: item.localId,
        obligationId: item.obligationId,
        inspector: item.inspector,
        completedAt: item.completedAt,
        notes: [
          item.notes,
          item.location ? `GPS: ${item.location.latitude.toFixed(5)}, ${item.location.longitude.toFixed(5)}` : '',
          item.checklistComplete ? 'Checklist complete' : '',
        ].filter(Boolean).join(' · '),
        reading: item.reading,
        photoCount: item.photoUris.length,
      })),
    }),
  });

  if (!response.ok) throw new Error(`Sync failed with status ${response.status}`);
  await markSubmissionsSynced(queued.map((item) => item.localId));
  return { synced: queued.length, reason: 'success' as const };
}
