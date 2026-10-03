/**
 * Gym Management — Google Apps Script Web App API
 *
 * Security model:
 * - This script runs as YOU and is the only process that reads/writes the private Google Sheet.
 * - The public website never receives a Google password, API key, or service-account JSON.
 * - The frontend calls this /exec URL with JSON actions. Auth uses signed session tokens.
 *
 * Prototype limitation:
 * - Password hashing here is SHA-256 + salt (not bcrypt/argon2).
 * - Deployed as "Anyone" can *call* the web app, but they cannot read the Sheet.
 * - Keep the Google Sheet sharing private (only your Google account).
 */

var SHEETS = {
  Members: "Members",
  Payments: "Payments",
  Plans: "MembershipPlans",
  Admins: "AdminUsers",
  Expenses: "Expenses",
  Settings: "Settings",
  Audit: "AuditLog",
  Enquiries: "Enquiries",
};

var HEADERS = {
  Members: [
    "memberId", "fullName", "mobile", "email", "gender", "dateOfBirth", "address",
    "joinDate", "membershipPlanId", "membershipStartDate", "membershipEndDate",
    "totalAmount", "paidAmount", "pendingAmount", "lastPaymentDate", "status",
    "notes", "createdAt", "updatedAt",
  ],
  Payments: [
    "paymentId", "memberId", "paymentDate", "amount", "paymentMethod",
    "transactionReference", "paymentStatus", "notes", "createdAt", "createdBy",
  ],
  Plans: ["planId", "planName", "durationDays", "price", "description", "status"],
  Admins: ["adminId", "username", "passwordHash", "fullName", "mobile", "role", "status", "createdAt"],
  Expenses: ["expenseId", "expenseDate", "category", "description", "amount", "paymentMethod", "createdAt", "createdBy"],
  Settings: ["gymName", "gymAddress", "gymMobile", "gymEmail", "currency", "receiptFooter", "timezone"],
  Audit: ["logId", "timestamp", "username", "action", "entity", "entityId", "details"],
  Enquiries: ["enquiryId", "fullName", "mobile", "email", "planId", "message", "status", "createdAt"],
};

function doGet() {
  return json_({ ok: true, service: "gym-management", version: "1.0.0" });
}

function doPost(e) {
  try {
    var body = parseBody_(e);
    var result = dispatch_(body);
    return json_(result);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err), code: "APPS_SCRIPT" });
  }
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Empty request body.");
  }
  return JSON.parse(e.postData.contents);
}

function dispatch_(body) {
  var action = String(body.action || "");
  var data = body.data || {};
  var token = String(body.token || "");
  var publicActions = { login: 1, submitEnquiry: 1, getPlans: 1 };

  if (!action) return fail_("Missing action.");
  if (!publicActions[action]) {
    var session = verifyToken_(token);
    if (!session) return fail_("Unauthorized. Please log in again.", "UNAUTHORIZED");
    data.__user = session;
  }

  switch (action) {
    case "login": return actionLogin_(data);
    case "getDashboard": return actionDashboard_();
    case "getMembers": return ok_(readObjects_(SHEETS.Members));
    case "getMember": return actionGetMember_(data);
    case "createMember": return actionCreateMember_(data);
    case "updateMember": return actionUpdateMember_(data);
    case "updateMemberFinance": return actionUpdateMemberFinance_(data);
    case "deactivateMember": return actionDeactivateMember_(data);
    case "getPayments": return ok_(readObjects_(SHEETS.Payments));
    case "createPayment": return actionCreatePayment_(data);
    case "confirmPaymentPaid": return actionConfirmPaymentPaid_(data);
    case "markPaymentUnpaid": return actionMarkPaymentUnpaid_(data);
    case "cancelPayment": return actionCancelPayment_(data);
    case "getPlans": return ok_(readObjects_(SHEETS.Plans));
    case "createPlan": return actionCreatePlan_(data);
    case "updatePlan": return actionUpdatePlan_(data);
    case "getExpenses": return ok_(readObjects_(SHEETS.Expenses));
    case "createExpense": return actionCreateExpense_(data);
    case "getReports": return actionReports_(data);
    case "getSettings": return ok_(getSettings_());
    case "updateSettings": return actionUpdateSettings_(data);
    case "changePassword": return actionChangePassword_(data);
    case "getEnquiries": return ok_(readObjects_(SHEETS.Enquiries));
    case "submitEnquiry": return actionSubmitEnquiry_(data);
    case "getReceipt": return actionGetReceipt_(data);
    default: return fail_("Unknown action.");
  }
}

/** Run once from the Apps Script editor to create tabs + headers. */
function setupGymWorkbook() {
  var ss = SpreadsheetApp.getActive();
  ensureSheet_(ss, SHEETS.Members, HEADERS.Members);
  ensureSheet_(ss, SHEETS.Payments, HEADERS.Payments);
  ensureSheet_(ss, SHEETS.Plans, HEADERS.Plans);
  ensureSheet_(ss, SHEETS.Admins, HEADERS.Admins);
  ensureSheet_(ss, SHEETS.Expenses, HEADERS.Expenses);
  ensureSheet_(ss, SHEETS.Settings, HEADERS.Settings);
  ensureSheet_(ss, SHEETS.Audit, HEADERS.Audit);
  ensureSheet_(ss, SHEETS.Enquiries, HEADERS.Enquiries);
  ensureSecrets_();
  ensureDefaultSettings_();
  return "Workbook ready.";
}

