import { describe, expect, it } from "vitest";
import { formatPeak, formatStarted } from "../src/format.ts";

const now = new Date("2026-11-01T12:00:00Z");

describe("formatStarted", () => {
  it("reads recent times in minutes", () => {
    expect(formatStarted("2026-11-01T11:35:00Z", now)).toBe("25 min ago");
  });

  it("switches to hours after an hour", () => {
    expect(formatStarted("2026-11-01T09:00:00Z", now)).toBe("3 h ago");
  });

  it("switches to days after a day", () => {
    expect(formatStarted("2026-10-29T12:00:00Z", now)).toBe("3 d ago");
  });
});

describe("formatPeak", () => {
  it("shows a dash when there is no reading", () => {
    expect(formatPeak(null)).toBe("—");
  });

  it("shows decibels when there is one", () => {
    expect(formatPeak(86)).toBe("86 dB");
  });
});
