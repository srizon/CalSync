export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const g = globalThis as typeof globalThis & { __calsyncInstrumentation?: boolean };
  if (g.__calsyncInstrumentation) return;
  g.__calsyncInstrumentation = true;

  const sec = Number(process.env.CALSYNC_AUTO_SYNC_INTERVAL_SEC);
  if (Number.isFinite(sec) && sec >= 30) {
    const { performFullSyncCoalesced } = await import("./lib/run-sync-from-store");
    setInterval(() => {
      void performFullSyncCoalesced();
    }, sec * 1000);
  }

  const hour = 60 * 60 * 1000;
  const { readStore, isStoreConnected, writeStore } = await import("./lib/store");
  const { renewExpiringWatches, calendarPushAvailable } = await import(
    "./lib/calendar-watch"
  );

  setInterval(() => {
    void (async () => {
      if (!calendarPushAvailable()) return;
      const s = readStore();
      if (!isStoreConnected(s)) return;
      const ids = s.syncCalendarIds ?? [];
      if (ids.length < 2) return;
      const next = await renewExpiringWatches(
        s.accounts,
        ids,
        s.calendarWatchChannels
      );
      if (next === null) return;
      writeStore({
        ...s,
        calendarWatchChannels: next.length ? next : undefined,
      });
    })();
  }, hour);
}
