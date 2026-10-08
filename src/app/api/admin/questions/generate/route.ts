import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getUserTimezone } from "@/lib/session";
import { hasSameOrigin } from "@/lib/requestOrigin";
import {
  generateQuestions,
  generationOptions,
  GenerationError,
} from "@/lib/questionGeneration";

export const runtime = "nodejs";
export const maxDuration = 200;

// One admin, one Railway replica: prevent double-clicks and parallel tabs
// from running overlapping paid batches. No new persistence infrastructure.
let running = false;
let lastStarted = 0;

export async function POST(req: Request) {
  const { user, response } = await requireAdmin();
  if (response) return response;
  if (!hasSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const options = generationOptions(await req.json().catch(() => null));
    if (!process.env.OPENAI_API_KEY) {
      throw new GenerationError(
        "Question generation needs an OpenAI API key. Add OPENAI_API_KEY to Wrong.'s Railway variables. Manual entry is ready to use.",
        503,
      );
    }
    if (running || Date.now() - lastStarted < 15_000) {
      return NextResponse.json(
        {
          error:
            "A batch is already generating, or just finished. Please wait a moment.",
        },
        { status: 429 },
      );
    }
    running = true;
    lastStarted = Date.now();
    try {
      const recent = await prisma.question.findMany({
        take: 150,
        orderBy: { createdAt: "desc" },
        select: { text: true },
      });
      const drafts = await generateQuestions(
        options,
        recent.map((q) => q.text),
        getUserTimezone(user),
      );
      // Drafts only: creation still goes through the existing admin POST.
      return NextResponse.json(
        { drafts },
        { headers: { "Cache-Control": "no-store" } },
      );
    } finally {
      running = false;
    }
  } catch (error) {
    const known = error instanceof GenerationError;
    return NextResponse.json(
      {
        error: known
          ? error.message
          : "Could not generate questions. No questions were created.",
      },
      { status: known ? error.status : 502 },
    );
  }
}
