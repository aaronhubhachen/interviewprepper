import path from "node:path";
import { defineConfig } from "vitest/config";

/** Unit tests for the app's pure modules (no React Native runtime). */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { environment: "node", include: ["src/**/__tests__/**/*.test.ts"] },
});
