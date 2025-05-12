import { getApp } from "./app";
import { getDb } from "./infrastructure/database";

const app = getApp(getDb());

export default app;
