import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, rm, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseItemTable, searchItems, readItemCatalog, groupItemVariants } from "../lib/item-wiki.ts";
import { summarizeItem } from "../lib/item-wiki-summary.ts";

const variantColumns = ["Name", "Genre", "DetailType", "ParticularType", "Level", "Icon", "Kind", "Series", "QualityPrefix", "Category", "ClassName", "Intro"];
function variants(rows: string[][]) {
  return parseItemTable([variantColumns.join("\t"), ...rows.map((row) => row.join("\t"))].join("\n"), "001/equip/purple/armor.txt");
}
const equipment = (particular: string, series: string, sex: string, quality = "3", level = "10", purpose = "") =>
  ["Thiên Vũ Giáp", "2", "3", particular, level, `\\image\\${sex}.spr`, `Trang bị xanh_Thiên Vũ Giáp ${sex} hệ ${series}`, series, quality, "1", "equip", purpose];

test("retains base value and explicit name color for rarity display", () => {
  const [item] = parseItemTable("Name\tGenre\tDetailType\tParticularType\tLevel\tIcon\tItemValue\n<color=purple>Già Lam Kinh<color>\t1\t14\t25\t4\tbook.spr\t1000000", "001/equip/general/book.txt");
  assert.equal(item.name, "Già Lam Kinh");
  assert.equal(item.baseValue, 1000000);
  assert.equal(item.nameColor, "purple");
});

test("groups gender and elemental variants, counts distinct elements and retains every ID/source", () => {
  const rows = variants([equipment("1", "1", "nam"), equipment("2", "1", "nữ"), equipment("3", "2", "nam"), equipment("4", "2", "nữ")]);
  const grouped = groupItemVariants(rows);
  assert.equal(grouped.length, 1);
  assert.deepEqual(grouped[0].systems, [1, 2]);
  assert.equal(grouped[0].recordCount, 4);
  assert.deepEqual(grouped[0].ids, ["2,3,1,10", "2,3,2,10", "2,3,3,10", "2,3,4,10"]);
  assert.equal(grouped[0].variants.length, 4);
  assert.ok(!/\bnam\b|nữ/.test(grouped[0].kind));
  assert.equal(searchItems(grouped, { query: "2, 3, 4, 10" }).total, 1);
  assert.equal(searchItems(grouped, { query: "2,3,3" }).total, 1);
  assert.equal(rows[0].recordCount, 1, "grouping must not mutate original templates");
});
test("merges equipment by name and retains levels, rarity, combat types and descriptions", () => {
  const base = equipment("1", "1", "nam");
  const pve = [...base]; pve[6] = "Trang bị tím PVE_Thiên Vũ Giáp nam hệ Kim";
  const pvp = [...pve]; pvp[6] = "Trang bị tím PVP_Thiên Vũ Giáp nữ hệ Mộc";
  const inner = [...base]; inner[6] = "Trang bị xanh_Thiên Vũ Giáp nội công hệ Kim";
  const outer = [...base]; outer[6] = "Trang bị xanh_Thiên Vũ Giáp ngoại công hệ Kim";
  const grouped = groupItemVariants(variants([base, equipment("2", "2", "nữ", "4"), equipment("3", "2", "nữ", "3", "11"), equipment("4", "2", "nữ", "3", "10", "Chức năng khác"), pve, pvp, inner, outer]));
  assert.equal(grouped.length, 1);
  assert.deepEqual(grouped[0].levels, [10, 11]);
  assert.deepEqual(grouped[0].qualities, ["Xanh", "Tím"]);
  assert.ok(grouped[0].kinds.some((kind) => kind.includes("PVE")));
  assert.ok(grouped[0].kinds.some((kind) => kind.includes("PVP")));
  assert.ok(grouped[0].kinds.some((kind) => kind.includes("nội công")));
  assert.ok(grouped[0].kinds.some((kind) => kind.includes("ngoại công")));
  assert.equal(grouped[0].description, "Chức năng khác");
});
test("random series permits five elements while zero is not counted as an element", () => {
  const grouped = groupItemVariants(variants([equipment("1", "-1", "nam"), equipment("2", "1", "nữ"), equipment("3", "0", "nam")]));
  assert.equal(grouped.length, 1);
  assert.deepEqual(grouped[0].systems, [1, 2, 3, 4, 5]);
  assert.deepEqual(groupItemVariants(variants([equipment("4", "0", "nam")]))[0].systems, []);
});
test("merges all same-name items across IDs, levels and categories without losing search matches", () => {
  const text = "Name\tGenre\tDetailType\tParticularType\tLevel\tIcon\tKind\tIntro\n";
  const first = parseItemTable(text + "Túi quà\t18\t1\t1\t1\t\tMở túi\tNhận bạc", "001/other/scriptitem.txt");
  const second = parseItemTable(text + "Túi quà\t20\t2\t2\t2\t\tQuà đặc biệt\tNhận vàng", "001/other/presentitem.txt");
  const grouped = groupItemVariants([...first, ...second]);
  assert.equal(grouped.length, 1);
  assert.deepEqual(grouped[0].levels, [1, 2]);
  assert.deepEqual(grouped[0].kinds, ["Mở túi", "Quà đặc biệt"]);
  assert.deepEqual(grouped[0].descriptions, ["Nhận bạc", "Nhận vàng"]);
  assert.equal(searchItems(grouped, { query: "20,2,2,2" }).total, 1);
  assert.equal(searchItems(grouped, { query: "nhan vang", category: "Túi quà" }).total, 1);
  assert.equal(searchItems(grouped, { category: "Vật phẩm chức năng" }).total, 1);
  assert.equal(first[0].recordCount, 1);
});
test("preserves equipment build suffixes beyond sex and element", () => {
  const first = equipment("351", "4", "nam"); first[6] = "Bộ Trục Lộc Cam_Lưng nam hệ Kim";
  const second = [...first]; second[3] = "457"; second[6] += " 2";
  const grouped = groupItemVariants(variants([first, second]));
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].kinds.length, 2);
});
test("groups elemental faction labels but retains unrelated parenthesized functionality", () => {
  const first = equipment("1", "1", "nam"); first[6] = "Trang bị xanh_Thiên Vũ Giáp (Côn Thiếu, Thiên Vương)";
  const second = equipment("2", "2", "nữ"); second[6] = "Trang bị xanh_Thiên Vũ Giáp (Chỉ Đoàn)";
  const third = [...second]; third[6] = "Trang bị xanh_Thiên Vũ Giáp (phiên bản cao cấp)";
  const grouped = groupItemVariants(variants([first, second, third]));
  assert.equal(grouped.length, 1);
  assert.ok(grouped[0].kinds.some((kind) => kind.includes("phiên bản cao cấp")));
});
test("ignores explicit gender suffixes and requirements without losing original sources", () => {
  const first = equipment("1", "1", "nam"); first[0] += " (Nam)";
  const second = equipment("2", "2", "nữ"); second[0] += " (Nữ)";
  const text = [[...variantColumns, "ReqProp1Type", "ReqProp1Value"].join("\t"), [...first, "8", "0"].join("\t"), [...second, "8", "1"].join("\t")].join("\n");
  const grouped = groupItemVariants(parseItemTable(text, "001/equip/purple/armor.txt"));
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].name, "Thiên Vũ Giáp");
  assert.deepEqual(grouped[0].variants.map((variant) => variant.line), [2, 3]);
});

