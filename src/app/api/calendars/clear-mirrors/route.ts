import { NextRequest, NextResponse } from "next/server";
import { readStore, isStoreConnected } from "@/lib/store";
import {
  listAllowedCalendarIds,
  resolveClientForCalendar,
} from "@/lib/accounts";
import { clearMirrorsOnCalendar } from "@/lib/sync";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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

  const calendarId = String(
    (body as { calendarId?: unknown }).calendarId ?? ""
  ).trim();
  if (!calendarId) {
    return NextResponse.json({ error: "calendarId_required" }, { status: 400 });
  }

  const allowed = await listAllowedCalendarIds(s.accounts);
  if (!allowed.has(calendarId)) {
    return NextResponse.json(
      { error: "unknown_calendar", message: "Calendar not in your linked accounts." },
      { status: 404 }
    );
  }

  const client = await resolveClientForCalendar(s.accounts, calendarId);
  if (!client) {
    return NextResponse.json(
      { error: "no_client", message: "No Google client could access this calendar." },
      { status: 400 }
    );
  }

  const { deleted, errors } = await clearMirrorsOnCalendar(client, calendarId);
  return NextResponse.json({ deleted, errors });
}
