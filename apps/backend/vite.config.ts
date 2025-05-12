import build from "@hono/vite-build/node";
import devServer from "@hono/vite-dev-server";
import nodeAdapter from "@hono/vite-dev-server/node";
import process from "node:process";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command, mode }) => {
  const port = mode === "test" ? 3000 : getPort();
  const defaultConfig = {
    plugins: [tsConfigPaths()],
  };
  if (command === "build") {
    return {
      ...defaultConfig,
      plugins: [
        tsConfigPaths(),
        build({
          entry: "./src/index.ts",
          port,
        }),
      ],
    };
  }

  return {
    plugins: [
      tsConfigPaths(),
      devServer({
        adapter: nodeAdapter,
        entry: "./src/index.ts",
      }),
    ],
    server: {
      port,
    },
    test: {
      globals: true,
      environment: "node",
    },
  };
});

const getPort = () => {
  const portStr = process.env.PORT;
  if (!portStr) {
    throw new Error("PORT is not set");
  }
  return Number.parseInt(portStr);
};
