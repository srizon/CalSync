import type { SyncResult } from "./sync";
import { runMirrorSync } from "./sync";
import { buildClientMapForCalendars } from "./accounts";
import { readStore, isStoreConnected } from "./store";

let syncInFlight: Promise<SyncResult | null> | null = null;

export async function performFullSync(): Promise<SyncResult | null> {
  const s = readStore();
  if (!isStoreConnected(s)) return null;
  const ids = s.syncCalendarIds ?? [];
  if (ids.length < 2) return null;

  const clientMap = await buildClientMapForCalendars(s.accounts, ids);
  const clientFor = (calendarId: string) => clientMap.get(calendarId);

  const labels: Record<string, string> = {};
  for (const id of ids) {
    const cal = clientFor(id);
    if (!cal) {
      labels[id] = id;
      continue;
    }
    try {
      const meta = await cal.calendars.get({ calendarId: id });
      labels[id] = meta.data.summary || id;
    } catch {
      labels[id] = id;
    }
  }

  return runMirrorSync(clientFor, ids, labels);
}

/** Single-flight: concurrent triggers coalesce to one run. */
export function performFullSyncCoalesced(): Promise<SyncResult | null> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = performFullSync().finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}
