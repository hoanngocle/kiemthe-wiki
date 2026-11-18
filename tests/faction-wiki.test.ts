import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { loadFactionCatalog } from "../lib/faction-wiki.ts";

test("faction wiki resolves all 24 GameServer routes to their configured skills", async () => {
  const factions = await loadFactionCatalog(path.resolve("../gameserver"));

  assert.deepEqual(factions.map((faction) => faction.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.ok(factions.every(({ routes }) => routes.length === 2 && routes.every(({ skills }) => skills.length >= 12)));
  assert.ok(factions.every(({ routes }) => routes.every(({ skills }) => skills.filter(({ book }) => !book).length === 12)));
  const doanThi = factions.find(({ id }) => id === 12)?.routes.find(({ id }) => id === 2);
  assert.ok(doanThi);
  assert.ok(!doanThi.skills.some(({ id }) => id === 1662));
  const replacements = [
    [1, 2, "Quyền Tông", "Côn Thiếu", 29, "La Hán Quyền"],
    [4, 2, "Tinh Túc", "Chưởng Độc", 86, "Hạt Vĩ Phi Đao"],
    [8, 1, "Kiếm Nhẫn", null, 143, "Hỏa Kiếm"],
    [9, 2, "Toàn Chân", "Kiếm Võ", 167, "Sơ Ảnh Kiếm"],
    [12, 1, "Tiêu Dao", "Chỉ Đoàn", 213, "Lạc Anh Kiếm"],
  ] as const;
  for (const [factionId, routeId, name, previousName, skillId, skillName] of replacements) {
    const route = factions.find(({ id }) => id === factionId)?.routes.find(({ id }) => id === routeId);
    assert.equal(route?.name, name);
    assert.equal(route.previousName, previousName);
    assert.equal(route.skills.find(({ id }) => id === skillId)?.name, skillName);
  }
});

test("faction wiki resolves the books and weapon requirements of all 24 branches", async () => {
  const factions = await loadFactionCatalog(path.resolve("../gameserver"));
  for (const faction of factions) {
    for (const route of faction.routes) {
      const level110 = route.skills.filter((skill) => skill.book && skill.requiredLevel === 110);
      const level130 = route.skills.filter((skill) => skill.book && skill.requiredLevel === 130);
      assert.equal(level110.length, 1);
      assert.equal(level130.length, 1);
      assert.equal(level110[0].book?.requiredLevel, 110);
      assert.equal(level130[0].book?.requiredLevel, 130);
      assert.equal(level110[0].book?.group, "Kỹ Năng Trấn Phái");
      assert.equal(level130[0].book?.group, "Tuyệt Kỹ Môn Phái");
      assert.equal(level110[0].book?.name, `[Kỹ Năng Trấn Phái] ${level110[0].name} (110)`);
      assert.equal(level130[0].book?.name, `[Tuyệt Kỹ Môn Phái] ${level130[0].name} (130)`);
      assert.equal(level130[0].weapon, level110[0].weapon, route.name);
      assert.equal(route.skills.filter((skill) => skill.book && skill.requiredLevel === 70).length, 1);
      assert.equal(route.skills.filter((skill) => skill.book && skill.requiredLevel === 1).length, 1);
      assert.equal(route.skills.filter(({ id }) => id === 10).length, 1);
    }
  }
  const level130Replacements = [
    [0, 1, 1750, "Phục Ma Quyền Pháp", "Tay không, Triền thủ", /ra quyền/i],
    [3, 1, 1758, "Bách Quỷ Phi Đao", "Phi đao", /phi đao tẩm độc/i],
    [7, 0, 1774, "Ngọc Nữ Hỏa Kiếm", "Kiếm", /kiếm khí/i],
    [11, 0, 1788, "Hàn Băng Kiếm Quyết", "Kiếm", /kiếm khí lạnh/i],
  ] as const;
  for (const [factionIndex, routeIndex, id, name, weapon, description] of level130Replacements) {
    const skill = factions[factionIndex].routes[routeIndex].skills.find((entry) => entry.id === id);
    assert.ok(skill, name);
    assert.equal(skill.name, name);
    assert.equal(skill.weapon, weapon);
    assert.match(skill.description, description);
    assert.equal(skill.book?.name, `[Tuyệt Kỹ Môn Phái] ${name} (130)`);
  }
  const tutien = factions[2].routes[1].skills.find(({ id }) => id === 1957);
  assert.equal(tutien?.name, "Thiên Hoa Loạn Kích");
  assert.equal(tutien?.book?.name, "[Kỹ Năng Trấn Phái] Thiên Hoa Loạn Kích (110)");
  assert.equal(factions[1].routes[1].skills.find(({ id }) => id === 1202)?.book?.requiredLevel, 70);
});

test("faction wiki shows skill-table details including the name of a level-120 skill", async () => {
  const factions = await loadFactionCatalog(path.resolve("../gameserver"));
  const skills = factions.find(({ id }) => id === 4)?.routes[1]?.skills;
  const dart = skills?.find(({ id }) => id === 86);
  assert.ok(dart);
  assert.equal(dart.requiredLevel, 10);
  assert.equal(dart.maxLevel, 20);
  assert.equal(dart.weapon, "Phi đao");
  assert.equal(dart.attackRadius, 520);
  assert.match(dart.description, /tấn công tầm xa/);
  const level120 = skills?.find(({ id }) => id === 834);
  assert.equal(level120?.name, "Tiểu Lý Tàng Đao");
  assert.equal(level120.requiredLevel, 120);
});

test("faction wiki shows both damage ranks for the three skills of each branch", async () => {
  const factions = await loadFactionCatalog(path.resolve("../gameserver"));
  for (const { routes } of factions) {
    for (const route of routes) {
      const compared = route.skills.filter(({ rankValues }) => rankValues);
      assert.deepEqual(compared.map(({ requiredLevel }) => requiredLevel), [90, 110, 130], route.name);
      assert.ok(compared.every(({ rankValues }) => rankValues?.[1] && rankValues[20]), route.name);
    }
  }
  const voDang = factions.flatMap(({ routes }) => routes).find(({ name }) => name === "Võ Đang");
  const chưởngNga = factions.flatMap(({ routes }) => routes).find(({ name }) => name === "Chưởng Nga");
  assert.match(voDang?.skills.find(({ id }) => id === 1792)?.rankValues?.[1] ?? "", /^105%/);
  assert.match(chưởngNga?.skills.find(({ id }) => id === 1962)?.rankValues?.[20] ?? "", /^146%.*3047–3724 băng$/);
});

test("faction wiki puts the skill tree first, orders both groups by level, and resolves game icons", async () => {
  const factions = await loadFactionCatalog(path.resolve("../gameserver"));
  const iconUrls = new Set<string>();
  for (const { routes } of factions) {
    for (const route of routes) {
      const order = route.skills.map(({ book, requiredLevel }) => [Number(!!book), requiredLevel]);
      assert.deepEqual(order, [...order].sort(([groupA, levelA], [groupB, levelB]) => groupA - groupB || levelA - levelB), route.name);
      for (const skill of route.skills) {
        assert.ok(skill.iconUrl, `Missing icon for ${skill.id} ${skill.name}`);
        assert.match(skill.iconUrl, /^\/skill-icons\/[\da-f]{20}\.png$/);
        iconUrls.add(skill.iconUrl);
      }
    }
  }
  await Promise.all(Array.from(iconUrls, async (url) => {
    const icon = await readFile(path.join("public", url));
    assert.equal(icon.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", url);
  }));
});
