export type Risk = 'LOW' | 'MEDIUM' | 'HIGH';
export type ObligationStatus = 'OPEN' | 'IN_PROGRESS' | 'AWAITING_REVIEW' | 'COMPLETE';
export type ReviewStatus = 'PROPOSED' | 'ACCEPTED' | 'REJECTED';

export interface Facility {
  id: string;
  name: string;
  client: string;
  location: string;
  readiness: number;
  risk: Risk;
}

export interface Obligation {
  id: string;
  facilityId: string;
  title: string;
  dueDate: string;
  frequency: string;
  status: ObligationStatus;
  risk: Risk;
  assignedTo: string;
  evidenceRequired: string;
}

export interface Proposal {
  id: string;
  documentId: string;
  title: string;
  requirement: string;
  frequency: string;
  sourcePage: number;
  sourceText: string;
  confidence: number;
  status: ReviewStatus;
}

export interface FieldSubmission {
  id: string;
  obligationId: string;
  inspector: string;
  completedAt: string;
  notes: string;
  reading: string;
  photoCount: number;
  syncState: 'QUEUED' | 'SYNCED';
}

export interface MobileChange {
  localId: string;
  obligationId: string;
  inspector: string;
  completedAt: string;
  notes: string;
  reading: string;
  photoCount: number;
}
