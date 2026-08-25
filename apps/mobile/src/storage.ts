import * as SQLite from 'expo-sqlite';
import type { Assignment, QueuedSubmission } from './types';

const assignments: Assignment[] = [
  { id: 'obl-water-01', facility: 'North Ridge Gas Plant', title: 'Monthly wastewater discharge inspection', dueLabel: 'Due today', evidenceRequired: 'Checklist, discharge reading and site photo', risk: 'HIGH' },
  { id: 'obl-fugitive-01', facility: 'Clearwater Compressor', title: 'Q3 fugitive emissions review', dueLabel: 'Due in 4 days', evidenceRequired: 'Survey summary and exception log', risk: 'MEDIUM' },
];

let database: Promise<SQLite.SQLiteDatabase> | undefined;

function db() {
  database ??= SQLite.openDatabaseAsync('rook-field.db');
  return database;
}

export async function initializeDatabase() {
  const connection = await db();
  await connection.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY NOT NULL,
      facility TEXT NOT NULL,
      title TEXT NOT NULL,
      due_label TEXT NOT NULL,
      evidence_required TEXT NOT NULL,
      risk TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS submissions (
      local_id TEXT PRIMARY KEY NOT NULL,
      obligation_id TEXT NOT NULL,
      inspector TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      notes TEXT NOT NULL,
      reading TEXT NOT NULL,
      photo_uris TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      checklist_complete INTEGER NOT NULL,
      sync_state TEXT NOT NULL
    );
  `);
  for (const item of assignments) {
    await connection.runAsync(
      'INSERT OR IGNORE INTO assignments (id, facility, title, due_label, evidence_required, risk) VALUES (?, ?, ?, ?, ?, ?)',
      item.id, item.facility, item.title, item.dueLabel, item.evidenceRequired, item.risk,
    );
  }
}

export async function listAssignments(): Promise<Assignment[]> {
  const connection = await db();
  const rows = await connection.getAllAsync<Record<string, string>>('SELECT * FROM assignments ORDER BY due_label');
  return rows.map((row) => ({
    id: row.id,
    facility: row.facility,
    title: row.title,
    dueLabel: row.due_label,
    evidenceRequired: row.evidence_required,
    risk: row.risk as Assignment['risk'],
  }));
}

export async function saveSubmission(input: Omit<QueuedSubmission, 'syncState'>) {
  const connection = await db();
  await connection.runAsync(
    `INSERT OR REPLACE INTO submissions
      (local_id, obligation_id, inspector, completed_at, notes, reading, photo_uris, latitude, longitude, checklist_complete, sync_state)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED')`,
    input.localId,
    input.obligationId,
    input.inspector,
    input.completedAt,
    input.notes,
    input.reading,
    JSON.stringify(input.photoUris),
    input.location?.latitude ?? null,
    input.location?.longitude ?? null,
    input.checklistComplete ? 1 : 0,
  );
}

export async function listSubmissions(): Promise<QueuedSubmission[]> {
  const connection = await db();
  const rows = await connection.getAllAsync<Record<string, string | number | null>>('SELECT * FROM submissions ORDER BY completed_at DESC');
  return rows.map((row) => ({
    localId: String(row.local_id),
    obligationId: String(row.obligation_id),
    inspector: String(row.inspector),
    completedAt: String(row.completed_at),
    notes: String(row.notes),
    reading: String(row.reading),
    photoUris: JSON.parse(String(row.photo_uris)) as string[],
    location: row.latitude == null || row.longitude == null ? null : { latitude: Number(row.latitude), longitude: Number(row.longitude) },
    checklistComplete: Number(row.checklist_complete) === 1,
    syncState: String(row.sync_state) as QueuedSubmission['syncState'],
  }));
}

export async function markSubmissionsSynced(localIds: string[]) {
  const connection = await db();
  for (const localId of localIds) {
    await connection.runAsync("UPDATE submissions SET sync_state = 'SYNCED' WHERE local_id = ?", localId);
  }
}
