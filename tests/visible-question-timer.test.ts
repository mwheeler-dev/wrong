import test from "node:test";
import assert from "node:assert/strict";
import { getStoredDeadline, ensureQuestionTimer, clearStoredDeadline } from "../src/lib/questionTimer";

test("cache repair retains active old timers and never renews a presented card's expiry", () => {
  const values = new Map<string, string>();
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const oldNow = Date.now;
  let now = 1_800_000_000_000;
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } });
  Date.now = () => now;
  try {
    values.set("wrong:questionTimer:old-background", String(now - 60_000));
    assert.equal(getStoredDeadline("old-background"), null);
    const repaired = ensureQuestionTimer("old-background", 30_000);
    assert.equal(repaired.deadline, now + 30_000);
    values.set("wrong:questionTimer:old-active", String(now + 5_000));
    assert.equal(ensureQuestionTimer("old-active", 30_000).deadline, now + 5_000);
    now += 60_000;
    assert.equal(ensureQuestionTimer("old-background", 30_000).deadline, repaired.deadline);
    assert.ok(getStoredDeadline("old-background")! < now);
    assert.equal(getStoredDeadline("old-active"), now - 55_000);
    clearStoredDeadline("old-active");
    assert.equal(getStoredDeadline("old-active"), null);
  } finally {
    Date.now = oldNow;
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow); else Reflect.deleteProperty(globalThis, "window");
    if (oldStorage) Object.defineProperty(globalThis, "sessionStorage", oldStorage); else Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});