const table = "\uFEFFName\tGenre\tDetailType\tParticularType\tLevel\tIcon\tKind\tIntro\tHelp\r\nHuyền Tinh Cấp 1\t18\t1\t1\t1\t\\image\\test.spr\tHuyền tinh\t<color=gold>Cường hóa<color><enter>trang bị\tDã Luyện Đại Sư\r\nBản khác\t18\t1\t1\t1\t\t\t\t\r\nDòng hỏng\t\t1\t1\t1\t\t\t\t";
test("TSV uses GDPL rather than ObjID, strips game formatting, keeps repeated IDs and source lines", () => {
  const items = parseItemTable(table, "001/other/test.txt");
  assert.equal(items.length, 2);
  assert.equal(items[0].id, "18,1,1,1");
  assert.equal(items[0].description, "Cường hóa\ntrang bị\nDã Luyện Đại Sư");
  assert.equal(items[0].line, 2);
  assert.equal(items[0].source, "001/other/test.txt");
  assert.notEqual(items[0].key, items[1].key);
  assert.equal(parseItemTable("Name\tValue\nnot an item\t1", "other.txt").length, 0);
  assert.equal(parseItemTable("Name\tGenre\tDetailType\tParticularType\tLevel\tAmount\nQuà mở rương\t18\t1\t1\t1\t5", "randomitem.txt").length, 0);
});
test("search spans all rows, ignores Vietnamese accents, accepts spaced IDs and clamps pages", () => {
  const items = parseItemTable(table, "001/other/test.txt");
  assert.equal(searchItems(items, { query: "huyen tinh cuong hoa" }).total, 1);
  assert.equal(searchItems(items, { query: "18, 1, 1, 1" }).total, 2);
  assert.equal(searchItems(items, { query: "18 1 1 1" }).total, 2);
  assert.equal(searchItems(items, { query: "khong co" }).total, 0);
  const last = searchItems(items, { page: 999, pageSize: 1 });
  assert.equal(last.page, 2);
  assert.equal(last.items[0].name, "Bản khác");
  assert.equal(searchItems(items, { category: "missing" }).total, 0);
  assert.equal(searchItems(items, { page: NaN, pageSize: Infinity }).page, 1);
});

