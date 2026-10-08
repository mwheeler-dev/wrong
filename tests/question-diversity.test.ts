import test from "node:test";
import assert from "node:assert/strict";
import {
  researchPlan,
  diversityIssue,
  saturatedSubjects,
  type DraftTopic,
} from "../src/lib/questionDiversity";
import { generationOptions } from "../src/lib/questionGeneration";

test("mixed runs cover all eight categories with balanced counts across five-question groups", () => {
  const history = [
    ...Array.from({ length: 20 }, () => ({
      text: "Will the World Series reach Game 7?",
      category: "Sports",
    })),
    ...Array.from({ length: 10 }, () => ({
      text: "Will Trump sign the bill?",
      category: "Politics",
    })),
    ...Array.from({ length: 10 }, () => ({
      text: "Will NASA launch the mission?",
      category: "Science",
    })),
  ];
  const full = researchPlan(20, 20, 0, "", "fixture-seed", history, []);
  assert.equal(new Set(full.map((slot) => slot.category)).size, 8);
  for (const category of new Set(full.map((slot) => slot.category)))
    assert.ok(
      [2, 3].includes(full.filter((slot) => slot.category === category).length),
    );
  assert.equal(new Set(full.slice(0, 5).map((slot) => slot.category)).size, 5);
  assert.ok(
    full
      .slice(0, 5)
      .every(
        (slot) => !["Sports", "Politics", "Science"].includes(slot.category),
      ),
  );
  assert.deepEqual(
    researchPlan(
      5,
      20,
      5,
      "",
      "fixture-seed",
      history,
      full.slice(0, 5).map((slot) => ({
        text: "Fixture",
        category: slot.category,
        researchSlot: slot.id,
      })),
    ),
    full.slice(5, 10),
  );
});

test("replacement plans fill missing slots rather than restarting or repeating successful slots", () => {
  const accepted = [0, 2, 4].map((i) => ({
    text: "Fixture",
    category: "Culture",
    researchSlot: `slot-${i}`,
  }));
  const plan = researchPlan(2, 5, 0, "Culture", "fixture-seed", [], accepted);
  assert.deepEqual(
    plan.map((slot) => slot.id),
    ["slot-1", "slot-3"],
  );
  assert.ok(plan.every((slot) => slot.category === "Culture"));
});

test("aliases and recent topic saturation block rewrites about World Series, Trump and NASA", () => {
  const history = [
    { text: "Will the World Series go seven games?", category: "Sports" },
    { text: "Will the MLB playoffs end this week?", category: "Sports" },
    { text: "Will Donald Trump sign the law?", category: "Politics" },
    { text: "Will Trump visit the summit?", category: "Politics" },
    { text: "Will NASA launch tomorrow?", category: "Science" },
    { text: "Will Artemis launch next week?", category: "Science" },
  ];
  assert.ok(saturatedSubjects(history).includes("mlb postseason"));
  assert.ok(saturatedSubjects(history).includes("donald trump"));
  assert.ok(saturatedSubjects(history).includes("nasa"));
  for (const [text, category, subjectKey] of [
    ["Will the MLB postseason end in six games?", "Sports", "MLB playoffs"],
    ["Will Donald J. Trump announce the decision?", "Politics", "Donald Trump"],
    ["Will Artemis complete its test?", "Science", "Artemis"],
  ]) {
    const plan = researchPlan(1, 1, 0, category, "seed", history, []);
    assert.match(
      diversityIssue(
        {
          text,
          category,
          subjectKey,
          storyKey: "new-story",
          researchSlot: "slot-0",
        },
        plan,
        history,
        [],
        [],
        "",
      )!,
      /overrepresented/,
    );
  }
});

test("new topics survive while repeated people, events and source stories are rejected individually", () => {
  const plan = researchPlan(3, 3, 0, "Entertainment", "seed", [], []);
  const first: DraftTopic = {
    text: "Will Beyoncé announce a tour?",
    category: "Entertainment",
    subjectKey: "Beyoncé",
    storyKey: "tour-announcement",
    researchSlot: "slot-0",
    contextSourceUrl: "https://news.example/tour",
  };
  assert.equal(diversityIssue(first, plan, [], [], [], ""), null);
  assert.match(
    diversityIssue(
      {
        ...first,
        text: "Will Beyonce announce a film?",
        subjectKey: "Beyonce",
        storyKey: "film-announcement",
        researchSlot: "slot-1",
      },
      plan,
      [],
      [],
      [first],
      "",
    )!,
    /repeated/,
  );
  const different = {
    ...first,
    text: "Will Rihanna release a single?",
    subjectKey: "Rihanna",
    storyKey: "single-release",
    researchSlot: "slot-1",
    contextSourceUrl: "https://news.example/single",
  };
  assert.equal(diversityIssue(different, plan, [], [], [first], ""), null);
  assert.match(
    diversityIssue(
      { ...different, storyKey: first.storyKey },
      plan,
      [],
      [],
      [first],
      "",
    )!,
    /event/,
  );
  assert.match(
    diversityIssue(
      { ...different, contextSourceUrl: first.contextSourceUrl },
      plan,
      [],
      [],
      [first],
      "",
    )!,
    /story/,
  );
  assert.match(
    diversityIssue(different, plan, [], [different], [], "")!,
    /repeated/,
  );
  assert.match(
    diversityIssue(
      { ...different, category: "Science" },
      plan,
      [],
      [],
      [],
      "",
    )!,
    /assigned/,
  );
});

test("explicit subject requests can share an artist but still require different events", () => {
  const plan = researchPlan(2, 2, 0, "Entertainment", "seed", [], []);
  const first = {
    text: "Will Beyoncé announce a tour?",
    category: "Entertainment",
    subjectKey: "Beyoncé",
    storyKey: "tour-announcement",
    researchSlot: "slot-0",
  };
  const second = {
    ...first,
    text: "Will Beyonce release a film?",
    subjectKey: "Beyonce",
    storyKey: "film-release",
    researchSlot: "slot-1",
  };
  assert.equal(
    diversityIssue(second, plan, [], [], [first], "Beyoncé news"),
    null,
  );
  assert.match(
    diversityIssue(
      { ...second, storyKey: first.storyKey },
      plan,
      [],
      [],
      [first],
      "Beyoncé news",
    )!,
    /event/,
  );
  assert.match(
    diversityIssue(second, plan, [], [], [first], "music news")!,
    /repeated/,
  );
});

test("batch planning metadata is bounded and rejects invalid exclusion payloads", () => {
  assert.throws(() => generationOptions({ count: 5, totalCount: 4 }));
  assert.throws(() =>
    generationOptions({ count: 5, totalCount: 10, offset: 6 }),
  );
  assert.throws(() => generationOptions({ count: 1, seed: "x".repeat(81) }));
  assert.throws(() =>
    generationOptions({
      count: 1,
      excludeTopics: Array.from({ length: 21 }, () => ({
        text: "Fixture",
        category: "Culture",
      })),
    }),
  );
  assert.throws(() =>
    generationOptions({
      count: 1,
      previousTopics: [{ text: "Fixture", category: "Unknown" }],
    }),
  );
});

test("a focused topic is not forced into unrelated categories", () => {
  const plan = researchPlan(5, 5, 0, "", "seed", [], [], "music releases");
  assert.ok(
    plan.every(
      (slot) =>
        slot.category === null && slot.direction.includes("music releases"),
    ),
  );
  const constrained = researchPlan(
    5,
    5,
    0,
    "Entertainment",
    "seed",
    [],
    [],
    "music releases",
  );
  assert.ok(constrained.every((slot) => slot.category === "Entertainment"));
});
