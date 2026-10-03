export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function computePendingAmount(totalAmount: number, paidAmount: number): number {
  return roundMoney(Math.max(0, totalAmount - paidAmount));
}

export function computePaidFromPayments(
  payments: { amount: number; paymentStatus: string }[],
): number {
  const paid = payments
    .filter((p) => p.paymentStatus === "PAID")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  return roundMoney(paid);
}

export type PaymentValidationError =
  | "INVALID_AMOUNT"
  | "NEGATIVE_AMOUNT"
  | "ZERO_AMOUNT"
  | "EXCEEDS_PENDING";

export function validatePaymentAmount(
  amount: number,
  pendingAmount: number,
): PaymentValidationError | null {
  if (!Number.isFinite(amount)) return "INVALID_AMOUNT";
  if (amount < 0) return "NEGATIVE_AMOUNT";
  if (amount === 0) return "ZERO_AMOUNT";
  if (roundMoney(amount) > roundMoney(pendingAmount)) return "EXCEEDS_PENDING";
  return null;
}

export function paymentErrorMessage(code: PaymentValidationError): string {
  switch (code) {
    case "INVALID_AMOUNT":
      return "Enter a valid payment amount.";
    case "NEGATIVE_AMOUNT":
      return "Payment amount cannot be negative.";
    case "ZERO_AMOUNT":
      return "Payment amount must be greater than zero.";
    case "EXCEEDS_PENDING":
      return "Payment cannot be greater than the pending amount.";
  }
}

export function computeNetIncome(totalIncome: number, totalExpenses: number): number {
  return roundMoney(totalIncome - totalExpenses);
}

export function validateMemberFinance(totalAmount: number, paidAmount: number): string | null {
  if (!Number.isFinite(totalAmount)) return "Enter a valid total amount.";
  if (!Number.isFinite(paidAmount)) return "Enter a valid paid amount.";
  if (totalAmount < 0) return "Total amount cannot be negative.";
  if (paidAmount < 0) return "Paid amount cannot be negative.";
  if (roundMoney(paidAmount) > roundMoney(totalAmount)) return "Paid cannot be greater than total.";
  return null;
}
