export const SESSION_KEY = "gym.session";
export const REMEMBER_KEY = "gym.remember";

export const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "BANK_TRANSFER"] as const;
export const MEMBER_STATUSES = ["ACTIVE", "EXPIRED", "SUSPENDED", "INACTIVE"] as const;

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Equipment",
  "Salary",
  "Maintenance",
  "Marketing",
  "Supplies",
  "Other",
] as const;