/**
 * Run this in the Apps Script editor to change the admin login.
 * Type the new password only here, Run, then change the line back
 * so the real password is not left in the script.
 */
function setAdminPassword() {
  var username = "admin";
  var newPassword = "TYPE_YOUR_NEW_PASSWORD_HERE";
  if (!newPassword || newPassword === "TYPE_YOUR_NEW_PASSWORD_HERE") {
    throw new Error("Set newPassword first, then Run again.");
  }
  ensureSecrets_();
  var hash = hashPassword_(newPassword);
  var admins = readObjects_(SHEETS.Admins);
  var found = false;
  for (var i = 0; i < admins.length; i++) {
    if (String(admins[i].username).toLowerCase() === username) {
      admins[i].passwordHash = hash;
      admins[i].status = "ACTIVE";
      found = true;
      break;
    }
  }
  if (!found) {
    appendObject_(SHEETS.Admins, {
      adminId: "ADM001",
      username: username,
      passwordHash: hash,
      fullName: "Gym Admin",
      mobile: "",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      createdAt: now_(),
    });
  } else {
    writeAllObjects_(SHEETS.Admins, admins);
  }
  return "Password updated for user: " + username + ". Website pe naya password se login karo.";
}

/** DEMO ONLY. Delete before production with clearDemoData(). */
function seedDemoData() {
  setupGymWorkbook();
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (readObjects_(SHEETS.Admins).length === 0) {
      appendObject_(SHEETS.Admins, {
        adminId: "ADM001",
        username: "admin",
        passwordHash: hashPassword_("Admin@123"),
        fullName: "Demo Super Admin",
        mobile: "9999900001",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        createdAt: now_(),
      });
    }
    if (readObjects_(SHEETS.Plans).length === 0) {
      appendObject_(SHEETS.Plans, { planId: "PLAN001", planName: "Monthly", durationDays: 30, price: 1500, description: "30-day access", status: "ACTIVE" });
      appendObject_(SHEETS.Plans, { planId: "PLAN002", planName: "Quarterly", durationDays: 90, price: 4000, description: "90-day access", status: "ACTIVE" });
      appendObject_(SHEETS.Plans, { planId: "PLAN003", planName: "Half-Yearly", durationDays: 180, price: 7500, description: "180-day access", status: "ACTIVE" });
      appendObject_(SHEETS.Plans, { planId: "PLAN004", planName: "Yearly", durationDays: 365, price: 12000, description: "365-day access", status: "ACTIVE" });
    }
    if (readObjects_(SHEETS.Members).length === 0) {
      var today = todayIso_();
      var names = [
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
      ];
      var plans = readObjects_(SHEETS.Plans);
      for (var i = 0; i < names.length; i++) {
        var plan = plans[i % plans.length];
        var start = addDaysIso_(today, -20 + i * 3);
        appendObject_(SHEETS.Members, {
          memberId: "GYM" + pad_(i + 1, 3),
          fullName: names[i][0],
          mobile: names[i][1],
          email: names[i][2],
          gender: names[i][3],
          dateOfBirth: "199" + (i % 10) + "-01-15",
          address: (10 + i) + " Demo Lane, Pune",
          joinDate: start,
          membershipPlanId: plan.planId,
          membershipStartDate: start,
          membershipEndDate: addDaysIso_(start, Number(plan.durationDays)),
          totalAmount: Number(plan.price),
          paidAmount: 0,
          pendingAmount: Number(plan.price),
          lastPaymentDate: "",
          status: "ACTIVE",
          notes: "DEMO_DATA",
          createdAt: now_(),
          updatedAt: now_(),
        });
      }
      var pays = [
        ["PAY001", "GYM001", addDaysIso_(today, -10), 1500, "UPI", "UPI-DEMO-1"],
        ["PAY002", "GYM002", addDaysIso_(today, -8), 2000, "CASH", ""],
        ["PAY003", "GYM004", addDaysIso_(today, -5), 4000, "CARD", "CARD-DEMO-3"],
        ["PAY004", "GYM007", addDaysIso_(today, -2), 5000, "BANK_TRANSFER", "NEFT-DEMO-4"],
        ["PAY005", "GYM010", today, 1500, "UPI", "UPI-DEMO-5"],
      ];
      for (var p = 0; p < pays.length; p++) {
        appendObject_(SHEETS.Payments, {
          paymentId: pays[p][0],
          memberId: pays[p][1],
          paymentDate: pays[p][2],
          amount: pays[p][3],
          paymentMethod: pays[p][4],
          transactionReference: pays[p][5],
          paymentStatus: "PAID",
          notes: "DEMO_DATA",
          createdAt: now_(),
          createdBy: "admin",
        });
        recalcMember_(pays[p][1]);
      }
      appendObject_(SHEETS.Expenses, { expenseId: "EXP001", expenseDate: addDaysIso_(today, -12), category: "Rent", description: "Demo hall rent", amount: 8000, paymentMethod: "BANK_TRANSFER", createdAt: now_(), createdBy: "admin" });
      appendObject_(SHEETS.Expenses, { expenseId: "EXP002", expenseDate: addDaysIso_(today, -3), category: "Supplies", description: "Demo cleaning supplies", amount: 1200, paymentMethod: "CASH", createdAt: now_(), createdBy: "admin" });
    }
    audit_("system", "SEED_DEMO", "Workbook", "", "Demo rows inserted");
    return "Demo data ready. Login: admin / Admin@123 (change before production).";
  } finally {
    lock.releaseLock();
  }
}

