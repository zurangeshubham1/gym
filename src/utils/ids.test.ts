import { describe, expect, it } from "vitest";
import { nextSequentialId } from "./ids";

describe("id generation", () => {
  it("generates GYM001 then GYM002", () => {
    expect(nextSequentialId("GYM", [])).toBe("GYM001");
    expect(nextSequentialId("GYM", ["GYM001", "GYM003"])).toBe("GYM004");
    expect(nextSequentialId("PAY", ["PAY001", "PAY002"])).toBe("PAY003");
  });
});
