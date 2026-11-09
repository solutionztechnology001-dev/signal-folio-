"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StoreData } from "./types";
import type { OpResult } from "./ops";
import {
  BACKUP_KEY,
  discardLegacyBackup,
  emptyData,
  loadStore,
  saveStore,
} from "./store-core.ts";
import type { LoadStatus, StorageLike } from "./store-core.ts";

export interface Folio {
  data: StoreData;
  status: LoadStatus | "loading";
  readOnly: boolean;
  notice: string | null;
  dismissNotice: () => void;
  rawRecovery: string | null;
  saveError: string | null;
  hasLegacyBackup: boolean;
  run: (fn: (d: StoreData) => OpResult) => OpResult;
  replaceAll: (d: StoreData) => OpResult;
  startFresh: () => void;
  discardBackup: () => void;
  getBackupRaw: () => string | null;
}

export function useFolio(): Folio {
  const [data, setData] = useState<StoreData>(emptyData);
  const [status, setStatus] = useState<LoadStatus | "loading">("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const [rawRecovery, setRawRecovery] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasLegacyBackup, setHasLegacyBackup] = useState<boolean>(false);
  const dataRef = useRef<StoreData>(data);
  const storageRef = useRef<StorageLike | null>(null);

  const readOnly = status === "corrupt" || status === "blocked";

  useEffect(() => {
    let storage: StorageLike | null = null;
    try {
      storage = window.localStorage;
    } catch {
      storage = null;
    }
    if (!storage) {
      setStatus("blocked");
      setNotice("Browser storage is unavailable (private mode or blocked). Nothing can be saved.");
      return;
    }
    storageRef.current = storage;
    const result = loadStore(storage);
    dataRef.current = result.data;
    setData(result.data);
    setStatus(result.status);
    setNotice(result.message);
    setRawRecovery(result.raw);
    try {
      setHasLegacyBackup(storage.getItem(BACKUP_KEY) !== null);
    } catch {
      setHasLegacyBackup(false);
    }
  }, []);

  const commit = useCallback((next: StoreData) => {
    dataRef.current = next;
    setData(next);
    const storage = storageRef.current;
    if (!storage) {
      setSaveError("Browser storage is unavailable, so your changes are NOT saved.");
      return;
    }
    const saved = saveStore(storage, next);
    setSaveError(saved.ok ? null : saved.message);
  }, []);

  const run = useCallback(
    (fn: (d: StoreData) => OpResult): OpResult => {
      if (readOnly || status === "loading") {
        return { ok: false, error: "Saving is turned off because your stored data needs attention (see the message at the top)." };
      }
      const result = fn(dataRef.current);
      if (result.ok) commit(result.data);
      return result;
    },
    [readOnly, status, commit]
  );

  const replaceAll = useCallback(
    (next: StoreData): OpResult => run(() => ({ ok: true, data: next })),
    [run]
  );

  const startFresh = useCallback(() => {
    commit(emptyData());
    setStatus("empty");
    setNotice(null);
    setRawRecovery(null);
  }, [commit]);

  const discardBackup = useCallback(() => {
    const storage = storageRef.current;
    if (storage) discardLegacyBackup(storage);
    setHasLegacyBackup(false);
  }, []);

  const getBackupRaw = useCallback((): string | null => {
    const storage = storageRef.current;
    if (!storage) return null;
    try {
      return storage.getItem(BACKUP_KEY);
    } catch {
      return null;
    }
  }, []);

  const dismissNotice = useCallback(() => setNotice(null), []);

  return {
    data,
    status,
    readOnly,
    notice,
    dismissNotice,
    rawRecovery,
    saveError,
    hasLegacyBackup,
    run,
    replaceAll,
    startFresh,
    discardBackup,
    getBackupRaw,
  };
}
