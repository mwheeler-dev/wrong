import test from "node:test";
import assert from "node:assert/strict";
import {
  validateVerification,
  checkQuestion,
} from "../src/lib/questionVerification";
import { runIndependentChecks } from "../src/lib/independentChecks";

const now = new Date("2026-10-08T18:00:00Z");
const sourceUrl = "https://official.example/result";
const evidence = {
  answer: "YES",
  outcomeIsFinal: true,
  reason: "The official match report confirms the win.",
  sourceUrl,
};

test("AI checks accept sourced final YES/NO and skip unsettled or unverified outcomes", () => {
  const sources = new Set([sourceUrl]);
  for (const answer of ["YES", "NO"])
    assert.equal(
      validateVerification({ ...evidence, answer }, sources, now).answer,
      answer,
    );
  for (const changes of [
    { answer: "UNKNOWN" },
    { outcomeIsFinal: false },
    { sourceUrl: "https://invented.example" },
    { sourceUrl: "javascript:alert(1)" },
    { reason: "" },
    { answer: "MAYBE" },
  ])
    assert.equal(
      validateVerification({ ...evidence, ...changes }, sources, now).answer,
      null,
    );
  assert.equal(validateVerification(null, sources, now).answer, null);
});

test("bulk checks isolate errors, process every item and bound concurrent work", async () => {
  let active = 0,
    maximum = 0;
  const outcomes: {
    id: number;
    outcome: { result: number } | { error: string };
  }[] = [];
  await runIndependentChecks(
    Array.from({ length: 60 }, (_, i) => i),
    async (id) => {
      active++;
      maximum = Math.max(maximum, active);
      await Promise.resolve();
      active--;
      if (id === 2 || id === 25) throw new Error("Unverifiable question");
      return id;
    },
    (id, outcome) => outcomes.push({ id, outcome }),
  );
  assert.equal(outcomes.length, 60);
  assert.equal(outcomes.filter(({ outcome }) => "error" in outcome).length, 2);
  assert.equal(maximum, 2);
  assert.ok(
    outcomes.some(({ id, outcome }) => id === 59 && "result" in outcome),
  );
});

test("stopping bulk work preserves completed results and does not start the remaining questions", async () => {
  let stop = false;
  const completed: number[] = [];
  await runIndependentChecks(
    [1, 2, 3, 4],
    async (id) => id,
    (id) => {
      completed.push(id);
      stop = true;
    },
    () => stop,
    1,
  );
  assert.deepEqual(completed, [1]);
});

test("outcome research uses the saved criteria and fails safely without authoritative evidence", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "fixture-only-key";
  const question = {
    text: "Did Team A win?",
    resolutionCriteria: "Official match report decides.",
    sourceUrl,
    publishDate: now,
    closesToPredictionsAt: now,
    resolutionDate: now,
  };
  let body: Record<string, unknown>;
  globalThis.fetch = async (_url, init) => {
    body = JSON.parse(String(init?.body));
    return Response.json({
      status: "completed",
      output: [
        {
          type: "web_search_call",
          status: "completed",
          action: { sources: [{ url: sourceUrl }] },
        },
        {
          type: "message",
          content: [{ type: "output_text", text: JSON.stringify(evidence) }],
        },
      ],
    });
  };
  try {
    assert.equal(
      (await checkQuestion(question, "America/New_York")).answer,
      "YES",
    );
    assert.equal(body!.store, false);
    assert.equal(body!.tool_choice, "required");
    assert.equal(
      JSON.parse(String(body!.input)).resolutionCriteria,
      question.resolutionCriteria,
    );
    assert.match(
      String(body!.instructions),
      /absence of search results never establishes NO/,
    );
    globalThis.fetch = async () =>
      Response.json({ status: "completed", output: [] });
    await assert.rejects(
      checkQuestion(question, "America/New_York"),
      /research did not finish/,
    );
    globalThis.fetch = async () => Response.json({}, { status: 429 });
    await assert.rejects(
      checkQuestion(question, "America/New_York"),
      /usage or rate limit/,
    );
    delete process.env.OPENAI_API_KEY;
    await assert.rejects(
      checkQuestion(question, "America/New_York"),
      /OPENAI_API_KEY/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});
