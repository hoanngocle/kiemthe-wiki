import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { queueTopup, readTopups, readTopupHistory, topupPackages, validateTopup, characterFromRow } from "../lib/local-topup.ts";
import { parseDatabaseConfig } from "../lib/accounts.ts";

const emilia = { id: "656D696C6961-456D696C6961", name: "Emilia", account: "emilia" };
const other = { id: "706C61796572-4865726F", name: "Hero", account: "player" };
const request = (requestId = "11111111-1111-4111-8111-111111111111", amountK = 500, characterId = emilia.id) => ({ requestId, amountK, characterId });
async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const parent = path.resolve("tests");
  const root = await mkdtemp(path.join(parent, ".topup-test-"));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(root)), parent);
    await rm(root, { recursive: true, force: true });
  });
  return root;
}

test("top-ups accept one known package and byte-safe character identity", () => {
  assert.deepEqual(topupPackages, [500, 1000, 2000]);
  assert.deepEqual(validateTopup(request()), request());
  for (const body of [null, [], {}, request("bad"), request(undefined, 0), request(undefined, 51), request(undefined, 100.5), request(undefined, 100, "../hero"), { ...request(), amountK: "100" }, { ...request(), characterId: [emilia.id, other.id] }]) {
    assert.throws(() => validateTopup(body));
  }
});

test("character labels decode UTF8 bytes without changing the identity", () => {
  const row = characterFromRow({ accountHex: "656D696C6961", nameHex: "4DC3A96F", name: "MÃ©o", account: "emilia" });
  assert.deepEqual(row, { id: "656D696C6961-4DC3A96F", name: "Méo", account: "emilia" });
});

test("Goddess database settings use their own section and the MySQL default port", () => {
  assert.deepEqual(parseDatabaseConfig("[DatabaseServer]\nServer=127.0.0.1\nUserName=root\nPassword=test\nDatabase=91jx_goddess\n[NameServer]\nDatabase=wrong", "DatabaseServer"), { host: "127.0.0.1", user: "root", password: "test", database: "91jx_goddess", port: 3306 });
});

test("one top-up writes a durable receipt and only the selected character's cumulative bridge", async (t) => {
  const root = await fixture(t);
  const receipt = await queueTopup(root, emilia, request());
  assert.equal(receipt.amountK, 500);
  assert.equal(receipt.character.id, emilia.id);
  assert.equal(receipt.coin, 50000000);
  assert.equal(await readFile(path.join(root, "gameserver/local-topup", `${emilia.id}.txt`), "utf8"), `KTL1\t${emilia.id}\t500\n`);
  await assert.rejects(readFile(path.join(root, "gameserver/local-topup", `${other.id}.txt`)));
  assert.equal((await readTopups(root)).length, 1);
});

test("concurrent top-ups preserve both credits; replaying a request never grants extra", async (t) => {
  const root = await fixture(t);
  await Promise.all([
    queueTopup(root, emilia, request()),
    queueTopup(root, emilia, request("22222222-2222-4222-8222-222222222222", 2000)),
    queueTopup(root, emilia, request()),
  ]);
  assert.equal((await readTopups(root)).length, 2);
  assert.equal(await readFile(path.join(root, "gameserver/local-topup", `${emilia.id}.txt`), "utf8"), `KTL1\t${emilia.id}\t2500\n`);
  await assert.rejects(queueTopup(root, emilia, request(undefined, 1000)), { status: 409 });
  await assert.rejects(queueTopup(root, other, request(undefined, 500, other.id)), { status: 409 });
});

test("clearing web history keeps credits and retries intact while showing new receipts", async (t) => {
  const root = await fixture(t);
  const storage = path.join(root, "admin/.local-topups");
  await mkdir(storage, { recursive: true });
  const old = { requestId: request().requestId, character: emilia, amountK: 500, coin: 50000000, createdAt: "2026-11-15T00:00:00.000Z" };
  await writeFile(path.join(storage, "receipts.json"), JSON.stringify({ version: 1, receipts: [old] }));
  assert.deepEqual(await readTopupHistory(root, await readTopups(root)), [old]);
  await writeFile(path.join(storage, "history-cleared-at.txt"), old.createdAt);
  assert.deepEqual(await readTopupHistory(root, await readTopups(root)), []);

  assert.deepEqual(await queueTopup(root, emilia, request()), old);
  const recent = await queueTopup(root, emilia, request("22222222-2222-4222-8222-222222222222", 1000));
  const receipts = await readTopups(root);
  assert.deepEqual(receipts, [old, recent]);
  assert.deepEqual(await readTopupHistory(root, receipts), [recent]);
  assert.equal(await readFile(path.join(root, "gameserver/local-topup", `${emilia.id}.txt`), "utf8"), `KTL1\t${emilia.id}\t1500\n`);
});

test("retry repairs a failed bridge publication without charging twice", async (t) => {
  const root = await fixture(t);
  await mkdir(path.join(root, "gameserver"));
  await writeFile(path.join(root, "gameserver/local-topup"), "blocked");
  await assert.rejects(queueTopup(root, emilia, request()));
  assert.equal((await readTopups(root)).length, 1);
  await rm(path.join(root, "gameserver/local-topup"));
  await queueTopup(root, emilia, request());
  assert.equal((await readTopups(root)).length, 1);
  assert.equal(await readFile(path.join(root, "gameserver/local-topup", `${emilia.id}.txt`), "utf8"), `KTL1\t${emilia.id}\t500\n`);
});

test("retired packages remain readable and replayable through an existing receipt", async (t) => {
  const root = await fixture(t);
  const previous = request(undefined, 100);
  const receipt = { requestId: previous.requestId, character: emilia, amountK: 100, coin: 10000000, createdAt: "2026-11-01T00:00:00Z" };
  const journal = path.join(root, "admin/.local-topups");
  await mkdir(journal, { recursive: true });
  await writeFile(path.join(journal, "receipts.json"), JSON.stringify({ version: 1, receipts: [receipt] }));

  assert.deepEqual(await readTopups(root), [receipt]);
  assert.deepEqual(await queueTopup(root, emilia, previous), receipt);
  for (const amountK of [50, 100, 300]) {
    await assert.rejects(queueTopup(root, emilia, request("22222222-2222-4222-8222-222222222222", amountK)), { status: 400 });
  }
  assert.deepEqual(await readTopups(root), [receipt]);
  assert.equal(await readFile(path.join(root, "gameserver/local-topup", `${emilia.id}.txt`), "utf8"), `KTL1\t${emilia.id}\t100\n`);
});

test("damaged receipts and mismatched identities fail closed without replacing history", async (t) => {
  const root = await fixture(t);
  await assert.rejects(queueTopup(root, other, request()));
  await queueTopup(root, emilia, request());
  const file = path.join(root, "admin/.local-topups/receipts.json");
  await writeFile(file, "broken");
  await assert.rejects(queueTopup(root, emilia, request("33333333-3333-4333-8333-333333333333")));
  assert.equal(await readFile(file, "utf8"), "broken");
});
