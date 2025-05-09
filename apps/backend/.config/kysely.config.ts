import { defineConfig } from "kysely-ctl";
import { dialect } from "../src/infrastructure/database";

export default defineConfig({
  dialect,
  migrations: {
    migrationFolder: "db/migrations",
  },
  //   plugins: [],
  seeds: {
    seedFolder: "db/seeds",
  },
});
