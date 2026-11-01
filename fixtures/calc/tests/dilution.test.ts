import { test } from "node:test";
import assert from "node:assert/strict";
import { totalDilution } from "../dilution.ts";

const near = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

test("single step", () => near(totalDilution([[0.1, 9.9]]), 100));

test("series", () => near(totalDilution([[0.1, 9.9], [0.1, 9.9], [1, 9], [1, 9], [1, 9]]), 1e7));

test("empty list means no dilution", () => assert.equal(totalDilution([]), 1));

test("rejects non-positive volumes", () => {
  assert.throws(() => totalDilution([[0, 9]]), RangeError);
  assert.throws(() => totalDilution([[1, -2]]), RangeError);
});
