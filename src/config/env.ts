export const API_URL = (import.meta.env.VITE_GYM_API_URL as string | undefined)?.trim() ?? "";

export const IS_DEV = import.meta.env.DEV;

export function isApiConfigured(): boolean {
  return Boolean(API_URL);
}
