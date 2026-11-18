import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { loadShopCatalog, filterShopProducts, parseShopTable } from "../lib/shop-wiki.ts";
import { groupShopProducts } from "../lib/shop-wiki-types.ts";

test("shop tables preserve empty cells and reject blank rows", () => {
  assert.deepEqual(parseShopTable("\ufeffId\tPrice\tName\r\n1\t\tÁo\r\n\t\t\r\n"), [{ Id: "1", Price: "", Name: "Áo", _line: "2" }]);
});

test("VIP catalog joins all reachable products to their actual payment items", async () => {
  const catalog = await loadShopCatalog(path.resolve("../gameserver"));
  assert.equal(catalog.shops.length, 19);
  assert.equal(catalog.products.length, 1008);
  assert.ok(catalog.products.every((p) => !["5138", "5139", "5140", "5141", "5142"].includes(p.goodsId)));
  const seal = catalog.products.find((p) => p.goodsId === "4932")!;
  assert.equal(seal.currency, "Chiến Thần");
  assert.equal(seal.currencyId, "18,1,3072,1");
  assert.equal(seal.amount, 100);
  assert.ok(seal.conditions.some((c) => c.includes("7 ngày")));
  assert.equal(catalog.products.find((p) => p.goodsId === "5004")?.currency, "Thẻ Tích Lũy Sự Kiện");
  assert.equal(catalog.products.find((p) => p.goodsId === "6004")?.currency, "Kim Nguyên Bảo Đại");
  assert.equal(catalog.products.find((p) => p.goodsId === "5266")?.amount, 1);
  assert.equal(catalog.products.find((p) => p.goodsId === "5266")?.currency, "Kim Nguyên Bảo Đại");
  const addedGroups = [
    ["214", "Sát Thần Bạch Long Giáp", 2],
    ["219", "Sát Thần Vô Danh Giới", 2],
    ["221", "Sát Thần Thiên Long Phù", 2],
    ["214", "Hồng Bào Bạch Hổ Gia", 5],
    ["214", "Ngọc Sam Bạch Hổ Gia", 5],
    ["213", "Thiên Mão Bạch Hổ Gia", 5],
    ["213", "Phát Kết Bạch Hổ Gia", 5],
  ] as const;
  for (const [shop, name, price] of addedGroups) {
    const items = catalog.products.filter((p) => p.shopId === shop && p.name === name);
    assert.equal(items.length, 5, name);
    assert.ok(items.every((p) => p.currencyId === "18,1,1338,1" && p.amount === price));
  }
  const sieuThan = catalog.products.filter((p) => p.shopId === "195");
  assert.equal(sieuThan.length, 95);
  assert.ok(sieuThan.every((p) => p.amount === 7 && p.currencyId === "18,1,1338,1"
    && p.conditions.filter((c) => c.endsWith("(tối đa)")).length === 6
    && p.conditions.includes("Danh vọng Chúc Phúc cấp 10 (tối đa)")));
  const smallToken = catalog.products.find((p) => p.itemId === "18,1,1251,1")!;
  assert.equal(smallToken.description, "Sử dụng nhận được 860 điểm danh vọng Chúc phúc");
  assert.equal(smallToken.reputation, "Chúc phúc");
  assert.ok(catalog.products.filter((p) => p.itemId.startsWith("18,1,1251,")).every((p) => p.description.startsWith("Sử dụng nhận được ") && !p.description.includes("Tiểu Long Nữ") && !p.description.includes("Nhấn chuột phải")));
  assert.equal(catalog.products.find((p) => p.goodsId === "5316")?.reputation, "Chúc phúc");
  assert.equal(seal.reputation, null);
  const ambiguous = catalog.products.find((p) => p.itemId === "4,9,2273,10")!;
  assert.equal(ambiguous.amount, 6);
  assert.equal(ambiguous.priceOptions.length, 0);
  assert.ok(catalog.products.every((p) => p.name && p.description && p.source && (p.amount === null || Number.isFinite(p.amount))));
  const filtered = filterShopProducts(catalog.products, { query: "the tich luy", shop: "210" });
  assert.equal(filtered.length, 15);
  assert.equal(filterShopProducts(catalog.products, { query: "zzzzkhongtontai" }).length, 0);
  assert.equal(filterShopProducts(catalog.products, { currency: "18,1,476,1" }).length, 153);
  const hats = catalog.products.filter((p) => p.shopId === "213");
  const grouped = groupShopProducts(hats);
  assert.ok(grouped.length < hats.length);
  assert.equal(grouped.reduce((sum, p) => sum + p.variantCount, 0), hats.length);
  const fiveElements = grouped.find((p) => p.name === "[Thiên Vũ] Thanh Hồng Tiên Cân")!;
  assert.deepEqual(fiveElements.systems, ["Kim", "Mộc", "Thủy", "Hỏa", "Thổ"]);
  assert.equal(fiveElements.variantCount, 5);
  assert.equal(groupShopProducts([{ ...hats[0], amount: 1 }, { ...hats[0], amount: 2 }]).length, 2);
  assert.equal(groupShopProducts(catalog.products.filter((p) => p.shopId === "210")).length, 15);
  for (let shopId = 214; shopId <= 221; shopId++) {
    const products = catalog.products.filter((p) => p.shopId === String(shopId));
    const rows = groupShopProducts(products);
    assert.ok(rows.length < products.length, `Shop ${shopId} should group elemental variants`);
    assert.equal(rows.reduce((sum, p) => sum + p.variantCount, 0), products.length);
    assert.ok(rows.some((p) => p.systems.length === 5));
  }
  const sand = catalog.products.filter((p) => p.shopId === "194");
  const sandGroups = groupShopProducts(sand);
  assert.ok(sandGroups.length < sand.length);
  assert.equal(sandGroups.reduce((sum, p) => sum + p.variantCount, 0), 83);
  const spear = sandGroups.filter((p) => p.name === "Thần Sa-Bá Vương Kích");
  assert.equal(spear.length, 4); // Preserve nội lực/TDXC and Kháng/Hiệu ứng builds.
  assert.equal(spear.filter((p) => p.systems.length === 5).length, 2);
  assert.equal(spear.filter((p) => p.description.includes("Hiệu ứng")).length, 2);
});