function clearDemoData() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    clearIfDemo_(SHEETS.Members, "notes");
    clearIfDemo_(SHEETS.Payments, "notes");
    clearIfDemo_(SHEETS.Expenses, "description");
    audit_("system", "CLEAR_DEMO", "Workbook", "", "Rows tagged DEMO_DATA removed");
    return "Demo rows removed.";
  } finally {
    lock.releaseLock();
  }
}

function clearIfDemo_(sheetName, field) {
  var rows = readObjects_(sheetName);
  var keep = rows.filter(function (row) {
    return String(row[field] || "").indexOf("DEMO_DATA") === -1;
  });
  writeAllObjects_(sheetName, keep);
}

function actionLogin_(data) {
  var username = String(data.username || "").trim().toLowerCase();
  var password = String(data.password || "");
  if (!username || !password) return fail_("Invalid username or password.", "INVALID_LOGIN");
  var admins = readObjects_(SHEETS.Admins);
  var admin = null;
  for (var i = 0; i < admins.length; i++) {
    if (String(admins[i].username).toLowerCase() === username && String(admins[i].status) === "ACTIVE") {
      admin = admins[i];
      break;
    }
  }
  if (!admin || admin.passwordHash !== hashPassword_(password)) {
    audit_(username || "unknown", "LOGIN_FAILED", "AdminUsers", "", "Invalid credentials");
    return fail_("Invalid username or password.", "INVALID_LOGIN");
  }
  var session = {
    adminId: admin.adminId,
    username: admin.username,
    fullName: admin.fullName,
    role: admin.role,
    exp: Date.now() + 12 * 60 * 60 * 1000,
  };
  audit_(admin.username, "LOGIN", "AdminUsers", admin.adminId, "Admin login");
  return ok_({ token: signToken_(session), user: { adminId: admin.adminId, username: admin.username, fullName: admin.fullName, role: admin.role } });
}

function actionGetMember_(data) {
  var member = findById_(SHEETS.Members, "memberId", data.memberId);
  if (!member) return fail_("Member not found.", "MISSING_MEMBER");
  return ok_(recalcMember_(member.memberId));
}

function actionCreateMember_(data) {
  var user = data.__user;
  if (!String(data.fullName || "").trim() || !String(data.mobile || "").trim()) {
    return fail_("Name and mobile are required.");
  }
  var plan = findById_(SHEETS.Plans, "planId", data.membershipPlanId);
  if (!plan || String(plan.status) !== "ACTIVE") return fail_("Select a valid membership plan.");
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var start = String(data.membershipStartDate || data.joinDate || todayIso_());
    if (!isIsoDate_(start) || !isIsoDate_(String(data.joinDate || start))) return fail_("Invalid date.", "INVALID_DATE");
    var end = String(data.membershipEndDate || addDaysIso_(start, Number(plan.durationDays)));
    var total = round_(data.totalAmount != null && data.totalAmount !== "" ? Number(data.totalAmount) : Number(plan.price));
    var memberId = nextId_(SHEETS.Members, "memberId", "GYM");
    var member = {
      memberId: memberId,
      fullName: String(data.fullName).trim(),
      mobile: String(data.mobile).trim(),
      email: String(data.email || ""),
      gender: String(data.gender || ""),
      dateOfBirth: String(data.dateOfBirth || ""),
      address: String(data.address || ""),
      joinDate: String(data.joinDate || start),
      membershipPlanId: plan.planId,
      membershipStartDate: start,
      membershipEndDate: end,
      totalAmount: total,
      paidAmount: 0,
      pendingAmount: total,
      lastPaymentDate: "",
      status: "ACTIVE",
      notes: String(data.notes || ""),
      createdAt: now_(),
      updatedAt: now_(),
    };
    appendObject_(SHEETS.Members, member);
    var initial = round_(Number(data.initialPayment || 0));
    if (initial > 0) {
      var payResult = createPaymentUnlocked_({
        memberId: memberId,
        paymentDate: member.joinDate,
        amount: initial,
        paymentMethod: data.paymentMethod || "CASH",
        transactionReference: data.transactionReference || "",
        notes: "Initial payment",
        __user: user,
      });
      if (!payResult.ok) return payResult;
    }
    member = recalcMember_(memberId);
    audit_(user.username, "MEMBER_CREATED", "Members", memberId, member.fullName);
    return ok_(member);
  } finally {
    lock.releaseLock();
  }
}

