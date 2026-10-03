import {
  computeNetIncome,
  computePaidFromPayments,
  computePendingAmount,
  paymentErrorMessage,
  roundMoney,
  validateMemberFinance,
  validatePaymentAmount,
} from "../utils/finance";
import { addDaysIso, deriveMemberStatus, expiryBucket, inRange, monthKey, todayIso } from "../utils/dates";
import { nextSequentialId } from "../utils/ids";
import type {
  ApiResult,
  AuthSession,
  CreateExpenseInput,
  CreateMemberInput,
  CreatePaymentInput,
  CreatePlanInput,
  DashboardData,
  Enquiry,
  Expense,
  GymApi,
  GymSettings,
  Member,
  MembershipPlan,
  Payment,
  ReceiptData,
  ReportsData,
  SessionUser,
  SubmitEnquiryInput,
  UpdateMemberFinanceInput,
  UpdateMemberInput,
  UpdatePlanInput,
} from "../types";

const DEMO_PASSWORD = "Admin@123";
let adminPassword = DEMO_PASSWORD;
const TZ = "Asia/Kolkata";

let tokenSeq = 1;
const sessions = new Map<string, SessionUser>();

function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}
function err<T>(error: string, code?: string): ApiResult<T> {
  return { ok: false, error, code };
}

function nowIso(): string {
  return new Date().toISOString();
}

const settings: GymSettings = {
  gymName: "IronForge Gym (Demo)",
  gymAddress: "12 Demo Street, Pune, Maharashtra",
  gymMobile: "9999900001",
  gymEmail: "demo@ironforge.example",
  currency: "INR",
  receiptFooter: "Demo receipt — not a tax invoice.",
  timezone: TZ,
};

const plans: MembershipPlan[] = [
  { planId: "PLAN001", planName: "Monthly", durationDays: 30, price: 1500, description: "30-day access", status: "ACTIVE" },
  { planId: "PLAN002", planName: "Quarterly", durationDays: 90, price: 4000, description: "90-day access", status: "ACTIVE" },
  { planId: "PLAN003", planName: "Half-Yearly", durationDays: 180, price: 7500, description: "180-day access", status: "ACTIVE" },
  { planId: "PLAN004", planName: "Yearly", durationDays: 365, price: 12000, description: "365-day access", status: "ACTIVE" },
];

const user: SessionUser = {
  adminId: "ADM001",
  username: "admin",
  fullName: "Demo Super Admin",
  role: "SUPER_ADMIN",
};

let members: Member[] = [];
let payments: Payment[] = [];
let expenses: Expense[] = [];
let enquiries: Enquiry[] = [];

function planById(id: string): MembershipPlan | undefined {
  return plans.find((p) => p.planId === id);
}

function requireUser(token: string): ApiResult<SessionUser> {
  const found = sessions.get(token);
  if (!found) return err("Unauthorized. Please log in again.", "UNAUTHORIZED");
  return ok(found);
}

function refreshMember(member: Member): Member {
  const paid = computePaidFromPayments(payments.filter((p) => p.memberId === member.memberId));
  const pending = computePendingAmount(member.totalAmount, paid);
  const paidRows = payments
    .filter((p) => p.memberId === member.memberId && p.paymentStatus === "PAID")
    .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
  const last = paidRows.at(-1)?.paymentDate ?? "";
  const status = deriveMemberStatus(member.status, member.membershipEndDate, todayIso(TZ));
  return {
    ...member,
    paidAmount: paid,
    pendingAmount: pending,
    lastPaymentDate: last,
    status,
    updatedAt: nowIso(),
  };
}