test("missing template prices stay unknown; dangling goods fail visibly", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "kiemthe-shop-test-"));
  try {
    await mkdir(path.join(root, "setting/shop"), { recursive: true });
    await mkdir(path.join(root, "setting/item"), { recursive: true });
    await mkdir(path.join(root, "setting/player"), { recursive: true });
    await writeFile(path.join(root, "setting/player/repute.xml"), "<repute />");
    const ids = [210, 204, 206, 207, 213, 214, 215, 216, 217, 218, 219, 220, 221, 195, 205, 194, 209, 167, 190];
    await writeFile(path.join(root, "setting/shop/buysell.txt"), "ShopId\tItem1\n" + ids.map((id) => `${id}\t${id === 213 ? "1" : ""}`).join("\n"));
    await writeFile(path.join(root, "setting/shop/sieuthan-repute.txt"), "Camp\tClass\tLevel\tName\n");
    await writeFile(path.join(root, "setting/gamesetting.ini"), "[Coin]\nnCount=0\n");
    const goodsFile = path.join(root, "setting/shop/goods.txt");
    await writeFile(goodsFile, "Id\tName\tGenre\tDetailType\tParticularType\tLevel\n1\tÁo thử\t4\t3\t1\t10\n");
    const catalog = await loadShopCatalog(root);
    assert.equal(catalog.products[0].amount, null);
    assert.ok(catalog.products[0].conditions.some((c) => c.includes("Chưa xác định")));
    await writeFile(goodsFile, "Id\tName\n");
    await assert.rejects(loadShopCatalog(root), /Missing goods 1 in shop 213/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
