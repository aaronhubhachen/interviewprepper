import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${root.split(path.sep).join("/")}/` },
      { find: /^server-only$/, replacement: path.join(root, "test", "stubs", "server-only.ts") },
    ],
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", ".next/**"],
    // Tests never talk to a real model, even when a developer's .env has keys.
    env: { SYNAPSE_DISABLE_LLM: "1" },
    testTimeout: 20_000,
  },
});
