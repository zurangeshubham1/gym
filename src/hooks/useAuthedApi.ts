import { useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import type { ApiResult, GymApi } from "../types";

export function useAuthedApi() {
  const { api, token, loading } = useAuth();

  const call = useCallback(
    async <T,>(fn: (client: GymApi, sessionToken: string) => Promise<ApiResult<T>>): Promise<ApiResult<T>> => {
      if (!api) return { ok: false, error: "API is not ready yet.", code: "NOT_READY" };
      if (!token) return { ok: false, error: "Please log in.", code: "UNAUTHORIZED" };
      return fn(api, token);
    },
    [api, token],
  );

  return { api, token, loading, call };
}
