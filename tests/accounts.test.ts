import assert from "node:assert/strict";
import { test } from "node:test";
import { hashGamePassword, parseDatabaseConfig, validateRegistration, validateAccountDeletion, validatePasswordChange } from "../lib/accounts.ts";
import { localRequest } from "../lib/local-request.ts";

test("registration trims and normalizes username without changing the password", () => {
  assert.deepEqual(validateRegistration({ username: "  Player_01 ", password: " pass123 ", confirmPassword: " pass123 " }), { username: "player_01", password: " pass123 " });
});

test("registration rejects missing data, SQL syntax and usernames outside game-compatible bounds", () => {
  for (const body of [null, [], {}, { username: 123 }, ...["", "ab", "a".repeat(33), "tên", "a b", "a' OR 1=1"].map((username) => ({ username, password: "123456", confirmPassword: "123456" }))]) {
    assert.throws(() => validateRegistration(body));
  }
  for (const username of ["abc", "a".repeat(32)]) {
    assert.equal(validateRegistration({ username, password: "123456", confirmPassword: "123456" }).username, username);
  }
});

test("registration enforces password bounds and matching confirmation", () => {
  for (const [password, confirmPassword] of [["12345", "12345"], ["a".repeat(33), "a".repeat(33)], ["123456", "654321"], ["      ", "      "], ["abc\u0000def", "abc\u0000def"], ["mật khẩu", "mật khẩu"]]) {
    assert.throws(() => validateRegistration({ username: "player", password, confirmPassword }));
  }
  assert.equal(validateRegistration({ username: "player", password: "a".repeat(32), confirmPassword: "a".repeat(32) }).password.length, 32);
});

test("password hashing matches the existing game's MD5 format", () => {
  assert.equal(hashGamePassword("123456"), "e10adc3949ba59abbe56e057f20f883e");
});

test("database config reads only the Database section and preserves password punctuation", () => {
  assert.deepEqual(parseDatabaseConfig("[Paysys]\r\nServer=wrong\r\nPassword=other\r\n[Database]\r\nServer=127.0.0.1\r\nUserName=root\r\nPassword=a=b;#c\r\nDatabase=jxaccount\r\nPort=3306\r\n"), { host: "127.0.0.1", user: "root", password: "a=b;#c", database: "jxaccount", port: 3306 });
  assert.equal(parseDatabaseConfig("[Database]\nServer=localhost\nUserName=root\nPassword=\nDatabase=jxaccount").password, "");
});

test("database config rejects incomplete configuration and invalid ports without exposing secrets", () => {
  for (const value of ["", "[Paysys]\nServer=localhost", "[Database]\nServer=localhost\nUserName=root\nPassword=topsecret\nDatabase=jxaccount\nPort=oops"]) {
    assert.throws(() => parseDatabaseConfig(value), (error: unknown) => error instanceof Error && !error.message.includes("topsecret"));
  }
});

test("account API request guard rejects external origins and allows the local admin", () => {
  assert.equal(localRequest(new Request("http://127.0.0.1:3000/api/accounts", { headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" } })), true);
  assert.equal(localRequest(new Request("http://127.0.0.1:3000/api/accounts", { headers: { host: "127.0.0.1:3000", origin: "https://external.example" } })), false);
  const url = "http://kiemthe.bee/api/accounts";
  const localHeaders = { host: "kiemthe.bee", origin: "http://kiemthe.bee", "sec-fetch-site": "same-origin" };
  assert.equal(localRequest(new Request(url, { headers: localHeaders })), true);
  assert.equal(localRequest(new Request(url, { headers: { ...localHeaders, "sec-fetch-site": "cross-site" } })), false);
  assert.equal(localRequest(new Request(url, { headers: { ...localHeaders, origin: "https://external.example" } })), false);
  assert.equal(localRequest(new Request(url.replace(".bee", ".bee.example"), { headers: {
    host: "kiemthe.bee.example", origin: "http://kiemthe.bee.example",
  } })), false);
});

test("account deletion requires a positive integer account ID", () => {
  assert.equal(validateAccountDeletion({ id: 3 }), 3);
  for (const body of [null, [], {}, { id: "3" }, { id: 0 }, { id: -1 }, { id: 1.5 }, { id: 2147483648 }, { id: "1 OR 1=1" }]) {
    assert.throws(() => validateAccountDeletion(body));
  }
});

test("password changes validate the account ID, password bounds and confirmation", () => {
  assert.deepEqual(validatePasswordChange({ id: 3, password: " pass123 ", confirmPassword: " pass123 " }), { id: 3, password: " pass123 " });
  for (const body of [null, [], {}, { id: "3", password: "123456", confirmPassword: "123456" }, { id: -1, password: "123456", confirmPassword: "123456" }, { id: 1.5, password: "123456", confirmPassword: "123456" }, { id: 2147483648, password: "123456", confirmPassword: "123456" }, ...["12345", "a".repeat(33), "mật khẩu", "      ", "abc\u0000def"].map((password) => ({ id: 3, password, confirmPassword: password })), { id: 3, password: "123456", confirmPassword: "654321" }, { id: 3, password: 123456, confirmPassword: 123456 }]) {
    assert.throws(() => validatePasswordChange(body));
  }
});
