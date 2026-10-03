export type MemberStatus = "ACTIVE" | "EXPIRED" | "SUSPENDED" | "INACTIVE";
export type PaymentMethod = "CASH" | "UPI" | "CARD" | "BANK_TRANSFER";
export type PaymentStatus = "PAID" | "PENDING" | "CANCELLED";
export type AdminRole = "SUPER_ADMIN" | "ADMIN";
export type AdminStatus = "ACTIVE" | "INACTIVE";
export type PlanStatus = "ACTIVE" | "INACTIVE";
export type EnquiryStatus = "NEW" | "CONTACTED" | "CLOSED";

export interface Member {
  memberId: string;
  fullName: string;
  mobile: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  address: string;
  joinDate: string;
  membershipPlanId: string;
  membershipStartDate: string;
  membershipEndDate: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  lastPaymentDate: string;
  status: MemberStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  paymentId: string;
  memberId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference: string;
  paymentStatus: PaymentStatus;
  notes: string;
  createdAt: string;
  createdBy: string;
}

export interface MembershipPlan {
  planId: string;
  planName: string;
  durationDays: number;
  price: number;
  description: string;
  status: PlanStatus;
}

export interface AdminUserPublic {
  adminId: string;
  username: string;
  fullName: string;
  mobile: string;
  role: AdminRole;
  status: AdminStatus;
}

export interface Expense {
  expenseId: string;
  expenseDate: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
  createdBy: string;
}

export interface GymSettings {
  gymName: string;
  gymAddress: string;
  gymMobile: string;
  gymEmail: string;
  currency: string;
  receiptFooter: string;
  timezone: string;
}

export interface AuditLogEntry {
  logId: string;
  timestamp: string;
  username: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
}

export interface Enquiry {
  enquiryId: string;
  fullName: string;
  mobile: string;
  email: string;
  planId: string;
  message: string;
  status: EnquiryStatus;
  createdAt: string;
}

export interface SessionUser {
  adminId: string;
  username: string;
  fullName: string;
  role: AdminRole;
}

export interface AuthSession {
  token: string;
  user: SessionUser;
}

export interface DashboardData {
  totalMembers: number;
  activeMembers: number;
  expiredMembers: number;
  pendingAmount: number;
  todayCollection: number;
  monthCollection: number;
  totalExpenses: number;
  netIncome: number;
  expiredCount: number;
  expiresToday: number;
  expiresIn7Days: number;
  expiresIn30Days: number;
  recentPayments: Payment[];
  recentMembers: Member[];
  expiringSoon: Member[];
  pendingPayments: Member[];
}

export interface ReportFilters {
  fromDate?: string;
  toDate?: string;
}

export interface ReportsData {
  dailyCollection: { date: string; amount: number }[];
  monthlyCollection: { month: string; amount: number }[];
  paymentHistory: Payment[];
  pendingMembers: Member[];
  expiredMembers: Member[];
  activeMembers: Member[];
  newRegistrations: Member[];
  expenses: Expense[];
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
}

export interface CreateMemberInput {
  fullName: string;
  mobile: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  joinDate: string;
  membershipPlanId: string;
  membershipStartDate: string;
  membershipEndDate?: string;
  totalAmount?: number;
  initialPayment?: number;
  paymentMethod?: PaymentMethod;
  transactionReference?: string;
  notes?: string;
}

export interface UpdateMemberInput {
  memberId: string;
  fullName?: string;
  mobile?: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  joinDate?: string;
  membershipPlanId?: string;
  membershipStartDate?: string;
  membershipEndDate?: string;
  totalAmount?: number;
  notes?: string;
  status?: MemberStatus;
}

export interface UpdateMemberFinanceInput {
  memberId: string;
  totalAmount: number;
  paidAmount: number;
}

export interface CreatePaymentInput {
  memberId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  notes?: string;
}

export interface CreatePlanInput {
  planName: string;
  durationDays: number;
  price: number;
  description?: string;
  status?: PlanStatus;
}

export interface UpdatePlanInput extends CreatePlanInput {
  planId: string;
}

export interface CreateExpenseInput {
  expenseDate: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
}

export interface SubmitEnquiryInput {
  fullName: string;
  mobile: string;
  email?: string;
  planId?: string;
  message?: string;
}

export interface ReceiptData {
  gym: GymSettings;
  payment: Payment;
  member: Member;
  planName: string;
  previousPending: number;
  currentPending: number;
  outstandingAmount: number;
}

export interface ApiOk<T> {
  ok: true;
  data: T;
}

export interface ApiErr {
  ok: false;
  error: string;
  code?: string;
}

export type ApiResult<T> = ApiOk<T> | ApiErr;

export interface GymApi {
  login(username: string, password: string): Promise<ApiResult<AuthSession>>;
  getDashboard(token: string): Promise<ApiResult<DashboardData>>;
  getMembers(token: string): Promise<ApiResult<Member[]>>;
  getMember(token: string, memberId: string): Promise<ApiResult<Member>>;
  createMember(token: string, data: CreateMemberInput): Promise<ApiResult<Member>>;
  updateMember(token: string, data: UpdateMemberInput): Promise<ApiResult<Member>>;
  updateMemberFinance(
    token: string,
    data: UpdateMemberFinanceInput,
  ): Promise<ApiResult<{ member: Member; receipt: ReceiptData }>>;
  deactivateMember(token: string, memberId: string): Promise<ApiResult<Member>>;
  getPayments(token: string): Promise<ApiResult<Payment[]>>;
  createPayment(token: string, data: CreatePaymentInput): Promise<ApiResult<Payment>>;
  confirmPaymentPaid(token: string, paymentId: string): Promise<ApiResult<{ payment: Payment; receipt: ReceiptData }>>;
  markPaymentUnpaid(token: string, paymentId: string): Promise<ApiResult<Payment>>;
  cancelPayment(token: string, paymentId: string): Promise<ApiResult<Payment>>;
  getPlans(token?: string): Promise<ApiResult<MembershipPlan[]>>;
  createPlan(token: string, data: CreatePlanInput): Promise<ApiResult<MembershipPlan>>;
  updatePlan(token: string, data: UpdatePlanInput): Promise<ApiResult<MembershipPlan>>;
  getExpenses(token: string): Promise<ApiResult<Expense[]>>;
  createExpense(token: string, data: CreateExpenseInput): Promise<ApiResult<Expense>>;
  getReports(token: string, filters: ReportFilters): Promise<ApiResult<ReportsData>>;
  getSettings(token: string): Promise<ApiResult<GymSettings>>;
  updateSettings(token: string, data: GymSettings): Promise<ApiResult<GymSettings>>;
  changePassword(
    token: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<ApiResult<{ ok: true }>>;
  getEnquiries(token: string): Promise<ApiResult<Enquiry[]>>;
  submitEnquiry(data: SubmitEnquiryInput): Promise<ApiResult<Enquiry>>;
  getReceipt(token: string, paymentId: string): Promise<ApiResult<ReceiptData>>;
}
