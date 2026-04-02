import { NextRequest, NextResponse } from "next/server";
import { performFullSyncCoalesced } from "@/lib/run-sync-from-store";

export const runtime = "nodejs";

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSyncFromNotification() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void performFullSyncCoalesced();
  }, 2500);
}

/**
 * Google Calendar push notifications (events.watch).
 * @see https://developers.google.com/calendar/api/guides/push
 */
export async function POST(req: NextRequest) {
  const expected = process.env.CALSYNC_WEBHOOK_TOKEN?.trim();
  if (expected) {
    const got = req.headers.get("x-goog-channel-token");
    if (got !== expected) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const state = req.headers.get("x-goog-resource-state");
  if (state === "sync" || state === "exists" || state === "not_exists") {
    scheduleSyncFromNotification();
  }

  return new NextResponse(null, { status: 200 });
}
