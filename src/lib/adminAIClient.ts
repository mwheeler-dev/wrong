import type { VerificationResult } from "./questionVerification";

export async function requestQuestionCheck(
  id: string,
): Promise<VerificationResult> {
  const res = await fetch(
    `/api/admin/questions/${encodeURIComponent(id)}/check`,
    { method: "POST" },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data.error || "This question could not be verified.");
  if (!data.result || !["YES", "NO", null].includes(data.result.answer))
    throw new Error("The AI check was unreadable.");
  return data.result;
}

export async function approveQuestionCheck(
  id: string,
  result: VerificationResult,
) {
  if (!result.answer || !result.questionVersion)
    throw new Error("Check this question again before approving.");
  const res = await fetch(
    `/api/admin/questions/${encodeURIComponent(id)}/resolve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        correctAnswer: result.answer,
        expectedUpdatedAt: result.questionVersion,
      }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data.error || "Could not resolve this question.");
}