function actionUpdateMember_(data) {
  var member = findById_(SHEETS.Members, "memberId", data.memberId);
  if (!member) return fail_("Member not found.", "MISSING_MEMBER");
  var fields = ["fullName", "mobile", "email", "gender", "dateOfBirth", "address", "joinDate", "membershipPlanId", "membershipStartDate", "membershipEndDate", "notes", "status"];
  for (var i = 0; i < fields.length; i++) {
    if (data[fields[i]] != null) member[fields[i]] = data[fields[i]];
  }
  if (data.totalAmount != null) member.totalAmount = round_(Number(data.totalAmount));
  if (String(member.status) === "ACTIVE") {
    var today = todayIso_();
    if (!member.membershipEndDate || daysUntil_(member.membershipEndDate, today) < 0) {
      var plan = findById_(SHEETS.Plans, "planId", member.membershipPlanId);
      var days = plan ? Number(plan.durationDays) : 30;
      if (!days) days = 30;
      member.membershipStartDate = today;
      member.membershipEndDate = addDaysIso_(today, days);
    }
  }
  writeById_(SHEETS.Members, "memberId", member.memberId, member);
  member = recalcMember_(member.memberId);
  audit_(data.__user.username, "MEMBER_UPDATED", "Members", member.memberId, member.fullName + " " + member.status);
  return ok_(member);
}

function actionUpdateMemberFinance_(data) {
  var total = round_(Number(data.totalAmount));
  var addAmount = round_(Number(data.addAmount || 0));
  if (!isFinite(total) || total < 0) return fail_("Total amount cannot be negative.", "INVALID_AMOUNT");
  if (!isFinite(addAmount) || addAmount < 0) return fail_("Payment amount cannot be negative.", "NEGATIVE_AMOUNT");
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var member = findById_(SHEETS.Members, "memberId", data.memberId);
    if (!member) return fail_("Member not found.", "MISSING_MEMBER");
    member.totalAmount = total;
    writeById_(SHEETS.Members, "memberId", member.memberId, member);
    member = recalcMember_(member.memberId);
    var previousPending = Number(member.pendingAmount);
    var payment = null;
    if (addAmount > 0) {
      if (addAmount > previousPending) return fail_("Payment cannot be greater than the pending amount.", "EXCEEDS_PENDING");
      payment = {
        paymentId: nextId_(SHEETS.Payments, "paymentId", "PAY"),
        memberId: member.memberId,
        paymentDate: todayIso_(),
        amount: addAmount,
        paymentMethod: "CASH",
        transactionReference: "",
        paymentStatus: "PAID",
        notes: "Admin payment",
        createdAt: now_(),
        createdBy: data.__user.username,
      };
      appendObject_(SHEETS.Payments, payment);
      member = recalcMember_(member.memberId);
    } else {
      var paidList = readObjects_(SHEETS.Payments).filter(function (p) {
        return p.memberId === member.memberId && String(p.paymentStatus) === "PAID";
      }).sort(function (a, b) {
        return String(b.createdAt).localeCompare(String(a.createdAt));
      });
      payment = paidList.length ? paidList[0] : {
        paymentId: "BAL-" + member.memberId,
        memberId: member.memberId,
        paymentDate: todayIso_(),
        amount: 0,
        paymentMethod: "CASH",
        transactionReference: "",
        paymentStatus: "PAID",
        notes: "Balance statement",
        createdAt: now_(),
        createdBy: data.__user.username,
      };
    }
    audit_(data.__user.username, "MEMBER_FINANCE", "Members", member.memberId, "Add " + addAmount);
    return ok_({
      member: member,
      receipt: buildReceipt_(payment, member, previousPending),
    });
  } finally {
    lock.releaseLock();
  }
}

function actionDeactivateMember_(data) {
  var member = findById_(SHEETS.Members, "memberId", data.memberId);
  if (!member) return fail_("Member not found.", "MISSING_MEMBER");
  member.status = "INACTIVE";
  member.updatedAt = now_();
  writeById_(SHEETS.Members, "memberId", member.memberId, member);
  audit_(data.__user.username, "MEMBER_DEACTIVATED", "Members", member.memberId, member.fullName);
  return ok_(member);
}

function actionCreatePayment_(data) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return createPaymentUnlocked_(data);
  } finally {
    lock.releaseLock();
  }
}

function createPaymentUnlocked_(data) {
  var member = findById_(SHEETS.Members, "memberId", data.memberId);
  if (!member) return fail_("Invalid member ID.", "INVALID_MEMBER");
  if (!isIsoDate_(String(data.paymentDate || ""))) return fail_("Invalid payment date.", "INVALID_DATE");
  member = recalcMember_(member.memberId);
  var amount = Number(data.amount);
  if (!isFinite(amount)) return fail_("Enter a valid payment amount.", "INVALID_AMOUNT");
  if (amount < 0) return fail_("Payment amount cannot be negative.", "NEGATIVE_AMOUNT");
  if (amount === 0) return fail_("Payment amount must be greater than zero.", "ZERO_AMOUNT");
  amount = round_(amount);
  var pending = Number(member.pendingAmount);
  if (amount > pending) return fail_("Payment cannot be greater than the pending amount.", "EXCEEDS_PENDING");
  var paymentId = nextId_(SHEETS.Payments, "paymentId", "PAY");
  var existing = findById_(SHEETS.Payments, "paymentId", paymentId);
  if (existing) return fail_("Duplicate payment ID.", "DUPLICATE_PAYMENT");
  var payment = {
    paymentId: paymentId,
    memberId: member.memberId,
    paymentDate: String(data.paymentDate),
    amount: amount,
    paymentMethod: String(data.paymentMethod || "CASH"),
    transactionReference: String(data.transactionReference || ""),
    paymentStatus: "PENDING",
    notes: String(data.notes || ""),
    createdAt: now_(),
    createdBy: data.__user.username,
  };
  appendObject_(SHEETS.Payments, payment);
  member = recalcMember_(member.memberId);
  audit_(data.__user.username, "PAYMENT_ADDED", "Payments", paymentId, member.memberId + " PENDING " + amount);
  return ok_(payment);
}

