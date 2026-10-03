import type { AuthSession } from "../types";
import { REMEMBER_KEY, SESSION_KEY } from "../config/constants";

export function readSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function writeSession(session: AuthSession, remember: boolean): void {
  clearSession();
  const raw = JSON.stringify(session);
  if (remember) localStorage.setItem(SESSION_KEY, raw);
  else sessionStorage.setItem(SESSION_KEY, raw);
  localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export function friendlyError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message);
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      return "Network error. Check your internet connection and Apps Script URL.";
    }
    return message || fallback;
  }
  return fallback;
}
