import { describe, expect, it } from "vitest";
import {
  computeNetIncome,
  computePaidFromPayments,
  computePendingAmount,
  validateMemberFinance,
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

  it("pending follows editable total and paid", () => {
    expect(computePendingAmount(4000, 1500)).toBe(2500);
    expect(validateMemberFinance(4000, 1500)).toBeNull();
    expect(validateMemberFinance(4000, 5000)).toBe("Paid cannot be greater than total.");
  });
});
