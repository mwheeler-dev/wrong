import { test } from "node:test";
import assert from "node:assert/strict";
import { longestCompleteStreak, streakBadges, qualifiesAsCategoryLeader } from "../src/lib/player-badges";
import { normalizeUsername, isValidUsername, publicUsername } from "../src/lib/usernames";

test("usernames normalize case; reject short, oversized, non-ASCII and unsafe handles", () => {
  assert.equal(normalizeUsername("  SharpPLAYER_1  "), "sharpplayer_1");
  for (const value of ["abc", "a".repeat(25), "real name", "<script>", "é".repeat(8), "hello\nworld"]) assert.equal(isValidUsername(normalizeUsername(value)), false);
  assert.equal(isValidUsername(normalizeUsername("SharpPLAYER_1")), true);
  assert.equal(isValidUsername("a".repeat(8)), true);
  assert.equal(isValidUsername("a".repeat(24)), true);
  assert.equal(normalizeUsername({ username: "a".repeat(8) }), "");
  assert.equal(publicUsername({ id: "opaqueid", username: null }), "player_opaqueid");
  assert.equal(publicUsername({ id: "opaqueid", username: "chosenname" }), "chosenname");
});

test("permanent streak awards use completed local days across DST, gaps and unsorted predictions", () => {
  const days = ["2026-10-30T17:00:00Z", "2026-10-31T17:00:00Z", "2026-11-01T17:00:00Z", "2026-11-03T17:00:00Z"];
  const dates = days.flatMap((day) => Array.from({ length: 10 }, () => new Date(day))).reverse();
  assert.equal(longestCompleteStreak(dates, "America/New_York"), 3);
  assert.equal(longestCompleteStreak(dates.slice(0, 9), "America/New_York"), 0);
  assert.deepEqual(streakBadges(2), []);
  assert.deepEqual(streakBadges(7).map((b) => b.id), ["streak-3", "streak-7"]);
  assert.equal(streakBadges(30).length, 3);
  const boundary = [...Array.from({ length: 10 }, () => new Date("2026-11-01T02:00:00Z")), ...Array.from({ length: 10 }, () => new Date("2026-11-01T15:00:00Z"))];
  assert.equal(longestCompleteStreak(boundary, "America/New_York"), 2);
  assert.equal(longestCompleteStreak(boundary, "UTC"), 1);
});

test("category leadership requires positive Edge, enough history, and allows ties", () => {
  const competitors = [{ score: 500, total: 9 }, { score: 100, total: 10 }];
  assert.equal(qualifiesAsCategoryLeader(100, 10, competitors), true);
  assert.equal(qualifiesAsCategoryLeader(99, 10, competitors), false);
  assert.equal(qualifiesAsCategoryLeader(200, 9, competitors), false);
  assert.equal(qualifiesAsCategoryLeader(0, 20, []), false);
  assert.equal(qualifiesAsCategoryLeader(-10, 20, []), false);
});
