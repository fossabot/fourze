import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 1000 * 60 * 3,
    coverage: {
      exclude: ["**/node_modules/**", "**/test/**", "**/dist/**", "**/playgrounds/**"]
    }
  }
});
