import assert from "node:assert/strict";
import { test } from "node:test";
import { largestSqlStatementBytes, assertPacketLimit, withDatabaseDeadline } from "../lib/database-guards.ts";

test("measures entire SQL statements, including multiline routines, quoted delimiters and UTF8", () => {
  const insert = "INSERT INTO t VALUES ('Kiếm; Thế\\\'test;');";
  const routine = "CREATE PROCEDURE p()\nBEGIN\n SELECT ';;';\n SELECT 2;\nEND";
  const sql = `${insert}\nDELIMITER ;;\n${routine};;\nDELIMITER ;\nSELECT 1;`;
  assert.equal(largestSqlStatementBytes(sql), Math.max(Buffer.byteLength(insert.slice(0, -1)), Buffer.byteLength(routine)));
  assert.equal(largestSqlStatementBytes("SELECT ';', `a;b`; SELECT 1;"), Buffer.byteLength("SELECT ';', `a;b`"));
});

test("rejects an oversized hex BLOB statement before any restore but accepts many small statements", () => {
  const sql = "INSERT INTO t VALUES (0x" + "ff".repeat(2000) + ");";
  assert.throws(() => assertPacketLimit([{ name: "jxaccount", sql }], 2048), /max_allowed_packet/);
  assert.doesNotThrow(() => assertPacketLimit([{ name: "jxaccount", sql: "SELECT 1;\n".repeat(2000) }], 2048));
});

test("lock acquisition times out and destroys its connection instead of blocking server controls forever", async () => {
  let destroyed = false;
  await assert.rejects(withDatabaseDeadline(() => new Promise<never>(() => {}), () => { destroyed = true; }, 10), /thời gian/);
  assert.equal(destroyed, true);
  assert.equal(await withDatabaseDeadline(async () => 42, () => assert.fail("must not destroy successful connection"), 1000), 42);
});
