import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserTimezone } from "@/lib/session";
import { hasStartedPlayToday } from "@/lib/play-intro";

// POST only: neither rendering nor prefetching the intro marks it complete.
// This marker controls the introduction only; it never touches round tokens,
// prediction records, daily progress, or question deadlines.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 303, headers: { Location: "/login" } });
  const now = new Date();
  if (!hasStartedPlayToday(user.playIntroStartedAt, getUserTimezone(user), now)) {
    await prisma.user.update({ where: { id: user.id }, data: { playIntroStartedAt: now } });
  }
  return new Response(null, { status: 303, headers: { Location: "/play/round" } });
}
