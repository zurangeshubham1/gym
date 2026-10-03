import { API_URL } from "../config/env";
import type { ApiResult, GymApi } from "../types";
import { friendlyError } from "./session";

async function postAction<T>(action: string, data?: unknown, token?: string): Promise<ApiResult<T>> {
  if (!API_URL) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      error: "Apps Script URL is missing. Create .env.local with VITE_GYM_API_URL.",
    };
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      redirect: "follow",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({ action, data: data ?? {}, token: token ?? "" }),
    });

    const text = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        code: "APPS_SCRIPT",
        error: `Apps Script request failed (${response.status}).`,
      };
    }

    let parsed: ApiResult<T>;
    try {
      parsed = JSON.parse(text) as ApiResult<T>;
    } catch {
      return {
        ok: false,
        code: "APPS_SCRIPT",
        error: "Apps Script returned an invalid response.",
      };
    }
    return parsed;
  } catch (error) {
    return { ok: false, code: "NETWORK", error: friendlyError(error) };
  }
}

export const appsScriptApi: GymApi = {
  login: (username, password) => postAction("login", { username, password }),
  getDashboard: (token) => postAction("getDashboard", {}, token),
  getMembers: (token) => postAction("getMembers", {}, token),
  getMember: (token, memberId) => postAction("getMember", { memberId }, token),
  createMember: (token, data) => postAction("createMember", data, token),
  updateMember: (token, data) => postAction("updateMember", data, token),
  updateMemberFinance: (token, data) => postAction("updateMemberFinance", data, token),
  deactivateMember: (token, memberId) => postAction("deactivateMember", { memberId }, token),
  getPayments: (token) => postAction("getPayments", {}, token),
  createPayment: (token, data) => postAction("createPayment", data, token),
  confirmPaymentPaid: (token, paymentId) => postAction("confirmPaymentPaid", { paymentId }, token),
  markPaymentUnpaid: (token, paymentId) => postAction("markPaymentUnpaid", { paymentId }, token),
  cancelPayment: (token, paymentId) => postAction("cancelPayment", { paymentId }, token),
  getPlans: (token) => postAction("getPlans", {}, token),
  createPlan: (token, data) => postAction("createPlan", data, token),
  updatePlan: (token, data) => postAction("updatePlan", data, token),
  getExpenses: (token) => postAction("getExpenses", {}, token),
  createExpense: (token, data) => postAction("createExpense", data, token),
  getReports: (token, filters) => postAction("getReports", filters, token),
  getSettings: (token) => postAction("getSettings", {}, token),
  updateSettings: (token, data) => postAction("updateSettings", data, token),
  changePassword: (token, currentPassword, newPassword) =>
    postAction("changePassword", { currentPassword, newPassword }, token),
  getEnquiries: (token) => postAction("getEnquiries", {}, token),
  submitEnquiry: (data) => postAction("submitEnquiry", data),
  getReceipt: (token, paymentId) => postAction("getReceipt", { paymentId }, token),
};
