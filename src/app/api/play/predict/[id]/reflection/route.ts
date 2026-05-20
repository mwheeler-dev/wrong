import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { normalizeReasoning } from "@/lib/reasoning";

// Attach (or replace) a per-prediction reflection — chips + optional text.
//
// Contract:
//   * Body { reasoning: string[], text?: string }
//   * At least one canonical chip token is required.
//   * `text` is optional; whitespace-only is stored as null.
//   * Only the owner of the prediction can write its reflection.
//   * Upsert by predictionId — submitting again replaces the prior entry.
export async function POST(
  req: Request,
  ctx: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const reasoning = normalizeReasoning(body?.reasoning);
  if (!reasoning || reasoning.length === 0) {
    return NextResponse.json(
      { error: "Pick at least one reasoning chip." },
      { status: 400 },
    );
  }

  const rawText = typeof body?.text === "string" ? body.text.trim() : "";
  const text = rawText.length === 0 ? null : rawText.slice(0, 4000);

  const predictionId = ctx.params.id;
  const prediction = await prisma.prediction.findUnique({
    where: { id: predictionId },
    select: { id: true, userId: true },
  });
  if (!prediction) {
    return NextResponse.json({ error: "Prediction not found" }, { status: 404 });
  }
  if (prediction.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.predictionReflection.upsert({
    where: { predictionId },
    // Prisma's Json field accepts a JS value directly; we hand it the
    // normalized token array verbatim.
    create: { predictionId, reasoning, text },
    update: { reasoning, text },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reflections");

  return NextResponse.json({ ok: true });
}
