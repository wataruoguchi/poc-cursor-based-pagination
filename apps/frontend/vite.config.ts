import react from "@vitejs/plugin-react-swc";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import cssInjectedByJSPlugin from "vite-plugin-css-injected-by-js";

const gitVersion = execSync("git rev-parse HEAD").toString().trim();

// https://vite.dev/config/
export default defineConfig(() => {
  const defaultConfig = {
    plugins: [react()],
  };

  let httpsOptions: { key: Buffer; cert: Buffer } | undefined;
  try {
    httpsOptions = {
      key: fs.readFileSync(
        path.resolve(__dirname, "../../.certificates/localhost-key.pem"),
      ),
      cert: fs.readFileSync(
        path.resolve(__dirname, "../../.certificates/localhost.pem"),
      ),
    };
  } catch (error) {
    console.error(error);
    console.warn("HTTPS certificates not found, falling back to HTTP");
  }

  return {
    ...defaultConfig,
    plugins: [
      ...defaultConfig.plugins,
      cssInjectedByJSPlugin({ topExecutionPriority: false }),
    ],
    base: "./",
    define: {
      "import.meta.env.VITE_GIT_VERSION": JSON.stringify(gitVersion),
    },
    server: httpsOptions ? { https: httpsOptions } : {},
    build: {
      manifest: "manifest.json",
      sourcemap: "hidden",
      rollupOptions: {
        input: {
          main: "./src/main.tsx",
        },
        preserveEntrySignatures: "strict",
        output: {
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              return "vendor";
            }
          },
        },
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./vitest-setup.mjs"],
      coverage: {
        include: ["src/**/*.ts", "src/**/*.tsx"],
        exclude: [
          "src/**/*.d.ts",
          "src/main.tsx",
          "src/App.tsx",
          "src/mocks/**",
          "src/test-utils/**",
        ],
        thresholds: {
          statements: 80,
          branches: 80,
          lines: 80,
          functions: 80,
        },
        reporter: ["cobertura", "html", "text"],
      },
    },
  };
});
