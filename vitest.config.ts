import { defineConfig } from "vitest/config";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

dotenv.config();
const root = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  resolve: { alias: { "@": path.resolve(root, "./src") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
