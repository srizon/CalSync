import { NextResponse } from "next/server";
import { readStore, isStoreConnected } from "@/lib/store";
import { performFullSync } from "@/lib/run-sync-from-store";

export const runtime = "nodejs";

export async function POST() {
  const s = readStore();
  if (!isStoreConnected(s)) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }
  const ids = s.syncCalendarIds ?? [];
  if (ids.length < 2) {
    return NextResponse.json(
      { error: "need_two_calendars", message: "Select at least two calendars." },
      { status: 400 }
    );
  }

  const result = await performFullSync();
  if (!result) {
    return NextResponse.json(
      { error: "sync_failed", message: "Could not run sync." },
      { status: 500 }
    );
  }
  return NextResponse.json(result);
}
