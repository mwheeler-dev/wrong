import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { signRoundToken, PER_QUESTION_MS, ROUND_GRACE_MS } from "@/lib/round";

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const questionIds = Array.isArray(body?.questionIds)
    ? (body.questionIds as unknown[]).filter((x): x is string => typeof x === "string")
    : [];

  if (questionIds.length === 0) {
    return NextResponse.json({ error: "questionIds required" }, { status: 400 });
  }

  const { token, startedAt } = await signRoundToken({ userId, questionIds });
  return NextResponse.json({
    roundToken: token,
    startedAt,
    perQuestionMs: PER_QUESTION_MS,
    graceMs: ROUND_GRACE_MS,
  });
}
