import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "./session";

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  if (!isAdmin(user.email)) {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, response: null };
}
