import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["tests/e2e/**/*"],
    globalSetup: ["./vitest.global-setup.ts"],
    mockReset: true,
  },
});
