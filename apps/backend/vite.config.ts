import build from "@hono/vite-build/node";
import devServer from "@hono/vite-dev-server";
import nodeAdapter from "@hono/vite-dev-server/node";
import process from "node:process";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const portStr = process.env.PORT;
if (!portStr) {
  throw new Error("PORT is not set");
}
const port = Number.parseInt(portStr);

export default defineConfig(({ command }) => {
  const defaultConfig = {
    plugins: [tsConfigPaths()],
  };
  if (command === "build") {
    return {
      ...defaultConfig,
      plugins: [
        tsConfigPaths(),
        build({
          entry: "./src/app.ts",
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
        entry: "./src/app.ts",
      }),
    ],
    server: {
      port,
    },
  };
});
