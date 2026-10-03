import { describe, expect, it } from "vitest";
import {
  computeNetIncome,
  computePaidFromPayments,
  computePendingAmount,
  validatePaymentAmount,
} from "./finance";

describe("finance calculations", () => {
  it("computes pending after partial payments", () => {
    expect(computePendingAmount(12000, 5000)).toBe(7000);
    expect(computePendingAmount(12000, 7000)).toBe(5000);
  });

  it("never returns negative pending", () => {
    expect(computePendingAmount(1000, 1500)).toBe(0);
  });

  it("sums only PAID payments", () => {
    const paid = computePaidFromPayments([
      { amount: 5000, paymentStatus: "PAID" },
      { amount: 2000, paymentStatus: "CANCELLED" },
      { amount: 1500, paymentStatus: "PENDING" },
      { amount: 2000, paymentStatus: "PAID" },
    ]);
    expect(paid).toBe(7000);
  });

  it("rejects invalid payment amounts", () => {
    expect(validatePaymentAmount(-10, 100)).toBe("NEGATIVE_AMOUNT");
    expect(validatePaymentAmount(0, 100)).toBe("ZERO_AMOUNT");
    expect(validatePaymentAmount(150, 100)).toBe("EXCEEDS_PENDING");
    expect(validatePaymentAmount(50, 100)).toBeNull();
  });

  it("computes net income", () => {
    expect(computeNetIncome(25000, 8000)).toBe(17000);
  });

  it("pending follows successive payments 400 then 500 then 100", () => {
    const total = 4000;
    const after1 = computePendingAmount(total, 400);
    const after2 = computePendingAmount(total, 400 + 500);
    const after3 = computePendingAmount(total, 400 + 500 + 100);
    expect(after1).toBe(3600);
    expect(after2).toBe(3100);
    expect(after3).toBe(3000);
  });
});