function seed(): void {
  const today = todayIso(TZ);
  const demoPeople = [
    ["Aarav Demo", "9000000001", "aarav.demo@example.com", "Male"],
    ["Diya Demo", "9000000002", "diya.demo@example.com", "Female"],
    ["Kabir Demo", "9000000003", "kabir.demo@example.com", "Male"],
    ["Meera Demo", "9000000004", "meera.demo@example.com", "Female"],
    ["Rohan Demo", "9000000005", "rohan.demo@example.com", "Male"],
    ["Sana Demo", "9000000006", "sana.demo@example.com", "Female"],
    ["Vikram Demo", "9000000007", "vikram.demo@example.com", "Male"],
    ["Anaya Demo", "9000000008", "anaya.demo@example.com", "Female"],
    ["Ishaan Demo", "9000000009", "ishaan.demo@example.com", "Male"],
    ["Tara Demo", "9000000010", "tara.demo@example.com", "Female"],
  ] as const;

  members = demoPeople.map((p, i) => {
    const plan = plans[i % plans.length];
    const start = addDaysIso(today, -20 + i * 3);
    const end = addDaysIso(start, plan.durationDays);
    const member: Member = {
      memberId: `GYM${String(i + 1).padStart(3, "0")}`,
      fullName: p[0],
      mobile: p[1],
      email: p[2],
      gender: p[3],
      dateOfBirth: `199${i % 10}-0${(i % 8) + 1}-15`,
      address: `${10 + i} Demo Lane, Pune`,
      joinDate: start,
      membershipPlanId: plan.planId,
      membershipStartDate: start,
      membershipEndDate: end,
      totalAmount: plan.price,
      paidAmount: 0,
      pendingAmount: plan.price,
      lastPaymentDate: "",
      status: "ACTIVE",
      notes: "DEMO_DATA",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    return member;
  });

  payments = [
    { paymentId: "PAY001", memberId: "GYM001", paymentDate: addDaysIso(today, -10), amount: 1500, paymentMethod: "UPI", transactionReference: "UPI-DEMO-1", paymentStatus: "PAID", notes: "DEMO_DATA", createdAt: nowIso(), createdBy: "admin" },
    { paymentId: "PAY002", memberId: "GYM002", paymentDate: addDaysIso(today, -8), amount: 2000, paymentMethod: "CASH", transactionReference: "", paymentStatus: "PAID", notes: "DEMO_DATA", createdAt: nowIso(), createdBy: "admin" },
    { paymentId: "PAY003", memberId: "GYM004", paymentDate: addDaysIso(today, -5), amount: 4000, paymentMethod: "CARD", transactionReference: "CARD-DEMO-3", paymentStatus: "PAID", notes: "DEMO_DATA", createdAt: nowIso(), createdBy: "admin" },
    { paymentId: "PAY004", memberId: "GYM007", paymentDate: addDaysIso(today, -2), amount: 5000, paymentMethod: "BANK_TRANSFER", transactionReference: "NEFT-DEMO-4", paymentStatus: "PAID", notes: "DEMO_DATA", createdAt: nowIso(), createdBy: "admin" },
    { paymentId: "PAY005", memberId: "GYM010", paymentDate: today, amount: 1500, paymentMethod: "UPI", transactionReference: "UPI-DEMO-5", paymentStatus: "PAID", notes: "DEMO_DATA", createdAt: nowIso(), createdBy: "admin" },
  ];

  expenses = [
    { expenseId: "EXP001", expenseDate: addDaysIso(today, -12), category: "Rent", description: "Demo hall rent", amount: 8000, paymentMethod: "BANK_TRANSFER", createdAt: nowIso(), createdBy: "admin" },
    { expenseId: "EXP002", expenseDate: addDaysIso(today, -3), category: "Supplies", description: "Demo cleaning supplies", amount: 1200, paymentMethod: "CASH", createdAt: nowIso(), createdBy: "admin" },
  ];

  enquiries = [];
  members = members.map(refreshMember);
}

seed();

function buildReceipt(payment: Payment, previousPending: number): ApiResult<ReceiptData> {
  const member = members.find((m) => m.memberId === payment.memberId);
  if (!member) return err("Member not found.", "MISSING_MEMBER");
  return ok({
    gym: { ...settings },
    payment,
    member,
    planName: planById(member.membershipPlanId)?.planName ?? "",
    previousPending,
    currentPending: member.pendingAmount,
    outstandingAmount: member.pendingAmount,
  });
}

function dashboard(): DashboardData {
  const today = todayIso(TZ);
  const month = monthKey(today);
  const paid = payments.filter((p) => p.paymentStatus === "PAID");
  const todayCollection = roundMoney(paid.filter((p) => p.paymentDate === today).reduce((s, p) => s + p.amount, 0));
  const monthCollection = roundMoney(paid.filter((p) => monthKey(p.paymentDate) === month).reduce((s, p) => s + p.amount, 0));
  const totalExpenses = roundMoney(expenses.reduce((s, e) => s + e.amount, 0));
  const totalIncome = roundMoney(paid.reduce((s, p) => s + p.amount, 0));
  const buckets = { expired: 0, today: 0, d7: 0, d30: 0 };
  for (const m of members) {
    if (m.status === "INACTIVE" || m.status === "SUSPENDED") continue;
    const b = expiryBucket(m.membershipEndDate, today);
    if (b === "EXPIRED") buckets.expired += 1;
    if (b === "TODAY") buckets.today += 1;
    if (b === "D7") buckets.d7 += 1;
    if (b === "D30") buckets.d30 += 1;
  }
  return {
    totalMembers: members.length,
    activeMembers: members.filter((m) => m.status === "ACTIVE").length,
    expiredMembers: members.filter((m) => m.status === "EXPIRED").length,
    pendingAmount: roundMoney(members.reduce((s, m) => s + m.pendingAmount, 0)),
    todayCollection,
    monthCollection,
    totalExpenses,
    netIncome: computeNetIncome(totalIncome, totalExpenses),
    expiredCount: buckets.expired,
    expiresToday: buckets.today,
    expiresIn7Days: buckets.d7,
    expiresIn30Days: buckets.d30,
    recentPayments: [...paid].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)).slice(0, 6),
    recentMembers: [...members].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
    expiringSoon: members
      .filter((m) => {
        const b = expiryBucket(m.membershipEndDate, today);
        return m.status !== "INACTIVE" && (b === "TODAY" || b === "D7" || b === "D30" || b === "EXPIRED");
      })
      .slice(0, 8),
    pendingPayments: members.filter((m) => m.pendingAmount > 0 && m.status !== "INACTIVE").slice(0, 8),
  };
}

