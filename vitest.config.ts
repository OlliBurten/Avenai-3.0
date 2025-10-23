import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "lib/**/*.test.ts", 
      "lib/**/__tests__/**/*.test.ts", 
      "lib/**/__tests__/**/*.ts",
      "tests/**/*.{test,spec}.ts"
    ],
    globals: true,
    reporters: ['default'],
    coverage: {
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
