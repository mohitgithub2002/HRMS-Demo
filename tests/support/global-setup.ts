import { execSync } from "node:child_process";
import "dotenv/config";

/**
 * Integration tests run against TEST_DATABASE_URL (a throw-away database). Pending migrations are applied once per
 * run; each test file empties the tables it uses (tests/support/db.ts wipe). Without it the database tests are
 * skipped (unit tests still run).
 */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url, DIRECT_DATABASE_URL: url },
  });
}
