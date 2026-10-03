import { IS_DEV, isApiConfigured } from "../config/env";
import type { GymApi } from "../types";
import { appsScriptApi } from "./appsScriptApi";

export async function getGymApi(): Promise<GymApi> {
  if (!isApiConfigured() && IS_DEV) {
    const mod = await import("./mockGymApi");
    return mod.mockGymApi;
  }
  return appsScriptApi;
}
