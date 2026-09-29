import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    reporters: ["default", "junit"],
    outputFile: {
      junit: "reports/junit.xml",
    },
    coverage: {
      provider: "v8",
      include: [
        "app/lib/actions.ts",
        "app/lib/data.ts",
        "app/lib/placeholder-data.ts",
        "app/lib/utils.ts",
      ],
      exclude: ["**/*.test.ts"],
      reporter: ["text", "html", "json-summary"],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
