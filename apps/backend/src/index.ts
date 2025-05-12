import { serve } from "@hono/node-server";
import app from "./app";

const portStr = process.env.PORT;
if (!portStr) {
  throw new Error("PORT is not set");
}
const port = Number.parseInt(portStr);

const server = serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Server is running on port ${info.port}`);
  },
);

process.on("SIGINT", () => {
  server.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
});
