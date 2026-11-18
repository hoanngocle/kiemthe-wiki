import assert from "node:assert/strict";
import { test } from "node:test";
import { AccountError, readDatabaseConfig } from "../lib/accounts.ts";
const valid = { DB_HOST: "127.0.0.1", DB_USER: "admin", DB_PASSWORD: " a=b;#c$secret ", DB_NAME: "jxaccount" };

test("database environment config preserves passwords and defaults to MySQL port 3306", () => {
  assert.deepEqual(readDatabaseConfig(valid), { host: "127.0.0.1", user: "admin", password: valid.DB_PASSWORD, database: "jxaccount", port: 3306 });
  assert.equal(readDatabaseConfig({ ...valid, DB_PASSWORD: "", DB_PORT: "3307" }).password, "");
  assert.equal(readDatabaseConfig({ ...valid, DB_PORT: "3307" }).port, 3307);
});

test("database environment config rejects missing settings and invalid ports without leaking secrets", () => {
  const invalid: Record<string, string | undefined>[] = [{}];
  for (const key of ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"]) invalid.push({ ...valid, [key]: undefined });
  for (const key of ["DB_HOST", "DB_USER", "DB_NAME"]) invalid.push({ ...valid, [key]: "   " });
  for (const port of ["", " ", "oops", "0", "65536", "1.5"]) invalid.push({ ...valid, DB_PORT: port });
  for (const env of invalid) {
    assert.throws(() => readDatabaseConfig(env), (error: unknown) => error instanceof AccountError && error.status === 503 && error.message.includes(".env") && !error.message.includes(valid.DB_PASSWORD));
  }
});
