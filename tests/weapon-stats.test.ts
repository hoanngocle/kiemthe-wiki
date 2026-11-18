import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { loadWeaponStats } from "../lib/weapon-wiki.ts";
import { compareMagicRoll, rangeAt } from "../lib/weapon-stats.ts";
import { parseShopTable } from "../lib/shop-wiki.ts";

const root = path.resolve("../gameserver");

test("matches synchronized Hạo Thiên game templates at MagicLevel 16 and capped enhancement ranges", async () => {
  const item = await loadWeaponStats(root, "2-1-12084-10");
  assert.ok(item);
  const [attack, speed, accuracy, flat, hurt] = item.magic;
  // Both deployed template tables declare level16; the old screenshot test
  // expected18 from an earlier equipment configuration.
  const clientRows = parseShopTable(await readFile(path.resolve("../../Client/setting/item/001/equip/purple/meleeweapon.txt"), "utf8"));
  const client = clientRows.find((row) => row.Genre === "2" && row.DetailType === "1" && row.ParticularType === "12084" && row.Level === "10");
  assert.ok(client);
  assert.deepEqual([1, 2, 3, 4, 5].map((slot) => Number(client[`MagicLevel${slot}`])), [16, 16, 16, 16, 16]);
  assert.deepEqual(item.magic.map((stat) => stat.level), [16, 16, 16, 16, 16]);
  assert.equal(attack.level, 16);
  assert.deepEqual(rangeAt(attack, 0, true), { level: 10, value: [91, 100], extra: [] });
  assert.deepEqual(rangeAt(attack, 0), { level: 16, value: [151, 160], extra: [] });
  assert.deepEqual(rangeAt(attack, 16), { level: 26, value: [311, 340], extra: [] });
  assert.deepEqual(rangeAt(attack, 16, true), rangeAt(attack, 16));
  assert.deepEqual([speed, accuracy, flat, hurt].map((stat) => rangeAt(stat, 0).value),
    [[27, 27], [651, 680], [1751, 1900], [151, 160]]);
  assert.equal(compareMagicRoll(attack, 0, "+98%"), "legacy");
  assert.equal(compareMagicRoll(attack, 0, "151"), "current");
  assert.equal(compareMagicRoll(attack, 0, "160"), "current");
  assert.equal(compareMagicRoll(attack, 0, "150"), "outside");
  assert.equal(compareMagicRoll(attack, 0, "161"), "outside");
  assert.equal(compareMagicRoll(attack, 0, "101%"), "outside");
  assert.equal(compareMagicRoll(attack, 0, "98.2%"), "invalid");
  assert.equal(compareMagicRoll(attack, 0, " "), null);
  assert.equal(compareMagicRoll(flat, 0, "+1.751"), "current");
  assert.deepEqual(item.basic.find((stat) => stat.code === attack.code)?.value, [30, 120]);
  assert.deepEqual(item.bonuses.map((stat) => stat.unlock), [4, 8, 10, 12, 14, 16]);
});

test("uses the requested template, handles plain equipment and rejects retired or malformed IDs", async () => {
  const item = await loadWeaponStats(root, "2,1,3723,10");
  assert.equal(item?.basic.filter(({ code }) => code === "addphysicsdamage_p").length, 2);
  const qinling = await loadWeaponStats(root, "2-1-1215-10");
  assert.ok(qinling?.magic.some((stat) => stat.level === 9));
  const plain = await loadWeaponStats(root, "1-1-1-1");
  assert.ok(plain?.basic.length);
  assert.equal(plain.magic.length, 0);
  assert.equal(await loadWeaponStats(root, "2-1-12210-10"), null);
  assert.equal(await loadWeaponStats(root, "../../12084"), null);
});
