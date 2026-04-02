import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

export type ConnectedAccount = {
  id: string;
  refreshToken: string;
  email?: string;
};

/** Google Calendar push channel (events.watch); renewed before expiry. */
export type CalendarWatchChannel = {
  calendarId: string;
  channelId: string;
  resourceId: string;
  /** Milliseconds since epoch as string (API `expiration`). */
  expiration: string;
};

export type CalSyncStore = {
  version: 2;
  accounts: ConnectedAccount[];
  /** Calendar IDs in the sync group (each blocks the others). */
  syncCalendarIds: string[];
  calendarWatchChannels?: CalendarWatchChannel[];
};

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function normalizeWatchChannels(raw: unknown): CalendarWatchChannel[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: CalendarWatchChannel[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const calendarId = typeof o.calendarId === "string" ? o.calendarId : "";
    const channelId = typeof o.channelId === "string" ? o.channelId : "";
    const resourceId = typeof o.resourceId === "string" ? o.resourceId : "";
    const expiration = typeof o.expiration === "string" ? o.expiration : "";
    if (calendarId && channelId && resourceId && expiration) {
      out.push({ calendarId, channelId, resourceId, expiration });
    }
  }
  return out.length ? out : undefined;
}

function normalizeParsed(parsed: unknown): CalSyncStore {
  if (
    parsed &&
    typeof parsed === "object" &&
    "version" in parsed &&
    "accounts" in parsed &&
    (parsed as { version: unknown }).version === 2 &&
    Array.isArray((parsed as { accounts: unknown[] }).accounts)
  ) {
    const p = parsed as CalSyncStore;
    return {
      version: 2,
      accounts: p.accounts
        .filter(
          (a): a is ConnectedAccount =>
            Boolean(
              a &&
                typeof a === "object" &&
                typeof (a as ConnectedAccount).id === "string" &&
                typeof (a as ConnectedAccount).refreshToken === "string"
            )
        )
        .map((a) => ({
          id: a.id,
          refreshToken: a.refreshToken,
          email: typeof a.email === "string" ? a.email : undefined,
        })),
      syncCalendarIds: Array.isArray(p.syncCalendarIds)
        ? p.syncCalendarIds.filter((x): x is string => typeof x === "string")
        : [],
      calendarWatchChannels: normalizeWatchChannels(
        (p as { calendarWatchChannels?: unknown }).calendarWatchChannels
      ),
    };
  }

  const old = parsed as {
    refreshToken?: string;
    email?: string;
    syncCalendarIds?: unknown;
  };
  if (old?.refreshToken && typeof old.refreshToken === "string") {
    const ids = Array.isArray(old.syncCalendarIds)
      ? old.syncCalendarIds.filter((x): x is string => typeof x === "string")
      : [];
    return {
      version: 2,
      accounts: [
        {
          id: randomUUID(),
          refreshToken: old.refreshToken,
          email: typeof old.email === "string" ? old.email : undefined,
        },
      ],
      syncCalendarIds: ids,
      calendarWatchChannels: undefined,
    };
  }

  return { version: 2, accounts: [], syncCalendarIds: [] };
}

export function readStore(): CalSyncStore | null {
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return normalizeParsed(parsed);
  } catch {
    return null;
  }
}

export function writeStore(data: CalSyncStore) {
  if (data.accounts.length === 0) {
    clearStore();
    return;
  }
  ensureDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf8");
}

export function updateStore(partial: Partial<CalSyncStore>) {
  const cur =
    readStore() ?? ({ version: 2, accounts: [], syncCalendarIds: [] } satisfies CalSyncStore);
  const next: CalSyncStore = {
    version: 2,
    accounts: partial.accounts ?? cur.accounts,
    syncCalendarIds: partial.syncCalendarIds ?? cur.syncCalendarIds,
    calendarWatchChannels:
      partial.calendarWatchChannels !== undefined
        ? partial.calendarWatchChannels
        : cur.calendarWatchChannels,
  };
  writeStore(next);
}

export function clearStore() {
  try {
    fs.unlinkSync(STORE_FILE);
  } catch {
    /* noop */
  }
}

export function isStoreConnected(s: CalSyncStore | null): s is CalSyncStore {
  return s !== null && s.accounts.length > 0;
}
