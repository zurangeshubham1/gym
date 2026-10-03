import type { ReceiptData } from "../types";
import { formatDate, formatMoney } from "./format";

export async function downloadReceiptPdf(receipt: ReceiptData): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const { gym, payment, member, planName, previousPending, currentPending, outstandingAmount } = receipt;
  const outstanding = outstandingAmount ?? currentPending;
  doc.setFontSize(18);
  doc.text(gym.gymName || "Gym", 20, 22);
  doc.setFontSize(10);
  doc.text(gym.gymAddress || "", 20, 30);
  doc.text(`${gym.gymMobile || ""}  ${gym.gymEmail || ""}`, 20, 36);
  doc.setFontSize(14);
  doc.text("Paid receipt", 20, 50);
  doc.setFontSize(11);
  const lines = [
    `Receipt no.: ${payment.paymentId}`,
    `Payment status: ${payment.paymentStatus}`,
    `Member ID: ${member.memberId}`,
    `Member name: ${member.fullName}`,
    `Mobile: ${member.mobile}`,
    `Payment date: ${formatDate(payment.paymentDate)}`,
    `Method: ${payment.paymentMethod}`,
    `Reference: ${payment.transactionReference || "—"}`,
    `Plan: ${planName}`,
    `Validity: ${formatDate(member.membershipStartDate)} – ${formatDate(member.membershipEndDate)}`,
    `Membership total: ${formatMoney(member.totalAmount, gym.currency)}`,
    `Paid: ${formatMoney(member.paidAmount, gym.currency)}`,
    outstanding > 0
      ? `Outstanding / still pending: ${formatMoney(outstanding, gym.currency)}`
      : "Outstanding: Nil — fully paid",
    `Amount this receipt: ${formatMoney(payment.amount, gym.currency)}`,
    `Previous pending: ${formatMoney(previousPending, gym.currency)}`,
  ];
  lines.forEach((line, i) => doc.text(line, 20, 62 + i * 8));
  doc.setFontSize(9);
  doc.text(gym.receiptFooter || "", 20, 180);
  doc.save(`${payment.paymentId}.pdf`);
}
