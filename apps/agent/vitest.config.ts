import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // Tests never talk to a real model, even when a developer's .env or shell has keys.
    env: { SYNAPSE_DISABLE_LLM: "1" },
    testTimeout: 20_000,
  },
});
