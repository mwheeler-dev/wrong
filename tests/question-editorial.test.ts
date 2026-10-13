import test from "node:test";
import assert from "node:assert/strict";
import { draftWordingIssue } from "../src/lib/questionEditorial";
import { diversityIssue, researchPlan, saturatedSubjects } from "../src/lib/questionDiversity";
import { generateQuestions, generationOptions } from "../src/lib/questionGeneration";

test("the reported specialist cards fail while a direct vaccine rollout question passes", () => {
  assert.equal(draftWordingIssue("Will a new COVID-19 vaccine roll out in the US by Jan 31?"), null);
  assert.ok(draftWordingIssue("Will Novavax publicly report topline Phase 3 results for its influenza-COVID-19 combination vaccine candidate before January 31, 2027?"));
  assert.ok(draftWordingIssue("Will the ITU Plenipotentiary Conference in Doha publicly elect all five top officials and the 12 Radio Regulations Board members by November 27, 2026?"));
  assert.ok(draftWordingIssue("Will Novavax report Phase 3 results by Jan 31?", "health news"));
  assert.equal(draftWordingIssue("Will Novavax report Phase 3 results by Jan 31?", "Novavax Phase 3 trial results"), null);
});

test("artist, album and tour labels cannot hide repeated Taylor Swift stories", () => {
  const plan = researchPlan(2, 2, 0, "Entertainment", "seed", [], []);
  const first = { text: "Will Taylor Swift release an album by Nov 1?", category: "Entertainment", subjectKey: "new album release", storyKey: "album", researchSlot: "slot-0" };
  const second = { text: "Will Taylor Swift announce a tour by Nov 5?", category: "Entertainment", subjectKey: "tour announcement", storyKey: "tour", researchSlot: "slot-1" };
  assert.match(diversityIssue(second, plan, [], [], [first], "music")!, /repeated/);
  assert.equal(diversityIssue(second, plan, [], [], [first], "Taylor Swift news"), null);
  const other = { ...second, text: "Will Dua Lipa announce a tour by Nov 5?", subjectKey: "Dua Lipa" };
  assert.equal(diversityIssue(other, plan, [], [], [first], "music"), null);
});

test("the repetition check catches other artists and does not treat shared dates as subjects", () => {
  const plan = researchPlan(2, 2, 0, "Entertainment", "seed", [], []);
  const first = { text: "Will Drake release an album by Jan 31?", category: "Entertainment", subjectKey: "first album", storyKey: "drake-album", researchSlot: "slot-0" };
  const second = { ...first, text: "Will Drake announce a tour by Jan 31?", subjectKey: "new tour", storyKey: "drake-tour", researchSlot: "slot-1" };
  assert.match(diversityIssue(second, plan, [], [], [first], "")!, /repeated/);
  assert.match(diversityIssue({ ...second, text: "Will Drake’s album reach No. 1 by Jan 31?" }, plan, [], [], [first], "")!, /repeated/);
  assert.equal(diversityIssue({ ...second, text: "Will SZA announce a tour by Jan 31?", subjectKey: "SZA" }, plan, [], [], [first], ""), null);
});

test("saved artist repetition is checked beyond the last 40 records", () => {
  const recent = [
    ...Array.from({ length: 45 }, (_, i) => ({ text: `Will fixture ${i} happen?`, category: "Sports" })),
    { text: "Will Taylor Swift release an album?", category: "Entertainment" },
    { text: "Will the Eras Tour add a date?", category: "Entertainment" },
  ];
  assert.ok(saturatedSubjects(recent).includes("taylor swift"));
  const plan = researchPlan(1, 1, 0, "Entertainment", "seed", recent, []);
  assert.match(diversityIssue({ text: "Will Taylor Swift announce a tour by Nov 1?", category: "Entertainment", subjectKey: "new tour", storyKey: "tour", researchSlot: "slot-0" }, plan, recent, [], [], "")!, /overrepresented/);
});

test("generation keeps a direct vaccine draft with exact resolution rules and replaces specialist wording", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "fixture-only";
  const now = Date.now();
  const base = {
    category: "Science", sourceUrl: "https://official.example/vaccines",
    publishDate: new Date(now).toISOString(),
    closesToPredictionsAt: new Date(now + 3 * 86400000).toISOString(),
    resolutionDate: new Date(now + 4 * 86400000).toISOString(),
    context: "Fixture health news.", contextSourceUrl: "https://news.example/vaccines",
    resolutionCriteria: "YES if the vaccine becomes available to patients in the US by the stated deadline, otherwise NO. Official rollout notice decides; approval alone does not count.",
  };
  const simple = { ...base, text: "Will a new COVID-19 vaccine roll out in the US this week?", subjectKey: "COVID-19 vaccine", storyKey: "rollout", researchSlot: "slot-0" };
  const specialist = { ...base, text: "Will Novavax report topline Phase 3 results by Jan 31?", subjectKey: "Novavax", storyKey: "trial", researchSlot: "slot-1" };
  globalThis.fetch = async () => Response.json({ status: "completed", output: [
    { type: "web_search_call", status: "completed", action: { sources: [{ url: base.contextSourceUrl }] } },
    { type: "message", content: [{ type: "output_text", text: JSON.stringify({ questions: [simple, specialist] }) }] },
  ] });
  try {
    const result = await generateQuestions(generationOptions({ count: 2, category: "Science" }), [], "America/New_York", []);
    assert.equal(result.drafts.length, 1);
    assert.equal(result.skipped, 1);
    assert.equal(result.drafts[0].text, simple.text);
    assert.equal(result.drafts[0].resolutionCriteria, base.resolutionCriteria);
    assert.equal(result.drafts[0].closesToPredictionsAt, base.closesToPredictionsAt);
    assert.equal(result.drafts[0].resolutionDate, base.resolutionDate);
    assert.match(result.skipReasons[0], /specialist/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});
