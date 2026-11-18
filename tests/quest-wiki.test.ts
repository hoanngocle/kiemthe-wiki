import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { filterQuests, factionQuestGroup, proposeQuestRewards, configuredQuestRewards, randomReputePool, type Quest, type QuestPart } from "../lib/quest-wiki.ts";

const quests = [
  { id: 1, name: "Tứ Diện Sở Ca", type: 1, quests: [{ name: "Anh Cô Trở Về", acceptNpc: "Quý tổng quản", awards: [{ label: "Huyền Tinh", itemId: "18,1,114,5" }] }] },
  { id: 25, name: "Mưu Kế Thâm Sâu", type: 2, description: "", quests: [] },
] as unknown as Quest[];

test("Wiki displays installed bonus amounts instead of recalculating the proposal", () => {
  const part = { balanceLevel: 20, awards: [
    { group: "bonus", kind: "coin", amount: 777 },
    { group: "bonus", kind: "makepoint", amount: 222 },
    { group: "bonus", kind: "item", amount: 2, itemId: "18,1,114,8" },
  ] } as unknown as QuestPart;
  const result = configuredQuestRewards({ type: 1, repeat: false } as Quest, part, true);
  assert.equal(result.coin, 777);
  assert.equal(result.make, 222);
  assert.equal(result.silver, 0);
  assert.equal(result.repute, 0);
  assert.equal(result.crystal, 8);
  assert.equal(result.crystalCount, 2);
  assert.equal(result.spirit, 0);
});

test("faction filter covers all 12 schools without classifying faction story names as school tasks", async () => {
  const catalog: Quest[] = JSON.parse(await readFile(new URL("../lib/quest-catalog.json", import.meta.url), "utf8"));
  const school = filterQuests(catalog, "", "mon-phai");
  assert.equal(school.reduce((sum, quest) => sum + quest.quests.length, 0), 72);
  assert.equal(school.filter((quest) => factionQuestGroup(quest) === "Môn phái cấp 20/30/40").length, 36);
  assert.equal(school.filter((quest) => factionQuestGroup(quest) === "Tiếp dẫn môn phái").length, 12);
  assert.equal(school.filter((quest) => factionQuestGroup(quest) === "Kỹ năng cấp 110").length, 12);
  assert.ok(!school.some((quest) => quest.id === 5 || quest.id === 52));
  const source = await readFile(new URL("../../gameserver/script/item/class/xiulianzhu.lua", import.meta.url), "utf8");
  const ids = [...source.matchAll(/\{\s*(0x[0-9a-f]+),\s*0x[0-9a-f]+\s*\}/gi)].map((match) => parseInt(match[1], 16));
  assert.equal(ids.length, 36);
  assert.deepEqual(school.filter((quest) => factionQuestGroup(quest) === "Môn phái cấp 20/30/40").map((quest) => quest.id).sort((a, b) => a - b), ids.sort((a, b) => a - b));
});

test("finds unaccented child names, reward names and item IDs within a quest chain", () => {
  for (const query of ["anh co tro ve", "quy tong quan", "huyen tinh", "18,1,114,5", "1"]) {
    assert.deepEqual(filterQuests(quests, query, "all").map((quest) => quest.id), [1]);
  }
});

test("combines category and text filters without changing chain order", () => {
  assert.deepEqual(filterQuests(quests, "", "2").map((quest) => quest.id), [25]);
  assert.equal(filterQuests(quests, "thu dien", "2").length, 0);
  assert.deepEqual(filterQuests(quests, "", "all").map((quest) => quest.id), [1, 25]);
});

