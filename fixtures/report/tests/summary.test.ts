import { test } from "node:test";
import assert from "node:assert/strict";
import { ranked, share, total } from "../summary.ts";

const rows = [
  { label: "sms", value: 75 },
  { label: "email", value: 100 },
  { label: "push", value: 25 },
];

test("total sums every row", () => assert.equal(total(rows), 200));

test("total of no rows is 0", () => assert.equal(total([]), 0));

test("share is a percentage", () => assert.equal(share(rows, "sms"), 37.5));

test("share of an unknown label is 0", () => assert.equal(share(rows, "nope"), 0));

test("ranked puts the largest first", () =>
  assert.deepEqual(ranked(rows).map((r) => r.label), ["email", "sms", "push"]));
