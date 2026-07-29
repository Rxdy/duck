import { describe, expect, it } from "vitest";
import {
  AMBIENT_LOOP_PATTERN,
  ARCADE_START_JINGLE,
  SCORE_SFX_PATTERN,
  type JingleNote,
} from "./arcadeJingle.js";

function expectValidPattern(pattern: JingleNote[]) {
  expect(pattern.length).toBeGreaterThan(0);
  for (const note of pattern) {
    expect(note.frequency).toBeGreaterThan(0);
    expect(note.durationMs).toBeGreaterThan(0);
  }
}

describe("ARCADE_START_JINGLE", () => {
  it("is a non-empty sequence of positive frequencies and durations", () => {
    expectValidPattern(ARCADE_START_JINGLE);
  });
});

describe("AMBIENT_LOOP_PATTERN", () => {
  it("is a non-empty sequence of positive frequencies and durations", () => {
    expectValidPattern(AMBIENT_LOOP_PATTERN);
  });
});

describe("SCORE_SFX_PATTERN", () => {
  it("is a non-empty sequence of positive frequencies and durations", () => {
    expectValidPattern(SCORE_SFX_PATTERN);
  });
});
