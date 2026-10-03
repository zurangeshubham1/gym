import { describe, expect, it } from "vitest";
import { addDaysIso, deriveMemberStatus, expiryBucket } from "./dates";

describe("membership dates", () => {
  it("adds duration days to start date", () => {
    expect(addDaysIso("2026-01-01", 30)).toBe("2026-01-31");
    expect(addDaysIso("2026-01-01", 90)).toBe("2026-04-01");
  });

  it("classifies expiry windows", () => {
    expect(expiryBucket("2026-01-01", "2026-01-02")).toBe("EXPIRED");
    expect(expiryBucket("2026-01-10", "2026-01-10")).toBe("TODAY");
    expect(expiryBucket("2026-01-15", "2026-01-10")).toBe("D7");
    expect(expiryBucket("2026-02-01", "2026-01-10")).toBe("D30");
    expect(expiryBucket("2026-06-01", "2026-01-10")).toBe("LATER");
  });

  it("does not auto-activate suspended members", () => {
    expect(deriveMemberStatus("SUSPENDED", "2026-12-01", "2026-01-01")).toBe("SUSPENDED");
    expect(deriveMemberStatus("ACTIVE", "2025-12-01", "2026-01-01")).toBe("EXPIRED");
  });
});