test("keeps rewards and sources in the compact item entry while removing click instructions and lore", () => {
  const [item] = parseItemTable(
    "Name\tGenre\tDetailType\tParticularType\tLevel\tIcon\tIntro\tHelp\nRương thử\t18\t1\t99999\t1\t\tMột món đồ bí ẩn.<enter>Nhấp chuột phải mở ra sẽ nhận được 100 điểm kinh nghiệm.<enter>Phần thưởng từ Tống Kim.\tNhấn chuột phải để mở.",
    "001/other/scriptitem.txt",
  );
  assert.deepEqual(summarizeItem(item), ["Mở nhận 100 điểm kinh nghiệm.", "Phần thưởng từ Tống Kim."]);
  assert.equal(searchItems([item], { query: "mon do bi an" }).total, 1);
});

test("uses verified concise notes for curated items without exposing the walkthrough", () => {
  const [item] = parseItemTable(
    "Name\tGenre\tDetailType\tParticularType\tLevel\tIcon\tIntro\nLinh Khí\t18\t1\t3071\t1\t\tMảnh ghép cực phẩm, dùng để nâng cấp vật phẩm",
    "001/other/scriptitem.txt",
  );
  const summary = summarizeItem(item);
  assert.equal(summary.length, 2);
  assert.match(summary[0], /Tử Điệp.*5\.000.*20 KNB Đại/);
  assert.match(summary[1], /Túi Nguyên Liệu Nâng Cấp.*150/);
  assert.doesNotMatch(summary.join(" "), /kích hoạt|để trong hành trang/i);
  assert.match(item.description, /Tử Điệp: kích hoạt cấp 1/);
});

test("keeps only distinct core facts across grouped variants", () => {
  const [item] = groupItemVariants(variants([
    equipment("1", "1", "nam", "3", "10", "Dùng để đổi trang bị.\nNhấn chuột phải để dùng."),
    equipment("2", "2", "nữ", "3", "10", "Dùng để đổi trang bị.\nNhấp phải sử dụng."),
  ]));
  assert.deepEqual(summarizeItem(item), ["Đổi trang bị."]);
  assert.equal(searchItems([item], { query: "2,3,2,10" }).total, 1);
});
test("recursive catalog reads every item table without backups or truncation and refreshes changed files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "item-wiki-"));
  try {
    await mkdir(path.join(root, "nested"));
    await writeFile(path.join(root, "a.txt"), table);
    await writeFile(path.join(root, "nested", "b.txt"), table);
    await writeFile(path.join(root, "a.txt.bak"), table);
    assert.equal((await readItemCatalog(root)).items.length, 4);
    await writeFile(path.join(root, "a.txt"), table.split("\r\n").slice(0, 2).join("\n"));
    assert.equal((await readItemCatalog(root)).items.length, 3);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("real game catalog includes every valid row and later custom items", async () => {
  const root = path.resolve("../gameserver/setting/item");
  const catalog = await readItemCatalog(root);
  let expected = 0;
  async function count(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await count(file);
      else if (entry.name.endsWith(".txt")) {
        const lines = (await readFile(file, "utf8")).replace(/^\uFEFF/, "").split(/\r?\n/);
        const columns = lines[0].split("\t");
        const names = ["Name", "Genre", "DetailType", "ParticularType", "Level"];
        if (!columns.includes("Icon")) continue;
        if (!names.every((name) => columns.includes(name))) continue;
        for (const line of lines.slice(1)) {
          const cells = line.split("\t");
          if (cells[columns.indexOf("Name")]?.trim() && names.slice(1).every((name) => /^\d+$/.test(cells[columns.indexOf(name)]?.trim() ?? ""))) expected++;
        }
      }
    }
  }
  await count(root);
  assert.ok(expected > 18000);
  assert.equal(catalog.items.length, expected);
  assert.ok(catalog.items.some((item) => item.id === "18,1,1338,3" && item.name === "Tiểu Kim Nguyên Bảo"));
  assert.ok(catalog.files > 40);
  const grouped = groupItemVariants(catalog.items);
  assert.equal(new Set(grouped.map((item) => item.name)).size, grouped.length, "every item name must appear only once in the wiki");
  assert.ok(grouped.length < catalog.items.length);
  assert.equal(grouped.reduce((sum, item) => sum + item.recordCount, 0), expected);
  assert.deepEqual(new Set(grouped.flatMap((item) => item.ids)), new Set(catalog.items.map((item) => item.id)));
  assert.deepEqual(new Set(grouped.flatMap((item) => item.variants.map((variant) => `${variant.source}:${variant.line}`))), new Set(catalog.items.map((item) => item.key)));
  assert.ok(grouped.every((item) => item.systems.length <= 5 && item.systems.every((series) => series >= 1 && series <= 5)));
  const cuffs = grouped.filter((item) => item.name === "Tiêu Dao Nộ Long Hộ Uyển");
  assert.equal(cuffs.length, 1);
  assert.deepEqual(cuffs[0].qualities, ["Xanh", "Tím", "Cam"]);
  assert.equal(cuffs[0].description, "");
  assert.ok(cuffs.some((item) => item.recordCount >= 5 && item.systems.length === 5));
});
