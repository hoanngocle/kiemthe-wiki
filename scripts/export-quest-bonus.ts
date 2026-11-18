import { readFile, writeFile } from "node:fs/promises";
import { proposeQuestRewards, randomReputePool, type Quest } from "../lib/quest-wiki.ts";

const catalog: Quest[] = JSON.parse(await readFile(new URL("../../../.diagnostics/quest-rewards-20261109/original-catalog.json", import.meta.url), "utf8"));
const entries = catalog.flatMap((quest) => quest.quests.map((part, index) => ({
  taskId: quest.id, refId: part.id, subId: part.subId, name: part.name,
  repeat: quest.repeat, source: part.source, subSource: part.subSource,
  bonus: proposeQuestRewards(quest, part, index === quest.quests.length - 1),
})));
const output = { version: "20261109-v2", reputePool: randomReputePool, entries };
await writeFile(new URL("../docs/quest-bonus-20261109.json", import.meta.url), JSON.stringify(output, null, 2) + "\n");
console.log(JSON.stringify({ references: entries.length, reputationTypes: randomReputePool.length }));