function actionConfirmPaymentPaid_(data) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var payment = findById_(SHEETS.Payments, "paymentId", data.paymentId);
    if (!payment) return fail_("Payment not found.", "INVALID_PAYMENT");
    if (String(payment.paymentStatus) === "PAID") return fail_("Payment is already marked paid.");
    if (String(payment.paymentStatus) === "CANCELLED") return fail_("Cancelled payments cannot be marked paid.");
    var member = recalcMember_(payment.memberId);
    if (!member) return fail_("Member not found.", "MISSING_MEMBER");
    var amount = round_(Number(payment.amount));
    var pending = Number(member.pendingAmount);
    if (amount > pending) return fail_("Payment cannot be greater than the pending amount.", "EXCEEDS_PENDING");
    var previousPending = pending;
    payment.paymentStatus = "PAID";
    writeById_(SHEETS.Payments, "paymentId", payment.paymentId, payment);
    member = recalcMember_(payment.memberId);
    audit_(data.__user.username, "PAYMENT_PAID", "Payments", payment.paymentId, "Admin confirmed paid");
    return ok_({
      payment: payment,
      receipt: buildReceipt_(payment, member, previousPending),
    });
  } finally {
    lock.releaseLock();
  }
}

function actionMarkPaymentUnpaid_(data) {
  var payment = findById_(SHEETS.Payments, "paymentId", data.paymentId);
  if (!payment) return fail_("Payment not found.", "INVALID_PAYMENT");
  if (String(payment.paymentStatus) !== "PAID") return fail_("Only a paid payment can be marked not paid.");
  payment.paymentStatus = "PENDING";
  writeById_(SHEETS.Payments, "paymentId", payment.paymentId, payment);
  recalcMember_(payment.memberId);
  audit_(data.__user.username, "PAYMENT_UNPAID", "Payments", payment.paymentId, "Admin marked not paid");
  return ok_(payment);
}

function actionCancelPayment_(data) {
  var payment = findById_(SHEETS.Payments, "paymentId", data.paymentId);
  if (!payment) return fail_("Payment not found.", "INVALID_PAYMENT");
  if (String(payment.paymentStatus) === "CANCELLED") return fail_("Payment is already cancelled.");
  payment.paymentStatus = "CANCELLED";
  writeById_(SHEETS.Payments, "paymentId", payment.paymentId, payment);
  recalcMember_(payment.memberId);
  audit_(data.__user.username, "PAYMENT_CANCELLED", "Payments", payment.paymentId, "Reversal; history kept");
  return ok_(payment);
}

function actionCreatePlan_(data) {
  var plan = {
    planId: nextId_(SHEETS.Plans, "planId", "PLAN"),
    planName: String(data.planName || "").trim(),
    durationDays: Number(data.durationDays),
    price: round_(Number(data.price)),
    description: String(data.description || ""),
    status: data.status || "ACTIVE",
  };
  if (!plan.planName || !plan.durationDays || plan.price < 0) return fail_("Invalid plan details.");
  appendObject_(SHEETS.Plans, plan);
  audit_(data.__user.username, "PLAN_CREATED", "MembershipPlans", plan.planId, plan.planName);
  return ok_(plan);
}

function actionUpdatePlan_(data) {
  var plan = findById_(SHEETS.Plans, "planId", data.planId);
  if (!plan) return fail_("Plan not found.");
  plan.planName = String(data.planName || plan.planName);
  plan.durationDays = Number(data.durationDays);
  plan.price = round_(Number(data.price));
  plan.description = String(data.description || "");
  plan.status = data.status || plan.status;
  writeById_(SHEETS.Plans, "planId", plan.planId, plan);
  audit_(data.__user.username, "PLAN_UPDATED", "MembershipPlans", plan.planId, plan.planName);
  return ok_(plan);
}

function actionCreateExpense_(data) {
  var amount = Number(data.amount);
  if (!isFinite(amount) || amount <= 0) return fail_("Expense amount must be greater than zero.");
  if (!isIsoDate_(String(data.expenseDate || ""))) return fail_("Invalid date.", "INVALID_DATE");
  var expense = {
    expenseId: nextId_(SHEETS.Expenses, "expenseId", "EXP"),
    expenseDate: String(data.expenseDate),
    category: String(data.category || "Other"),
    description: String(data.description || ""),
    amount: round_(amount),
    paymentMethod: String(data.paymentMethod || "CASH"),
    createdAt: now_(),
    createdBy: data.__user.username,
  };
  appendObject_(SHEETS.Expenses, expense);
  audit_(data.__user.username, "EXPENSE_ADDED", "Expenses", expense.expenseId, expense.category);
  return ok_(expense);
}

