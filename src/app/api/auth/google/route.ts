import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import {
  OAUTH_INTENT_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE_SEC,
} from "@/lib/constants";
import { getAuthUrl } from "@/lib/google";
import { readStore } from "@/lib/store";

export const runtime = "nodejs";

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: OAUTH_STATE_MAX_AGE_SEC,
  path: "/",
};

export async function GET(req: NextRequest) {
  const addAccount = req.nextUrl.searchParams.get("add") === "1";
  const state = randomBytes(32).toString("hex");
  const jar = await cookies();
  jar.set(OAUTH_STATE_COOKIE, state, cookieOpts);
  if (addAccount) {
    jar.set(OAUTH_INTENT_COOKIE, "add", cookieOpts);
  } else {
    jar.delete(OAUTH_INTENT_COOKIE);
  }

  const existing = readStore();
  const selectAccount = addAccount || (existing?.accounts.length ?? 0) > 0;
  const url = getAuthUrl(state, { selectAccount });
  return NextResponse.redirect(url);
}
