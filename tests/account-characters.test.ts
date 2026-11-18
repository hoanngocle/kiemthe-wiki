import assert from "node:assert/strict";
import { test } from "node:test";
import { groupAccountCharacters } from "../lib/account-characters.ts";

test("characters are grouped by their owning account and names remain unchanged", () => {
  const groups = groupAccountCharacters(["demo"], [
    { id: "a-1", account: "Demo", name: "Thiên Nhẫn" },
    { id: "a-2", account: "demo", name: "Nga My" },
    { id: "b-1", account: "old_account", name: "Võ Đang" },
  ]);
  assert.equal(groups.length, 2);
  const demo = groups.find((group) => group.account.toLowerCase() === "demo")!;
  assert.equal(demo.registered, true);
  assert.deepEqual(demo.characters.map((character) => character.name), ["Thiên Nhẫn", "Nga My"]);
  assert.equal(groups.find((group) => group.account === "old_account")?.registered, false);
});

test("accounts outside the displayed page still count as registered", () => {
  const groups = groupAccountCharacters(["older_account", "new_account"], [{ id: "a", account: "older_account", name: "Old character" }]);
  assert.equal(groups[0].registered, true);
  assert.deepEqual(groupAccountCharacters(["no_characters"], []), []);
});

test("a repeated role is not counted twice and equal names in different accounts stay separate", () => {
  const first = { id: "a-1", account: "alpha", name: "Same name" };
  const groups = groupAccountCharacters([], [first, first, { id: "b-1", account: "beta", name: "Same name" }]);
  assert.deepEqual(groups.map((group) => group.characters.length), [1, 1]);
  assert.equal(JSON.stringify(groups).includes("password"), false);
});
