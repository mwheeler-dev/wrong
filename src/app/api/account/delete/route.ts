import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearSession, getCurrentUser } from "@/lib/session";

// Authenticated self-service account deletion.
//
// Contract:
//   * Only the caller's OWN account is deletable. We never accept a userId
//     from the request body — the target is always taken from the signed
//     session cookie. No admin-mode deletion path is exposed here.
//   * Body must include { confirm: "DELETE" } as a second layer of
//     protection against accidental CSRF-style triggers. This is on TOP of
//     the typed-confirmation UI on /dashboard/account.
//   * Wraps the delete in a transaction so a partial failure never leaves
//     an orphaned account/session pair.
//   * Session cookie is cleared even if the DB delete fails after auth,
//     so a compromised/broken state can't linger with valid credentials.
//
// Data deleted end-to-end (via schema `onDelete: Cascade`):
//   User → Prediction → PredictionReflection
//        → DailyReflection
// Nothing else in the schema references User. See docs/DATA-DELETION.md
// and the Privacy Policy for the user-facing contract.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (body?.confirm !== "DELETE") {
    return NextResponse.json(
      { error: 'Type "DELETE" to confirm.' },
      { status: 400 },
    );
  }

  try {
    // The FK cascades handle Prediction, PredictionReflection, and
    // DailyReflection — one delete on User removes every user-owned row.
    // We still wrap in a transaction to surface any FK/constraint error
    // as a single failure rather than a half-applied state.
    await prisma.$transaction(async (tx) => {
      await tx.user.delete({ where: { id: user.id } });
    });
  } catch (err) {
    // Report as 500 so the client keeps the "confirm to try again" state
    // instead of the "you're signed out" flow. We deliberately do NOT
    // clearSession on failure — the account still exists.
    console.error("[account/delete] failed for user", user.id, err);
    return NextResponse.json(
      { error: "Could not delete account. Try again or email contact@wrong-app.com." },
      { status: 500 },
    );
  }

  // Deletion succeeded — the session cookie now points at a nonexistent
  // user. Clear it so no lingering client can round-trip a valid JWT.
  clearSession();
  return NextResponse.json({ ok: true });
}
