import * as SQLite from "expo-sqlite";

let dbInstance: SQLite.SQLiteDatabase | null = null;

/** Native evidence drafts use durable Expo SQLite storage. */
export async function getDraftsDatabase(): Promise<SQLite.SQLiteDatabase | null> {
  if (dbInstance) return dbInstance;
  try {
    dbInstance = SQLite.openDatabaseSync("craftrelay_drafts.db");
    await dbInstance.execAsync(`
      CREATE TABLE IF NOT EXISTS evidence_drafts (
        id TEXT PRIMARY KEY NOT NULL,
        worker_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        evidence_type TEXT NOT NULL,
        file_uri TEXT,
        file_name TEXT,
        mime_type TEXT,
        file_url TEXT,
        criterion_id TEXT,
        qualification_id TEXT,
        sync_status TEXT NOT NULL,
        sync_error TEXT,
        idempotency_key TEXT UNIQUE NOT NULL,
        server_evidence_id TEXT,
        client_updated_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ix_evidence_drafts_worker ON evidence_drafts (worker_id);
      CREATE INDEX IF NOT EXISTS ix_evidence_drafts_status ON evidence_drafts (sync_status);
    `);
    // Recover drafts interrupted by process termination so they can be retried.
    await dbInstance.runAsync(
      "UPDATE evidence_drafts SET sync_status = 'failed', sync_error = 'Sync interrupted. Retry when connected.' WHERE sync_status = 'syncing';"
    );
    return dbInstance;
  } catch {
    dbInstance = null;
    throw new Error("Local draft storage is unavailable on this device.");
  }
}
