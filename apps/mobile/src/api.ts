import * as Network from 'expo-network';
import { markSubmissionsSynced } from './storage';
import type { QueuedSubmission } from './types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://swoop.video';

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
