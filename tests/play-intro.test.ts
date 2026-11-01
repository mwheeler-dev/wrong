import { test } from "node:test";
import assert from "node:assert/strict";
import { hasStartedPlayToday } from "../src/lib/play-intro";

test("the introduction is required until a player starts today's game", () => {
  const now = new Date("2026-11-01T18:00:00Z");
  assert.equal(hasStartedPlayToday(null, "America/New_York", now), false);
  assert.equal(hasStartedPlayToday(new Date("2026-11-01T15:00:00Z"), "America/New_York", now), true);
});

test("the introduction resets at the player's midnight, not UTC midnight", () => {
  const started = new Date("2026-11-01T02:00:00Z"); // Oct 31 in New York
  assert.equal(hasStartedPlayToday(started, "America/New_York", new Date("2026-11-01T03:59:59Z")), true);
  assert.equal(hasStartedPlayToday(started, "America/New_York", new Date("2026-11-01T04:00:00Z")), false);
  assert.equal(hasStartedPlayToday(started, "Asia/Tokyo", new Date("2026-11-01T04:00:00Z")), true);
});

test("a daylight-saving reset follows the 25-hour local day rather than a rolling 24 hours", () => {
  const started = new Date("2026-11-01T04:01:00Z");
  assert.equal(hasStartedPlayToday(started, "America/New_York", new Date("2026-11-02T04:59:59Z")), true);
  assert.equal(hasStartedPlayToday(started, "America/New_York", new Date("2026-11-02T05:00:00Z")), false);
});
