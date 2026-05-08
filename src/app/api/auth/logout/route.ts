import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

export async function POST(req: Request) {
  clearSession();
  const url = new URL("/", req.url);
  return NextResponse.redirect(url, { status: 303 });
}
