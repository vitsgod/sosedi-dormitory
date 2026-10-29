import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { testTimeout: 30000, hookTimeout: 30000 },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname.replace(
        /^\/([A-Z]:)/,
        "$1",
      ),
    },
  },
});
