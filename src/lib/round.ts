import { SignJWT, jwtVerify } from "jose";

const ALG = "HS256";
// 30s timer + 5s network grace per question
export const PER_QUESTION_MS = 30_000;
export const ROUND_GRACE_MS = 5_000;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required");
  return new TextEncoder().encode(secret);
}

export type RoundClaims = {
  uid: string;
  qs: string[];
  iat: number; // seconds since epoch
};

export async function signRoundToken(opts: {
  userId: string;
  questionIds: string[];
}): Promise<{ token: string; startedAt: number }> {
  const now = Math.floor(Date.now() / 1000);
  const totalSeconds = Math.ceil(
    (opts.questionIds.length * PER_QUESTION_MS + ROUND_GRACE_MS) / 1000,
  );
  const token = await new SignJWT({
    uid: opts.userId,
    qs: opts.questionIds,
  })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(now)
    .setExpirationTime(now + totalSeconds + 60)
    .sign(getSecret());
  return { token, startedAt: now * 1000 };
}

export async function verifyRoundToken(token: string): Promise<RoundClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.uid !== "string") return null;
    if (!Array.isArray(payload.qs) || !payload.qs.every((q) => typeof q === "string")) return null;
    if (typeof payload.iat !== "number") return null;
    return { uid: payload.uid, qs: payload.qs as string[], iat: payload.iat };
  } catch {
    return null;
  }
}

// Returns null if within budget; otherwise an error reason.
export function checkRoundDeadline(opts: {
  claims: RoundClaims;
  questionId: string;
  now: number;
}): { ok: true } | { ok: false; reason: string } {
  const index = opts.claims.qs.indexOf(opts.questionId);
  if (index < 0) return { ok: false, reason: "Question not in this round" };
  const startedAtMs = opts.claims.iat * 1000;
  const deadline = startedAtMs + (index + 1) * PER_QUESTION_MS + ROUND_GRACE_MS;
  if (opts.now > deadline) {
    return { ok: false, reason: "Timer expired for this question" };
  }
  return { ok: true };
}
