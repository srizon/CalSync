import { NextRequest, NextResponse } from "next/server";
import { readStore, writeStore, isStoreConnected } from "@/lib/store";
import {
  calendarPushAvailable,
  renewExpiringWatches,
} from "@/lib/calendar-watch";

export const runtime = "nodejs";

/**
 * Call periodically (e.g. daily) when deployed serverless so push channels
 * renew before Google’s ~7-day expiry. Requires CALSYNC_CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CALSYNC_CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!calendarPushAvailable()) {
    return NextResponse.json({ ok: true, skipped: "no_https_public_url" });
  }

  const s = readStore();
  if (!isStoreConnected(s)) {
    return NextResponse.json({ ok: true, skipped: "not_connected" });
  }

  const ids = s.syncCalendarIds ?? [];
  if (ids.length < 2) {
    return NextResponse.json({ ok: true, skipped: "need_two_calendars" });
  }

  const next = await renewExpiringWatches(
    s.accounts,
    ids,
    s.calendarWatchChannels
  );

  if (next === null) {
    return NextResponse.json({ ok: true, renewed: false });
  }

  writeStore({
    ...s,
    calendarWatchChannels: next.length ? next : undefined,
  });

  return NextResponse.json({ ok: true, renewed: true });
}
