import assert from "node:assert/strict";
import { test } from "node:test";
import nextEnv from "@next/env";
import { createConnection, type RowDataPacket } from "mysql2/promise";
import { accountErrorResponse, insertAccount, deleteAccountById, updateAccountPasswordById } from "../lib/account-database.ts";
import { AccountError, readDatabaseConfig } from "../lib/accounts.ts";

if (process.env.KIEMTHE_TEST_MYSQL === "1") nextEnv.loadEnvConfig(process.cwd());

test("database failures return safe errors without credentials, SQL or password hashes", () => {
  for (const code of ["ER_ACCESS_DENIED_ERROR", "ECONNREFUSED", "ER_BAD_FIELD_ERROR", undefined]) {
    const result = accountErrorResponse(Object.assign(new Error("secret password_hash SELECT account"), { code }));
    assert.equal(result.status, 503);
    assert.doesNotMatch(result.message, /secret|password_hash|SELECT/);
  }
  assert.equal(accountErrorResponse({ code: "ER_DUP_ENTRY" }).status, 409);
  assert.equal(accountErrorResponse(new AccountError("Tên tài khoản đã tồn tại.", 409)).status, 409);
});

test("real MySQL deletion removes only the selected account and reports missing IDs", { skip: process.env.KIEMTHE_TEST_MYSQL !== "1" }, async () => {
  const config = readDatabaseConfig();
  const connection = await createConnection({ ...config, charset: "utf8", connectTimeout: 5000 });
  try {
    const [schema] = await connection.query<RowDataPacket[]>("SHOW CREATE TABLE account");
    await connection.query(String(schema[0]["Create Table"]).replace(/^CREATE TABLE /, "CREATE TEMPORARY TABLE "));
    const first = await insertAccount(connection, "delete_target", "123456");
    const second = await insertAccount(connection, "keep_account", "123456");
    await deleteAccountById(connection, first.id);
    const [remaining] = await connection.query<RowDataPacket[]>("SELECT accid, loginName FROM account");
    assert.deepEqual(remaining.map((row) => ({ id: row.accid, username: row.loginName })), [{ id: second.id, username: "keep_account" }]);
    await assert.rejects(deleteAccountById(connection, first.id), (error: unknown) => error instanceof AccountError && error.status === 404);
    const [counts] = await connection.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM account");
    assert.equal(counts[0].total, 1);
  } finally { await connection.end(); }
});

test("real MySQL password changes affect only the selected account, permit unchanged passwords and reject missing IDs", { skip: process.env.KIEMTHE_TEST_MYSQL !== "1" }, async () => {
  const config = readDatabaseConfig();
  const connection = await createConnection({ ...config, charset: "utf8", connectTimeout: 5000 });
  try {
    const [schema] = await connection.query<RowDataPacket[]>("SHOW CREATE TABLE account");
    await connection.query(String(schema[0]["Create Table"]).replace(/^CREATE TABLE /, "CREATE TEMPORARY TABLE "));
    const first = await insertAccount(connection, "password_target", "123456");
    const second = await insertAccount(connection, "unchanged_account", "123456");
    await updateAccountPasswordById(connection, first.id, "password");
    const [rows] = await connection.query<RowDataPacket[]>("SELECT accid, password_hash, LockState, time FROM account ORDER BY accid");
    assert.equal(rows[0].accid, first.id);
    assert.equal(rows[0].password_hash, "5f4dcc3b5aa765d61d8327deb882cf99");
    assert.equal(rows[0].LockState, 0);
    assert.equal(rows[0].time, first.createdAt);
    assert.equal(rows[1].accid, second.id);
    assert.equal(rows[1].password_hash, "e10adc3949ba59abbe56e057f20f883e");
    await updateAccountPasswordById(connection, first.id, "password");
    await deleteAccountById(connection, first.id);
    await assert.rejects(updateAccountPasswordById(connection, first.id, "password"), (error: unknown) => error instanceof AccountError && error.status === 404);
  } finally { await connection.end(); }
});

test("real MySQL registration stores game-compatible credentials and rejects case-insensitive duplicates in an isolated temporary table", { skip: process.env.KIEMTHE_TEST_MYSQL !== "1" }, async () => {
  const config = readDatabaseConfig();
  const connection = await createConnection({ ...config, charset: "utf8", connectTimeout: 5000 });
  try {
    // A connection-local temporary table shadows the real account table. No real
    // player accounts are inserted, updated or removed by this integration test.
    const [schema] = await connection.query<RowDataPacket[]>("SHOW CREATE TABLE account");
    await connection.query(String(schema[0]["Create Table"]).replace(/^CREATE TABLE /, "CREATE TEMPORARY TABLE "));
    const result = await insertAccount(connection, "account_test", "123456");
    assert.equal(result.username, "account_test");
    assert.equal(result.locked, false);
    assert.ok(result.id > 0);
    assert.deepEqual(Object.keys(result).sort(), ["createdAt", "id", "locked", "username"]);
    const [rows] = await connection.execute<RowDataPacket[]>("SELECT password_hash, checkMember, LockState, xu, Coin, time FROM account WHERE accid = ?", [result.id]);
    assert.equal(rows[0].password_hash, "e10adc3949ba59abbe56e057f20f883e");
    assert.equal(rows[0].checkMember, 1);
    assert.equal(rows[0].LockState, 0);
    assert.equal(rows[0].xu, 0);
    assert.equal(rows[0].Coin, 0);
    assert.match(rows[0].time, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    await assert.rejects(insertAccount(connection, "ACCOUNT_TEST", "654321"), (error: unknown) => error instanceof AccountError && error.status === 409);
    const [counts] = await connection.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM account");
    assert.equal(counts[0].total, 1);
    const second = await insertAccount(connection, "account_test_2", "123456");
    assert.ok(second.id > result.id);
    const [locks] = await connection.query<RowDataPacket[]>("SELECT IS_USED_LOCK('kiemthe-admin:register') AS owner");
    assert.equal(locks[0].owner, null);
  } finally { await connection.end(); }
});