test("catalog includes every loader-addressable XML chain and every child in source order", async () => {
  const catalog: Quest[] = JSON.parse(await readFile(new URL("../lib/quest-catalog.json", import.meta.url), "utf8"));
  const sourceRoot = new URL("../../gameserver/task_publish/task/", import.meta.url);
  const files = (await readdir(sourceRoot)).filter((file) => /^[0-9a-f]{16}\.xml$/i.test(file) && parseInt(file, 16) <= 600);
  assert.equal(catalog.length, files.length);
  assert.equal(new Set(catalog.map((quest) => quest.id)).size, catalog.length);
  for (const file of files) {
    const id = parseInt(file, 16);
    const quest = catalog.find((entry) => entry.id === id);
    assert.ok(quest, `Missing chain ${file}`);
    const xml = await readFile(new URL(file, sourceRoot), "utf8");
    const references = [...xml.matchAll(/<Sub\b[^>]*\bid="([0-9a-f]+)"[^>]*\brefer="([0-9a-f]+)"/gi)];
    assert.deepEqual(quest.quests.map((part) => [part.id, part.subId]), references.map((match) => [parseInt(match[1], 16), parseInt(match[2], 16)]), file);
    assert.ok(quest.quests.every((part) => part.hasSub), `${file}: unresolved child definition`);
    const bonusCount = (xml.match(/szQuestBalanceVersion=/g) ?? []).length;
    const declaredAwards = (xml.match(/szType=/g) ?? []).length - bonusCount;
    assert.equal(quest.quests.reduce((sum, part) => sum + part.awards.filter((award) => !["step", "bonus", "upgrade"].includes(award.group)).length, 0), declaredAwards, `${file}: original reward coverage`);
  }
});

test("proposals preserve higher rewards and never count conditional or choice rewards as guaranteed", () => {
  const part = { balanceLevel: 20, awards: [
    { kind: "money", amount: 15000, group: "fixed", conditions: [], note: "" },
    { kind: "makepoint", amount: 1000, group: "choice", conditions: [], note: "" },
    { kind: "gatherpoint", amount: 1000, group: "fixed", conditions: ["Hệ Kim"], note: "" },
  ] } as unknown as QuestPart;
  const result = proposeQuestRewards({ type: 1, repeat: false } as Quest, part, true);
  assert.equal(result.silver, 0);
  assert.equal(result.make, 0);
  assert.equal(result.gather, 0);
  assert.equal(result.crystal, 6);
  assert.equal(result.crystalCount, 2);
  const repeated = proposeQuestRewards({ type: 1, repeat: true } as Quest, part, true);
  assert.equal(repeated.coin, 1500);
  assert.equal(repeated.crystal, null);
  assert.equal(repeated.repute, 15);
});

test("regular coin proposal does not subtract locked coins and reputation describes a random pool", async () => {
  const part = { balanceLevel: 20, awards: [
    { kind: "bindcoin", amount: 9999, group: "fixed", conditions: [], note: "" },
  ] } as unknown as QuestPart;
  const result = proposeQuestRewards({ type: 1, repeat: false } as Quest, part, false);
  assert.equal(result.coin, 1500);
  assert.equal(result.coinType, "coin");
  assert.equal(result.reputeMode, "random-one");
  assert.equal(randomReputePool.length, 7);
  assert.equal(new Set(randomReputePool.map((entry) => entry.camp)).size, 3);
  assert.ok(randomReputePool.some((entry) => entry.camp === 1 && entry.classId === 1));
  assert.deepEqual(randomReputePool.map((entry) => `${entry.camp}/${entry.classId}`), ["1/1", "1/2", "2/1", "2/2", "2/3", "5/1", "5/3"]);
  assert.equal(new Set(randomReputePool.map((entry) => `${entry.camp}/${entry.classId}`)).size, randomReputePool.length);
  const xml = await readFile(new URL("../../gameserver/setting/player/repute.xml", import.meta.url), "utf8");
  for (const entry of randomReputePool) {
    const camp = [...xml.matchAll(/<camp\b[^>]*id="(\d+)"[^>]*>([\s\S]*?)<\/camp>/g)].find((match) => Number(match[1]) === entry.camp);
    assert.ok(camp, `Missing camp ${entry.camp}`);
    assert.match(camp[2], new RegExp(`<class\\b[^>]*id="${entry.classId}"\\s+name=`));
  }
});


test("coin and reputation increase every ten levels and total energy is exactly fifteen times original", () => {
  for (const [level, coin, repute] of [[1,500,5], [9,500,5], [10,1000,10], [19,1000,10], [20,1500,15], [99,5000,50], [100,5500,55]]) {
    const part = { balanceLevel: level, awards: [
      { group: "fixed", kind: "makepoint", amount: 10, conditions: [], note: "" },
      { group: "step", kind: "gatherpoint", amount: 20, conditions: [], note: "" },
    ] } as unknown as QuestPart;
    const reward = proposeQuestRewards({ type: 2, repeat: false } as Quest, part, false);
    assert.equal(reward.coin, coin);
    assert.equal(reward.repute, repute);
    assert.equal(reward.make + 10, 150);
    assert.equal(reward.gather + 20, 300);
  }
});
