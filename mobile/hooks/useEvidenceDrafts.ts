/**
 * hooks/useEvidenceDrafts.ts — Hook for managing offline evidence drafts.
 *
 * Provides:
 *  • Automatic draft loading for the current worker
 *  • Saving current form state as an offline draft
 *  • Individual draft synchronization with progress
 *  • Bulk retry for all failed or pending drafts
 *  • Deletion of drafts
 */

import { useState, useEffect, useCallback } from "react";
import {
  EvidenceDraft,
  listDrafts,
  saveDraft,
  deleteDraft,
  syncDraftWithServer,
} from "../lib/draftStorage";

export function useEvidenceDrafts(workerId?: string) {
  const [drafts, setDrafts] = useState<EvidenceDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<number>(0);

  const refreshDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listDrafts(workerId);
      setDrafts(items);
    } catch (err) {
      console.warn("[useEvidenceDrafts] Failed to load drafts:", err);
    } finally {
      setLoading(false);
    }
  }, [workerId]);

  useEffect(() => {
    refreshDrafts();
  }, [refreshDrafts]);

  const saveAsDraft = async (data: {
    id?: string;
    title: string;
    description?: string;
    evidence_type: string;
    file_uri?: string | null;
    file_name?: string | null;
    mime_type?: string | null;
    file_url?: string | null;
    criterion_id?: string | null;
    qualification_id?: string | null;
  }) => {
    if (!workerId) {
      throw new Error("Worker profile is required to save drafts.");
    }
    const saved = await saveDraft({
      ...data,
      worker_id: workerId,
    });
    await refreshDrafts();
    return saved;
  };

  const removeDraft = async (id: string) => {
    await deleteDraft(id);
    await refreshDrafts();
  };

  const syncSingleDraft = async (id: string) => {
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return { success: false, error: "Draft not found" };

    setSyncingId(id);
    setSyncProgress(0);

    const result = await syncDraftWithServer(draft, (percent) => {
      setSyncProgress(percent);
    });

    setSyncingId(null);
    setSyncProgress(0);
    await refreshDrafts();
    return result;
  };

  const syncAllPending = async () => {
    const pending = drafts.filter(
      (d) => d.sync_status === "draft" || d.sync_status === "failed"
    );
    let succeeded = 0;
    let failed = 0;

    for (const draft of pending) {
      setSyncingId(draft.id);
      const res = await syncDraftWithServer(draft);
      if (res.success) {
        succeeded++;
      } else {
        failed++;
      }
    }

    setSyncingId(null);
    await refreshDrafts();
    return { total: pending.length, succeeded, failed };
  };

  return {
    drafts,
    loading,
    syncingId,
    syncProgress,
    refreshDrafts,
    saveAsDraft,
    removeDraft,
    syncSingleDraft,
    syncAllPending,
  };
}
