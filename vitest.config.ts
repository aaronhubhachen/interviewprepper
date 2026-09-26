import { defineConfig } from "vitest/config";

/**
 * Lets `npx vitest run` from the repo root run every workspace with its own
 * config (aliases, SYNAPSE_DISABLE_LLM=1). `npm test` runs them one by one.
 */
export default defineConfig({
  test: {
    projects: ["packages/core", "apps/agent", "apps/web"],
  },
});