function actionUpdateSettings_(data) {
  var settings = {
    gymName: String(data.gymName || ""),
    gymAddress: String(data.gymAddress || ""),
    gymMobile: String(data.gymMobile || ""),
    gymEmail: String(data.gymEmail || ""),
    currency: String(data.currency || "INR"),
    receiptFooter: String(data.receiptFooter || ""),
    timezone: String(data.timezone || "Asia/Kolkata"),
  };
  writeAllObjects_(SHEETS.Settings, [settings]);
  audit_(data.__user.username, "SETTINGS_UPDATED", "Settings", "", settings.gymName);
  return ok_(settings);
}

function actionChangePassword_(data) {
  var currentPassword = String(data.currentPassword || "");
  var newPassword = String(data.newPassword || "");
  if (newPassword.length < 8) return fail_("New password must be at least 8 characters.");
  if (newPassword === currentPassword) return fail_("New password must be different from the current password.");
  var username = String(data.__user.username || "").toLowerCase();
  var admins = readObjects_(SHEETS.Admins);
  var admin = null;
  for (var i = 0; i < admins.length; i++) {
    if (String(admins[i].username).toLowerCase() === username) {
      admin = admins[i];
      break;
    }
  }
  if (!admin || String(admin.status) !== "ACTIVE") return fail_("Admin account not found.");
  if (admin.passwordHash !== hashPassword_(currentPassword)) {
    return fail_("Current password is incorrect.");
  }
  admin.passwordHash = hashPassword_(newPassword);
  writeById_(SHEETS.Admins, "adminId", admin.adminId, admin);
  audit_(admin.username, "PASSWORD_CHANGED", "AdminUsers", admin.adminId, "Password updated from website");
  return ok_({ ok: true });
}

function actionSubmitEnquiry_(data) {
  if (!String(data.fullName || "").trim() || !String(data.mobile || "").trim()) {
    return fail_("Name and mobile are required.");
  }
  var enquiry = {
    enquiryId: nextId_(SHEETS.Enquiries, "enquiryId", "ENQ"),
    fullName: String(data.fullName).trim(),
    mobile: String(data.mobile).trim(),
    email: String(data.email || ""),
    planId: String(data.planId || ""),
    message: String(data.message || ""),
    status: "NEW",
    createdAt: now_(),
  };
  appendObject_(SHEETS.Enquiries, enquiry);
  audit_("public", "ENQUIRY_SUBMITTED", "Enquiries", enquiry.enquiryId, enquiry.fullName);
  return ok_(enquiry);
}

function actionGetReceipt_(data) {
  var payment = findById_(SHEETS.Payments, "paymentId", data.paymentId);
  if (!payment) return fail_("Payment not found.", "INVALID_PAYMENT");
  if (String(payment.paymentStatus) !== "PAID") {
    return fail_("Mark this payment as Paid (Yes) before generating a receipt.", "NOT_PAID");
  }
  var member = findById_(SHEETS.Members, "memberId", payment.memberId);
  if (!member) return fail_("Member not found.", "MISSING_MEMBER");
  member = recalcMember_(member.memberId);
  var previousPending = round_(Number(member.pendingAmount) + Number(payment.amount));
  return ok_(buildReceipt_(payment, member, previousPending));
}

function actionDashboard_() {
  var members = readObjects_(SHEETS.Members).map(function (m) { return hydrateMember_(m); });
  var payments = readObjects_(SHEETS.Payments);
  var expenses = readObjects_(SHEETS.Expenses);
  var today = todayIso_();
  var month = today.slice(0, 7);
  var paid = payments.filter(function (p) { return String(p.paymentStatus) === "PAID"; });
  var todayCollection = sum_(paid.filter(function (p) { return p.paymentDate === today; }), "amount");
  var monthCollection = sum_(paid.filter(function (p) { return String(p.paymentDate).slice(0, 7) === month; }), "amount");
  var totalExpenses = sum_(expenses, "amount");
  var totalIncome = sum_(paid, "amount");
  var buckets = { expired: 0, today: 0, d7: 0, d30: 0 };
  members.forEach(function (m) {
    if (m.status === "INACTIVE" || m.status === "SUSPENDED") return;
    var b = expiryBucket_(m.membershipEndDate, today);
    if (b === "EXPIRED") buckets.expired++;
    if (b === "TODAY") buckets.today++;
    if (b === "D7") buckets.d7++;
    if (b === "D30") buckets.d30++;
  });
  paid.sort(function (a, b) { return String(b.paymentDate).localeCompare(String(a.paymentDate)); });
  members.sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
  return ok_({
    totalMembers: members.length,
    activeMembers: members.filter(function (m) { return m.status === "ACTIVE"; }).length,
    expiredMembers: members.filter(function (m) { return m.status === "EXPIRED"; }).length,
    pendingAmount: round_(members.reduce(function (s, m) { return s + Number(m.pendingAmount || 0); }, 0)),
    todayCollection: todayCollection,
    monthCollection: monthCollection,
    totalExpenses: totalExpenses,
    netIncome: round_(totalIncome - totalExpenses),
    expiredCount: buckets.expired,
    expiresToday: buckets.today,
    expiresIn7Days: buckets.d7,
    expiresIn30Days: buckets.d30,
    recentPayments: paid.slice(0, 6),
    recentMembers: members.slice(0, 6),
    expiringSoon: members.filter(function (m) {
      var b = expiryBucket_(m.membershipEndDate, today);
      return m.status !== "INACTIVE" && (b === "TODAY" || b === "D7" || b === "D30" || b === "EXPIRED");
    }).slice(0, 8),
    pendingPayments: members.filter(function (m) { return Number(m.pendingAmount) > 0 && m.status !== "INACTIVE"; }).slice(0, 8),
  });
}

