import test from "node:test";
import assert from "node:assert/strict";
import {
  generationOptions,
  validateDrafts,
  generateQuestions,
  GenerationError,
} from "../src/lib/questionGeneration";
import { archiveFilters, ARCHIVE_PAGE_SIZE } from "../src/lib/questionArchive";
import { hasSameOrigin } from "../src/lib/requestOrigin";

test("admin generation accepts Railway's external origin and rejects other sites", () => {
  const request = (headers: Record<string, string>, url = "http://0.0.0.0:8080/api/admin/questions/generate") =>
    new Request(url, { headers });
  assert.equal(hasSameOrigin(request({ origin: "https://www.wrong-app.com", host: "www.wrong-app.com" })), true);
  assert.equal(hasSameOrigin(request({ origin: "https://www.wrong-app.com", host: "0.0.0.0:8080", "x-forwarded-host": "www.wrong-app.com", "x-forwarded-proto": "https" })), true);
  assert.equal(hasSameOrigin(request({ origin: "https://other.example", host: "www.wrong-app.com" })), false);
  assert.equal(hasSameOrigin(request({ origin: "https://www.wrong-app.com.evil.example", "x-forwarded-host": "www.wrong-app.com" })), false);
  assert.equal(hasSameOrigin(request({ origin: "null", host: "www.wrong-app.com" })), false);
  assert.equal(hasSameOrigin(request({ origin: "https://www.wrong-app.com/path", host: "www.wrong-app.com" })), false);
  assert.equal(hasSameOrigin(request({ origin: "http://localhost:3000" }, "http://localhost:3000/api/admin/questions/generate")), true);
  assert.equal(hasSameOrigin(request({ origin: "http://localhost:3001" }, "http://localhost:3000/api/admin/questions/generate")), false);
  assert.equal(hasSameOrigin(request({})), true);
});

const now = new Date("2026-10-08T15:00:00Z");
const draft = {
  text: "Will Team A win the October 10 final?",
  category: "Sports",
  resolutionCriteria:
    "YES if Team A wins the final; otherwise NO. Official match report decides.",
  sourceUrl: "https://official.example/results",
  publishDate: now.toISOString(),
  closesToPredictionsAt: "2026-10-10T10:00:00Z",
  resolutionDate: "2026-10-11T10:00:00Z",
  context: "The final is scheduled for October 10.",
  contextSourceUrl: "https://news.example/final",
};
const sources = new Set([draft.contextSourceUrl]);

test("generation accepts only integer batches from 1 through 20 and known categories", () => {
  for (const count of [1, 20])
    assert.equal(generationOptions({ count }).count, count);
  for (const count of [0, 21, 1.5, "5", null])
    assert.throws(() => generationOptions({ count }), GenerationError);
  assert.throws(() => generationOptions({ count: 1, category: "Invalid" }));
  assert.throws(() => generationOptions({ count: 1, focus: "x".repeat(501) }));
});

test("drafts require full fields, current researched sources and future answer windows", () => {
  assert.equal(
    validateDrafts({ questions: [draft] }, 1, now, [], sources)[0].text,
    draft.text,
  );
  for (const changes of [
    { resolutionCriteria: "" },
    { category: "Unknown" },
    { sourceUrl: "javascript:alert(1)" },
    { contextSourceUrl: "https://invented.example" },
    { publishDate: "2026-10-01T00:00:00Z" },
    { closesToPredictionsAt: now.toISOString() },
    { resolutionDate: "2026-10-09T00:00:00Z" },
  ])
    assert.throws(() =>
      validateDrafts(
        { questions: [{ ...draft, ...changes }] },
        1,
        now,
        [],
        sources,
      ),
    );
  assert.throws(() => validateDrafts({ questions: [] }, 1, now, [], sources));
  assert.throws(() =>
    validateDrafts(
      { questions: [draft] },
      1,
      now,
      [draft.text.toUpperCase()],
      sources,
    ),
  );
  assert.throws(() =>
    validateDrafts({ questions: [draft, draft] }, 2, now, [], sources),
  );
});

test("archive always queries only resolved records with server-side filters", () => {
  const filters = archiveFilters({
    q: "  Final  ",
    category: "Sports",
    answer: "YES",
    from: "2026-10-01",
    to: "2026-10-31",
    page: "400",
  });
  assert.equal(ARCHIVE_PAGE_SIZE, 25);
  assert.equal(filters.page, 400);
  assert.equal(filters.where.status, "RESOLVED");
  assert.equal(filters.where.category, "Sports");
  assert.equal(filters.where.correctAnswer, "YES");
  assert.deepEqual(filters.where.OR, [
    { text: { contains: "Final", mode: "insensitive" } },
    { resolutionCriteria: { contains: "Final", mode: "insensitive" } },
  ]);
  assert.deepEqual(filters.where.resolutionDate, {
    gte: new Date("2026-10-01T00:00:00Z"),
    lt: new Date("2026-11-01T00:00:00Z"),
  });
});

test("malformed archive query values cannot remove the status constraint or break pagination", () => {
  const filters = archiveFilters({
    page: "NaN",
    category: "Other",
    answer: "PENDING",
    from: "2026-02-31",
    to: "garbage",
    q: ["a", "b"],
  });
  assert.deepEqual(filters.where, { status: "RESOLVED" });
  assert.equal(filters.page, 1);
  assert.equal(archiveFilters({ page: "9999999999" }).page, 1_000_000);
});

test("OpenAI call requires live research and returns validated drafts without database writes", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-only-key";
  const currentNow = Date.now();
  const liveDraft = {
    ...draft,
    publishDate: new Date(currentNow).toISOString(),
    closesToPredictionsAt: new Date(currentNow + 86_400_000).toISOString(),
    resolutionDate: new Date(currentNow + 172_800_000).toISOString(),
  };
  let payload: Record<string, unknown>;
  globalThis.fetch = async (_url, init) => {
    payload = JSON.parse(String(init?.body));
    return Response.json({
      status: "completed",
      output: [
        {
          type: "web_search_call",
          status: "completed",
          action: { sources: [{ url: draft.contextSourceUrl }] },
        },
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify({ questions: [liveDraft] }),
            },
          ],
        },
      ],
    });
  };
  try {
    const result = await generateQuestions(
      generationOptions({ count: 1 }),
      [],
      "America/New_York",
    );
    assert.equal(result.length, 1);
    assert.equal(payload!.store, false);
    assert.equal(payload!.tool_choice, "required");
    assert.deepEqual(payload!.tools, [{ type: "web_search" }]);
    globalThis.fetch = async () =>
      Response.json({
        status: "completed",
        output: [
          { type: "message", content: [{ type: "output_text", text: "{}" }] },
        ],
      });
    await assert.rejects(
      generateQuestions(
        generationOptions({ count: 1 }),
        [],
        "America/New_York",
      ),
      /current-events research/,
    );
    globalThis.fetch = async () => Response.json({}, { status: 429 });
    await assert.rejects(
      generateQuestions(
        generationOptions({ count: 1 }),
        [],
        "America/New_York",
      ),
      /usage or rate limit/,
    );
    delete process.env.OPENAI_API_KEY;
    await assert.rejects(
      generateQuestions(
        generationOptions({ count: 1 }),
        [],
        "America/New_York",
      ),
      /API key/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});
