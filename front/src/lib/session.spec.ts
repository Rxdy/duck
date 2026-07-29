import { describe, expect, it } from "vitest";
import { parseSession } from "./session.js";

describe("parseSession", () => {
  it("accepts a well-formed session", () => {
    expect(parseSession({ token: "abc", username: "alice", email: "alice@example.com" })).toEqual({
      token: "abc",
      username: "alice",
      email: "alice@example.com",
    });
  });

  it("rejects null, non-objects, or missing fields", () => {
    expect(parseSession(null)).toBeUndefined();
    expect(parseSession("nope")).toBeUndefined();
    expect(parseSession({ token: "abc", username: "alice" })).toBeUndefined();
    expect(parseSession({ username: "alice", email: "alice@example.com" })).toBeUndefined();
  });

  it("rejects non-string fields", () => {
    expect(
      parseSession({ token: 42, username: "alice", email: "alice@example.com" }),
    ).toBeUndefined();
  });
});