function actionReports_(data) {
  var fromDate = data.fromDate || "";
  var toDate = data.toDate || "";
  var members = readObjects_(SHEETS.Members).map(function (m) { return hydrateMember_(m); });
  var payments = readObjects_(SHEETS.Payments).filter(function (p) {
    return String(p.paymentStatus) === "PAID" && inRange_(p.paymentDate, fromDate, toDate);
  });
  var expenses = readObjects_(SHEETS.Expenses).filter(function (e) { return inRange_(e.expenseDate, fromDate, toDate); });
  var daily = {};
  var monthly = {};
  payments.forEach(function (p) {
    daily[p.paymentDate] = round_((daily[p.paymentDate] || 0) + Number(p.amount));
    var mk = String(p.paymentDate).slice(0, 7);
    monthly[mk] = round_((monthly[mk] || 0) + Number(p.amount));
  });
  var totalIncome = sum_(payments, "amount");
  var totalExpenses = sum_(expenses, "amount");
  return ok_({
    dailyCollection: Object.keys(daily).sort().map(function (d) { return { date: d, amount: daily[d] }; }),
    monthlyCollection: Object.keys(monthly).sort().map(function (m) { return { month: m, amount: monthly[m] }; }),
    paymentHistory: payments,
    pendingMembers: members.filter(function (m) { return Number(m.pendingAmount) > 0; }),
    expiredMembers: members.filter(function (m) { return m.status === "EXPIRED"; }),
    activeMembers: members.filter(function (m) { return m.status === "ACTIVE"; }),
    newRegistrations: members.filter(function (m) { return inRange_(m.joinDate, fromDate, toDate); }),
    expenses: expenses,
    totalIncome: totalIncome,
    totalExpenses: totalExpenses,
    netIncome: round_(totalIncome - totalExpenses),
  });
}

function buildReceipt_(payment, member, previousPending) {
  var plan = findById_(SHEETS.Plans, "planId", member.membershipPlanId);
  return {
    gym: getSettings_(),
    payment: payment,
    member: member,
    planName: plan ? plan.planName : "",
    previousPending: round_(previousPending),
    currentPending: round_(Number(member.pendingAmount)),
    outstandingAmount: round_(Number(member.pendingAmount)),
  };
}

function recalcMember_(memberId) {
  var member = findById_(SHEETS.Members, "memberId", memberId);
  if (!member) return null;
  member = hydrateMember_(member);
  writeById_(SHEETS.Members, "memberId", memberId, member);
  return member;
}

function hydrateMember_(member) {
  var pays = readObjects_(SHEETS.Payments).filter(function (p) {
    return p.memberId === member.memberId && String(p.paymentStatus) === "PAID";
  });
  var paid = round_(pays.reduce(function (s, p) { return s + Number(p.amount || 0); }, 0));
  pays.sort(function (a, b) { return String(a.paymentDate).localeCompare(String(b.paymentDate)); });
  member.totalAmount = round_(Number(member.totalAmount || 0));
  member.paidAmount = paid;
  member.pendingAmount = round_(Math.max(0, member.totalAmount - paid));
  member.lastPaymentDate = pays.length ? pays[pays.length - 1].paymentDate : "";
  if (member.status !== "SUSPENDED" && member.status !== "INACTIVE") {
    member.status = daysUntil_(member.membershipEndDate, todayIso_()) < 0 ? "EXPIRED" : "ACTIVE";
  }
  member.updatedAt = now_();
  return member;
}

function getSettings_() {
  var rows = readObjects_(SHEETS.Settings);
  if (!rows.length) return defaultSettings_();
  return rows[0];
}

function defaultSettings_() {
  return {
    gymName: "Your Gym",
    gymAddress: "",
    gymMobile: "",
    gymEmail: "",
    currency: "INR",
    receiptFooter: "Thank you for training with us.",
    timezone: "Asia/Kolkata",
  };
}

function ensureDefaultSettings_() {
  if (readObjects_(SHEETS.Settings).length === 0) {
    appendObject_(SHEETS.Settings, defaultSettings_());
  }
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  var current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var missing = headers.some(function (h, i) { return String(current[i] || "") !== h; });
  if (missing) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function sheet_(name) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sheet) throw new Error("Missing sheet: " + name + ". Run setupGymWorkbook().");
  return sheet;
}

function readObjects_(name) {
  var sheet = sheet_(name);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(String);
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    if (values[i].every(function (c) { return c === "" || c === null; })) continue;
    var obj = {};
    for (var c = 0; c < headers.length; c++) obj[headers[c]] = normalizeCell_(values[i][c]);
    rows.push(obj);
  }
  return rows;
}

