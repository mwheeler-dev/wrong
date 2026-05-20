import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

// One-shot repair endpoint: for every RESOLVED question whose predictions
// still have score IS NULL, compute and apply the score using the actual
// confidence value on the row. Safe to re-run — the IS NULL gate makes it
// idempotent.
//
// Returned: how many predictions were updated, grouped by direction. Use
// this to verify the fix worked without trawling logs.
export async function POST() {
  const { response } = await requireAdmin();
  if (response) return response;

  // Two raw SQL statements:
  //  1. Predictions where the user picked the SAME answer as the question's
  //     correctAnswer → +confidence.
  //  2. The complement → -confidence.
  // Both gated on the joined Question being RESOLVED and the Prediction's
  // score being NULL, so we never touch already-scored or pending rows.
  const correct: number = await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "Prediction" p
      SET "score" = p."confidence", "resolvedAt" = NOW()
      FROM "Question" q
      WHERE p."questionId" = q."id"
        AND q."status" = 'RESOLVED'
        AND q."correctAnswer" IS NOT NULL
        AND p."answer" = q."correctAnswer"
        AND p."score" IS NULL
    `,
  );

  const wrong: number = await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "Prediction" p
      SET "score" = -p."confidence", "resolvedAt" = NOW()
      FROM "Question" q
      WHERE p."questionId" = q."id"
        AND q."status" = 'RESOLVED'
        AND q."correctAnswer" IS NOT NULL
        AND p."answer" <> q."correctAnswer"
        AND p."score" IS NULL
    `,
  );

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/dashboard/resolved");

  return NextResponse.json({
    ok: true,
    updated: { correct, wrong, total: correct + wrong },
  });
}