export const mockGymApi: GymApi = {
  async login(username, password) {
    if (username.trim().toLowerCase() !== "admin" || password !== adminPassword) {
      return err("Invalid username or password.", "INVALID_LOGIN");
    }
    const token = `demo-token-${tokenSeq++}`;
    sessions.set(token, user);
    const session: AuthSession = { token, user };
    return ok(session);
  },
  async getDashboard(token) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    return ok(dashboard());
  },
  async getMembers(token) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    members = members.map(refreshMember);
    return ok([...members]);
  },
  async getMember(token, memberId) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    const member = members.find((m) => m.memberId === memberId);
    if (!member) return err("Member not found.", "MISSING_MEMBER");
    const refreshed = refreshMember(member);
    members = members.map((m) => (m.memberId === memberId ? refreshed : m));
    return ok(refreshed);
  },
  async createMember(token, data: CreateMemberInput) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    const plan = planById(data.membershipPlanId);
    if (!plan || plan.status !== "ACTIVE") return err("Select a valid membership plan.");
    if (!data.fullName?.trim() || !data.mobile?.trim()) return err("Name and mobile are required.");
    const total = roundMoney(data.totalAmount ?? plan.price);
    const start = data.membershipStartDate || data.joinDate;
    const end = data.membershipEndDate || addDaysIso(start, plan.durationDays);
    let member: Member = {
      memberId: nextSequentialId("GYM", members.map((m) => m.memberId)),
      fullName: data.fullName.trim(),
      mobile: data.mobile.trim(),
      email: data.email?.trim() ?? "",
      gender: data.gender ?? "",
      dateOfBirth: data.dateOfBirth ?? "",
      address: data.address ?? "",
      joinDate: data.joinDate,
      membershipPlanId: plan.planId,
      membershipStartDate: start,
      membershipEndDate: end,
      totalAmount: total,
      paidAmount: 0,
      pendingAmount: total,
      lastPaymentDate: "",
      status: "ACTIVE",
      notes: data.notes ?? "",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    members.push(member);
    const initial = roundMoney(data.initialPayment ?? 0);
    if (initial > 0) {
      const created = await mockGymApi.createPayment(token, {
        memberId: member.memberId,
        paymentDate: data.joinDate,
        amount: initial,
        paymentMethod: data.paymentMethod ?? "CASH",
        transactionReference: data.transactionReference,
        notes: "Initial payment",
      });
      if (!created.ok) {
        members = members.filter((m) => m.memberId !== member.memberId);
        return created;
      }
    }
    member = refreshMember(member);
    members = members.map((m) => (m.memberId === member.memberId ? member : m));
    return ok(member);
  },
  async updateMember(token, data: UpdateMemberInput) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    const idx = members.findIndex((m) => m.memberId === data.memberId);
    if (idx < 0) return err("Member not found.", "MISSING_MEMBER");
    const current = members[idx];
    const next: Member = {
      ...current,
      ...data,
      totalAmount: data.totalAmount != null ? roundMoney(data.totalAmount) : current.totalAmount,
    };
    members[idx] = refreshMember(next);
    return ok(members[idx]);
  },
  async updateMemberFinance(token, data: UpdateMemberFinanceInput) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    const invalid = validateMemberFinance(Number(data.totalAmount), Number(data.paidAmount));
    if (invalid) return err(invalid);
    const idx = members.findIndex((m) => m.memberId === data.memberId);
    if (idx < 0) return err("Member not found.", "MISSING_MEMBER");
    const previousPending = members[idx].pendingAmount;
    const targetPaid = roundMoney(data.paidAmount);
    members[idx] = refreshMember({ ...members[idx], totalAmount: roundMoney(data.totalAmount) });
    let loops = 0;
    while (members[idx].paidAmount > targetPaid && loops < 200) {
      loops += 1;
      const newest = [...payments]
        .filter((p) => p.memberId === data.memberId && p.paymentStatus === "PAID")
        .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))[0];
      if (!newest) break;
      payments = payments.map((p) => (p.paymentId === newest.paymentId ? { ...p, paymentStatus: "PENDING" } : p));
      members[idx] = refreshMember(members[idx]);
    }
    const delta = roundMoney(targetPaid - members[idx].paidAmount);
    let payment: Payment | undefined;
    if (delta > 0) {
      payment = {
        paymentId: nextSequentialId("PAY", payments.map((p) => p.paymentId)),
        memberId: data.memberId,
        paymentDate: todayIso(TZ),
        amount: delta,
        paymentMethod: "CASH",
        transactionReference: "",
        paymentStatus: "PAID",
        notes: "Admin set paid amount",
        createdAt: nowIso(),
        createdBy: auth.data.username,
      };
      payments.push(payment);
      members[idx] = refreshMember(members[idx]);
    } else {
      payment = [...payments]
        .filter((p) => p.memberId === data.memberId && p.paymentStatus === "PAID")
        .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))[0] ?? {
        paymentId: `BAL-${data.memberId}`,
        memberId: data.memberId,
        paymentDate: todayIso(TZ),
        amount: 0,
        paymentMethod: "CASH",
        transactionReference: "",
        paymentStatus: "PAID",
        notes: "Balance statement",
        createdAt: nowIso(),
        createdBy: auth.data.username,
      };
    }
    const receipt = buildReceipt(payment, previousPending);
    if (!receipt.ok) return receipt;
    return ok({ member: members[idx], receipt: receipt.data });
  },
  async deactivateMember(token, memberId) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    const idx = members.findIndex((m) => m.memberId === memberId);
    if (idx < 0) return err("Member not found.", "MISSING_MEMBER");
    members[idx] = { ...members[idx], status: "INACTIVE", updatedAt: nowIso() };
    return ok(members[idx]);
  },
  async getPayments(token) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    return ok([...payments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)));
  },
  async createPayment(token, data: CreatePaymentInput) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    const memberIdx = members.findIndex((m) => m.memberId === data.memberId);
    if (memberIdx < 0) return err("Invalid member ID.", "INVALID_MEMBER");
    members[memberIdx] = refreshMember(members[memberIdx]);
    const member = members[memberIdx];
    const invalid = validatePaymentAmount(Number(data.amount), member.pendingAmount);
    if (invalid) return err(paymentErrorMessage(invalid), invalid);
    if (!data.paymentDate) return err("Payment date is required.", "INVALID_DATE");
    const payment: Payment = {
      paymentId: nextSequentialId("PAY", payments.map((p) => p.paymentId)),
      memberId: data.memberId,
      paymentDate: data.paymentDate,
      amount: roundMoney(data.amount),
      paymentMethod: data.paymentMethod,
      transactionReference: data.transactionReference ?? "",
      paymentStatus: "PENDING",
      notes: data.notes ?? "",
      createdAt: nowIso(),
      createdBy: auth.data.username,
    };
    if (payments.some((p) => p.paymentId === payment.paymentId)) {
      return err("Duplicate payment ID.", "DUPLICATE_PAYMENT");
    }
    payments.push(payment);
    members[memberIdx] = refreshMember(member);
    return ok(payment);
  },
  async confirmPaymentPaid(token, paymentId) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    const idx = payments.findIndex((p) => p.paymentId === paymentId);
    if (idx < 0) return err("Payment not found.", "INVALID_PAYMENT");
    const current = payments[idx];
    if (current.paymentStatus === "PAID") return err("Payment is already marked paid.");
    if (current.paymentStatus === "CANCELLED") return err("Cancelled payments cannot be marked paid.");
    const memberIdx = members.findIndex((m) => m.memberId === current.memberId);
    if (memberIdx < 0) return err("Member not found.", "MISSING_MEMBER");
    members[memberIdx] = refreshMember(members[memberIdx]);
    const invalid = validatePaymentAmount(current.amount, members[memberIdx].pendingAmount);
    if (invalid) return err(paymentErrorMessage(invalid), invalid);
    const previousPending = members[memberIdx].pendingAmount;
    payments[idx] = { ...current, paymentStatus: "PAID" };
    members[memberIdx] = refreshMember(members[memberIdx]);
    const receipt = buildReceipt(payments[idx], previousPending);
    if (!receipt.ok) return receipt;
    return ok({ payment: payments[idx], receipt: receipt.data });
  },
  async markPaymentUnpaid(token, paymentId) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    const idx = payments.findIndex((p) => p.paymentId === paymentId);
    if (idx < 0) return err("Payment not found.", "INVALID_PAYMENT");
    if (payments[idx].paymentStatus !== "PAID") return err("Only a paid payment can be marked not paid.");
    payments[idx] = { ...payments[idx], paymentStatus: "PENDING" };
    members = members.map((m) => (m.memberId === payments[idx].memberId ? refreshMember(m) : m));
    return ok(payments[idx]);
  },
  async cancelPayment(token, paymentId) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    const idx = payments.findIndex((p) => p.paymentId === paymentId);
    if (idx < 0) return err("Payment not found.", "INVALID_PAYMENT");
    if (payments[idx].paymentStatus === "CANCELLED") return err("Payment is already cancelled.");
    payments[idx] = { ...payments[idx], paymentStatus: "CANCELLED" };
    members = members.map((m) => (m.memberId === payments[idx].memberId ? refreshMember(m) : m));
    return ok(payments[idx]);
  },
  async getPlans() {
    return ok([...plans]);
  },
  async createPlan(token, data: CreatePlanInput) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    const plan: MembershipPlan = {
      planId: nextSequentialId("PLAN", plans.map((p) => p.planId)),
      planName: data.planName,
      durationDays: data.durationDays,
      price: roundMoney(data.price),
      description: data.description ?? "",
      status: data.status ?? "ACTIVE",
    };
    plans.push(plan);
    return ok(plan);
  },
  async updatePlan(token, data: UpdatePlanInput) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    const idx = plans.findIndex((p) => p.planId === data.planId);
    if (idx < 0) return err("Plan not found.");
    plans[idx] = { ...plans[idx], ...data, price: roundMoney(data.price) };
    return ok(plans[idx]);
  },
  async getExpenses(token) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    return ok([...expenses]);
  },
  async createExpense(token, data: CreateExpenseInput) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    if (data.amount <= 0) return err("Expense amount must be greater than zero.");
    const expense: Expense = {
      expenseId: nextSequentialId("EXP", expenses.map((e) => e.expenseId)),
      expenseDate: data.expenseDate,
      category: data.category,
      description: data.description,
      amount: roundMoney(data.amount),
      paymentMethod: data.paymentMethod,
      createdAt: nowIso(),
      createdBy: auth.data.username,
    };
    expenses.push(expense);
    return ok(expense);
  },
  async getReports(token, filters) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    members = members.map(refreshMember);
    const paid = payments.filter((p) => p.paymentStatus === "PAID" && inRange(p.paymentDate, filters.fromDate, filters.toDate));
    const dailyMap = new Map<string, number>();
    const monthMap = new Map<string, number>();
    for (const p of paid) {
      dailyMap.set(p.paymentDate, roundMoney((dailyMap.get(p.paymentDate) ?? 0) + p.amount));
      const mk = monthKey(p.paymentDate);
      monthMap.set(mk, roundMoney((monthMap.get(mk) ?? 0) + p.amount));
    }
    const filteredExpenses = expenses.filter((e) => inRange(e.expenseDate, filters.fromDate, filters.toDate));
    const totalIncome = roundMoney(paid.reduce((s, p) => s + p.amount, 0));
    const totalExpenses = roundMoney(filteredExpenses.reduce((s, e) => s + e.amount, 0));
    const data: ReportsData = {
      dailyCollection: [...dailyMap.entries()].sort().map(([date, amount]) => ({ date, amount })),
      monthlyCollection: [...monthMap.entries()].sort().map(([month, amount]) => ({ month, amount })),
      paymentHistory: paid,
      pendingMembers: members.filter((m) => m.pendingAmount > 0),
      expiredMembers: members.filter((m) => m.status === "EXPIRED"),
      activeMembers: members.filter((m) => m.status === "ACTIVE"),
      newRegistrations: members.filter((m) => inRange(m.joinDate, filters.fromDate, filters.toDate)),
      expenses: filteredExpenses,
      totalIncome,
      totalExpenses,
      netIncome: computeNetIncome(totalIncome, totalExpenses),
    };
    return ok(data);
  },
  async getSettings(token) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    return ok({ ...settings });
  },
  async updateSettings(token, data) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    Object.assign(settings, data);
    return ok({ ...settings });
  },
  async changePassword(token, currentPassword, newPassword) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    if (newPassword.length < 8) return err("New password must be at least 8 characters.");
    if (currentPassword !== adminPassword) return err("Current password is incorrect.");
    if (newPassword === currentPassword) return err("New password must be different from the current password.");
    adminPassword = newPassword;
    return ok({ ok: true as const });
  },
  async getEnquiries(token) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    return ok([...enquiries]);
  },
  async submitEnquiry(data: SubmitEnquiryInput) {
    if (!data.fullName?.trim() || !data.mobile?.trim()) {
      return err("Name and mobile are required.");
    }
    const enquiry: Enquiry = {
      enquiryId: nextSequentialId("ENQ", enquiries.map((e) => e.enquiryId)),
      fullName: data.fullName.trim(),
      mobile: data.mobile.trim(),
      email: data.email?.trim() ?? "",
      planId: data.planId ?? "",
      message: data.message ?? "",
      status: "NEW",
      createdAt: nowIso(),
    };
    enquiries.unshift(enquiry);
    return ok(enquiry);
  },
  async getReceipt(token, paymentId) {
    const auth = requireUser(token);
    if (!auth.ok) return auth;
    const payment = payments.find((p) => p.paymentId === paymentId);
    if (!payment) return err("Payment not found.", "INVALID_PAYMENT");
    if (payment.paymentStatus !== "PAID") {
      return err("Mark this payment as Paid (Yes) before generating a receipt.", "NOT_PAID");
    }
    const member = members.find((m) => m.memberId === payment.memberId);
    const previousPending = member ? computePendingAmount(member.totalAmount, member.paidAmount) + payment.amount : 0;
    return buildReceipt(payment, previousPending);
  },
};