function sheetTz_() {
  try {
    return SpreadsheetApp.getActive().getSpreadsheetTimeZone() || "Asia/Kolkata";
  } catch (err) {
    return "Asia/Kolkata";
  }
}

function normalizeCell_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, sheetTz_(), "yyyy-MM-dd");
  }
  return value;
}

function toSheetValue_(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    var p = value.split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0);
  }
  return value;
}

function appendObject_(name, obj) {
  var sheet = sheet_(name);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headers.map(function (h) { return obj[h] != null ? toSheetValue_(obj[h]) : ""; });
  sheet.appendRow(row);
}

function writeAllObjects_(name, rows) {
  var sheet = sheet_(name);
  var headers = HEADERS[headerKey_(name)];
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (!rows.length) return;
  var values = rows.map(function (obj) {
    return headers.map(function (h) { return obj[h] != null ? toSheetValue_(obj[h]) : ""; });
  });
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}

function headerKey_(name) {
  if (name === SHEETS.Plans) return "Plans";
  if (name === SHEETS.Admins) return "Admins";
  if (name === SHEETS.Audit) return "Audit";
  return name;
}

function findById_(name, idField, id) {
  var rows = readObjects_(name);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][idField]) === String(id)) return rows[i];
  }
  return null;
}

function writeById_(name, idField, id, obj) {
  var rows = readObjects_(name);
  var found = false;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][idField]) === String(id)) {
      rows[i] = obj;
      found = true;
      break;
    }
  }
  if (!found) throw new Error("Row not found: " + id);
  writeAllObjects_(name, rows);
}

function nextId_(name, field, prefix) {
  var rows = readObjects_(name);
  var max = 0;
  var re = new RegExp("^" + prefix + "(\\d+)$");
  rows.forEach(function (row) {
    var match = String(row[field] || "").match(re);
    if (match) max = Math.max(max, Number(match[1]));
  });
  return prefix + pad_(max + 1, 3);
}

function audit_(username, action, entity, entityId, details) {
  appendObject_(SHEETS.Audit, {
    logId: nextId_(SHEETS.Audit, "logId", "LOG"),
    timestamp: now_(),
    username: username,
    action: action,
    entity: entity,
    entityId: entityId,
    details: details,
  });
}

function ensureSecrets_() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty("TOKEN_SECRET")) props.setProperty("TOKEN_SECRET", randomSecret_());
  if (!props.getProperty("PASSWORD_SALT")) props.setProperty("PASSWORD_SALT", randomSecret_());
}

function randomSecret_() {
  return Utilities.getUuid() + Utilities.getUuid();
}

function hashPassword_(password) {
  ensureSecrets_();
  var salt = PropertiesService.getScriptProperties().getProperty("PASSWORD_SALT");
  return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + password, Utilities.Charset.UTF_8));
}

function signToken_(payload) {
  ensureSecrets_();
  var json = JSON.stringify(payload);
  var body = Utilities.base64EncodeWebSafe(json);
  var sig = hex_(Utilities.computeHmacSha256Signature(body, PropertiesService.getScriptProperties().getProperty("TOKEN_SECRET")));
  return body + "." + sig;
}

function verifyToken_(token) {
  if (!token || token.indexOf(".") < 0) return null;
  var parts = token.split(".");
  var body = parts[0];
  var sig = parts[1];
  var expected = hex_(Utilities.computeHmacSha256Signature(body, PropertiesService.getScriptProperties().getProperty("TOKEN_SECRET")));
  if (sig !== expected) return null;
  var payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(body)).getDataAsString());
  if (!payload.exp || Date.now() > Number(payload.exp)) return null;
  return payload;
}

function hex_(bytes) {
  return bytes.map(function (b) {
    var v = b < 0 ? b + 256 : b;
    return ("0" + v.toString(16)).slice(-2);
  }).join("");
}

function todayIso_() {
  return Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");
}

function now_() {
  return new Date().toISOString();
}

function addDaysIso_(iso, days) {
  var parts = String(iso).split("-");
  var d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
  d.setUTCDate(d.getUTCDate() + Number(days));
  return Utilities.formatDate(d, "UTC", "yyyy-MM-dd");
}

function daysUntil_(endDate, today) {
  var a = new Date(endDate + "T00:00:00Z").getTime();
  var b = new Date(today + "T00:00:00Z").getTime();
  return Math.round((a - b) / 86400000);
}

function expiryBucket_(endDate, today) {
  var days = daysUntil_(endDate, today);
  if (days < 0) return "EXPIRED";
  if (days === 0) return "TODAY";
  if (days <= 7) return "D7";
  if (days <= 30) return "D30";
  return "LATER";
}

function inRange_(iso, from, to) {
  if (from && String(iso) < from) return false;
  if (to && String(iso) > to) return false;
  return true;
}

function isIsoDate_(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}

function round_(n) {
  return Math.round(Number(n) * 100) / 100;
}

function pad_(n, width) {
  var s = String(n);
  while (s.length < width) s = "0" + s;
  return s;
}

function sum_(rows, field) {
  return round_(rows.reduce(function (s, r) { return s + Number(r[field] || 0); }, 0));
}

function ok_(data) {
  return { ok: true, data: data };
}

function fail_(error, code) {
  return { ok: false, error: error, code: code || "ERROR" };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
