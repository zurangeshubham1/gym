import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { env } from "node:process";

export default defineConfig({
  plugins: [react()],
  base: env.VITE_BASE_PATH || "/",
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
