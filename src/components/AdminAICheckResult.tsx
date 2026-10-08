"use client";

import type { VerificationResult } from "@/lib/questionVerification";

export function AdminAICheckResult({ result }: { result: VerificationResult }) {
  return (
    <div className="mt-3 rounded-xl border border-line bg-paper/40 p-3 text-sm">
      <p role="status" className="font-semibold">
        {result.answer
          ? `AI check: ${result.answer}`
          : "Skipped — not verified"}
      </p>
      <details className="mt-1 text-muted">
        <summary className="cursor-pointer underline">Review evidence</summary>
        <p className="mt-2">{result.reason}</p>
        {result.sourceUrl && (
          <a
            className="mt-2 inline-block break-all underline"
            href={result.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Source ↗
          </a>
        )}
        <p className="mt-2 text-xs">
          Checked {new Date(result.checkedAt).toLocaleString()}
        </p>
      </details>
    </div>
  );
}
