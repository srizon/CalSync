import { NextRequest, NextResponse } from "next/server";
import {
  readStore,
  writeStore,
  isStoreConnected,
  type CalendarWatchChannel,
} from "@/lib/store";
import { listAllowedCalendarIds } from "@/lib/accounts";
import {
  calendarPushAvailable,
  registerWatchesForCalendars,
  stopAllWatchChannels,
} from "@/lib/calendar-watch";
import { performFullSyncCoalesced } from "@/lib/run-sync-from-store";

export const runtime = "nodejs";

export async function GET() {
  const s = readStore();
  if (!isStoreConnected(s)) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }
  return NextResponse.json({ syncCalendarIds: s.syncCalendarIds ?? [] });
}

export async function PUT(req: NextRequest) {
  const s = readStore();
  if (!isStoreConnected(s)) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const ids = (body as { syncCalendarIds?: unknown }).syncCalendarIds;
  if (!Array.isArray(ids) || !ids.every((x) => typeof x === "string")) {
    return NextResponse.json({ error: "syncCalendarIds_required" }, { status: 400 });
  }
  const allowed = await listAllowedCalendarIds(s.accounts);
  for (const id of ids) {
    if (!allowed.has(id)) {
      return NextResponse.json(
        { error: "unknown_calendar", calendarId: id },
        { status: 400 }
      );
    }
  }

  await stopAllWatchChannels(s.accounts, s.calendarWatchChannels);

  let calendarWatchChannels: CalendarWatchChannel[] | undefined;
  if (calendarPushAvailable() && ids.length >= 2) {
    const registered = await registerWatchesForCalendars(s.accounts, ids);
    calendarWatchChannels = registered.length ? registered : undefined;
  }

  writeStore({ ...s, syncCalendarIds: ids, calendarWatchChannels });

  void performFullSyncCoalesced();

  return NextResponse.json({
    ok: true,
    syncCalendarIds: ids,
    calendarPush: Boolean(calendarWatchChannels?.length),
  });
}
