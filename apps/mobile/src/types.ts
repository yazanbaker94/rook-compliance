export type Assignment = {
  id: string;
  facility: string;
  title: string;
  dueLabel: string;
  evidenceRequired: string;
  risk: 'HIGH' | 'MEDIUM' | 'LOW';
  correctionNote?: string;
  correctionReviewedAt?: string | null;
};

export type SubmissionReviewStatus = 'PENDING' | 'APPROVED' | 'CORRECTION_REQUESTED';

export type LocationPoint = {
  latitude: number;
  longitude: number;
};

export type QueuedSubmission = {
  localId: string;
  obligationId: string;
  inspector: string;
  completedAt: string;
  notes: string;
  reading: string;
  photoUris: string[];
  location: LocationPoint | null;
  checklistComplete: boolean;
  syncState: 'QUEUED' | 'SYNCED';
};
