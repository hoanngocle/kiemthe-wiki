import { readFile } from "node:fs/promises";
import path from "node:path";
import { cleanItemText, readItemCatalog } from "./item-wiki.ts";
import type { ShopCatalog, ShopProduct } from "./shop-wiki-types.ts";
export { filterShopProducts } from "./shop-wiki-types.ts";

type Row = Record<string, string>;
export function parseShopTable(text: string): Row[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const columns = lines[0].split("\t");
  return lines.slice(1).flatMap((line, index) => {
    if (!line.trim()) return [];
    const cells = line.split("\t");
    return [{ ...Object.fromEntries(columns.flatMap((column, i) => column ? [[column, cells[i]?.trim() ?? ""]] : [])), _line: String(index + 2) }];
  });
}
const branches: [number, string, number][] = [
  [210, "Tích Lũy Sự Kiện", 3], [204, "Quan Ấn Chiến Trường", 3],
  [206, "Ngoại Trang · Áo", 3], [207, "Ngoại Trang · Nón", 3],
  [213, "Trang Bị · Mũ Cao Cấp", 3], [214, "Trang Bị · Áo Cao Cấp", 3],
  [215, "Trang Bị · Đai Lưng Cao Cấp", 3], [216, "Trang Bị · Hộ Uyển Cao Cấp", 3],
  [217, "Trang Bị · Giày Cao Cấp", 3], [218, "Trang Bị · Hạng Liên Cao Cấp", 3],
  [219, "Trang Bị · Nhẫn Cao Cấp", 3], [220, "Trang Bị · Ngọc Bội Cao Cấp", 3],
  [221, "Trang Bị · Hộ Phù Cao Cấp", 3], [195, "Trang Bị Siêu Thần", 3], [205, "Võ Công Trấn Phái", 3],
  [194, "Thần Sa", 3], [209, "Đặc Biệt", 3], [167, "Du Long", 3], [190, "Phi Phong", 3],
];
const number = (value: string | undefined) => value && /^\d+(\.\d+)?$/.test(value) ? Number(value) : null;

export async function loadShopCatalog(root: string, icons: Record<string, string> = {}): Promise<ShopCatalog> {
  const read = async (file: string) => {
    const bytes = await readFile(path.join(root, file));
    try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
    catch { return new TextDecoder("gb18030").decode(bytes); }
  };
  const [buyText, goodsText, ini, catalog, reputeXml, sieuThanText] = await Promise.all([
    read("setting/shop/buysell.txt"), read("setting/shop/goods.txt"), read("setting/gamesetting.ini"),
    readItemCatalog(path.join(root, "setting/item")),
    read("setting/player/repute.xml"),
    read("setting/shop/sieuthan-repute.txt"),
  ]);
  const sieuThanConditions = parseShopTable(sieuThanText)
    .map((row) => `Danh vọng ${row.Name} cấp ${row.Level} (tối đa)`);
  const reputations = new Map<string, string>();
  for (const camp of reputeXml.replace(/<!--[\s\S]*?-->/g, "").matchAll(/<camp\b([^>]*)>([\s\S]*?)<\/camp>/g)) {
    const campId = camp[1].match(/\bid="(\d+)"/)?.[1];
    for (const group of camp[2].matchAll(/<class\b([^>]*)>/g)) {
      const classId = group[1].match(/\bid="(\d+)"/)?.[1];
      const name = group[1].match(/\bname="([^"]*)"/)?.[1];
      if (campId && classId && name) reputations.set(`${campId}/${classId}`, name.replace(/&amp;/g, "&"));
    }
  }
  const shops = new Map(parseShopTable(buyText).map((row) => [row.ShopId, row]));
  const goods = new Map(parseShopTable(goodsText).map((row) => [row.Id, row]));
  const templates = new Map<string, typeof catalog.items>();
  for (const item of catalog.items) {
    const list = templates.get(item.id) ?? [];
    list.push(item); templates.set(item.id, list);
  }
  const iniCoins = ini.match(/^\[Coin\]\s*\r?\n([\s\S]*?)(?=^\[|$(?![\s\S]))/m)?.[1] ?? "";
  const coinParams = new Map([...iniCoins.matchAll(/^CoinParam(\d+)_(\d+)\s*=\s*(\d+)/gm)].map((m) => [`${m[1]}_${m[2]}`, m[3]]));
  const sourceRows = new Map<string, Row[]>();
  const templateRow = async (item: (typeof catalog.items)[number]) => {
    if (!sourceRows.has(item.source)) sourceRows.set(item.source, parseShopTable(await read(`setting/item/${item.source}`)));
    return sourceRows.get(item.source)!.find((v) => v._line === String(item.line));
  };
  const products: ShopProduct[] = [];
  for (const [shopId, shopName, mode] of branches) {
    const shop = shops.get(String(shopId));
    if (!shop) throw new Error(`Missing VIP shop ${shopId}`);
    for (const [column, goodsId] of Object.entries(shop)) {
      if (!/^Item\d+$/.test(column) || !goodsId || goodsId === "0") continue;
      const row = goods.get(goodsId);
      if (!row) throw new Error(`Missing goods ${goodsId} in shop ${shopId}`);
      const itemId = [row.Genre, row.DetailType, row.ParticularType, row.Level].join(",");
      const variants = templates.get(itemId) ?? [];
      const exact = variants.filter((v) => v.series === Number(row.Series));
      const random = variants.filter((v) => v.series === -1);
      const candidates = exact.length ? exact : random.length ? random : variants;
      const item = candidates.find((v) => v.name === cleanItemText(row.Name)) ?? candidates[0];
      const currencyId = mode === 1 ? "silver" : [1, 2, 3, 4].map((i) => coinParams.get(`${row.goodsindex}_${i}`) ?? "?").join(",");
      const currency = mode === 1 ? "Bạc thường" : templates.get(currencyId)?.[0]?.name ?? `Chưa rõ tiền đổi #${row.goodsindex}`;
      let amount = number(row.goodsprice);
      const priceOptions: ShopProduct["priceOptions"] = [];
      if (mode === 1) {
        amount = null;
        for (const candidate of candidates) {
          const raw = await templateRow(candidate);
          priceOptions.push({ amount: number(raw?.Price), source: `setting/item/${candidate.source}:${candidate.line}` });
        }
        const distinct = new Set(priceOptions.map((p) => p.amount));
        if (distinct.size === 1) amount = priceOptions[0].amount;
      }
      const conditions: string[] = [];
      if (shopId === 195) conditions.push(...sieuThanConditions);
      if (row.Bind === "1") conditions.push("Khóa khi mua");
      if (Number(row.Series) > 0) conditions.push(`Hệ ${["", "Kim", "Mộc", "Thủy", "Hỏa", "Thổ"][Number(row.Series)] ?? row.Series}`);
      else if (shopId === 194 && item) {
        for (const series of item.systems) conditions.push(`Hệ ${["", "Kim", "Mộc", "Thủy", "Hỏa", "Thổ"][series]}`);
      }
      if (Number(row.ReputeLevel) > 0) conditions.push(`Danh vọng ${row.ReputeCamp}/${row.ReputeClass} cấp ${row.ReputeLevel}`);
      if (Number(row.honor) > 0) conditions.push(`Vinh dự cấp ${row.honor}`);
      const minutes = Number(row.timeout);
      if (minutes > 0) conditions.push(`Hạn dùng ${minutes % 1440 === 0 ? `${minutes / 1440} ngày` : `${minutes} phút`}`);
      if (!item) conditions.push("Chưa tìm thấy mẫu vật phẩm tương ứng");
      const conflictingPrices = new Set(priceOptions.map((p) => p.amount)).size > 1;
      if (conflictingPrices) conditions.push("Nhiều mẫu trùng mã có giá khác nhau; cần kiểm tra giá trong game");
      else if (amount === null) conditions.push("Chưa xác định được giá từ cấu hình");
      const description = candidates.some((v) => v.name === cleanItemText(row.Name)) || new Set(candidates.map((v) => v.description)).size === 1
        ? item?.description : null;
      let reputationKey = Number(row.ReputeCamp) > 0 && Number(row.ReputeClass) > 0 ? `${row.ReputeCamp}/${row.ReputeClass}` : null;
      if (item?.className === "addrepute_base") {
        const raw = await templateRow(item);
        if (Number(raw?.ExtParam1) > 0 && Number(raw?.ExtParam2) > 0) reputationKey = `${raw!.ExtParam1}/${raw!.ExtParam2}`;
      }
      const effect = description?.match(/Sử dụng(?: có thể)? nhận được\s+(.+?)(?=,\s|[.!?](?:\s|$)|\n|$)/i)?.[1];
      const shortDescription = effect ? `Sử dụng nhận được ${effect}` : description;
      products.push({ key: `${shopId}:${column}`, shopId: String(shopId), shop: shopName, goodsId, itemId,
        icon: item?.icon ?? "", iconUrl: icons[item?.icon ?? ""] ?? null,
        name: cleanItemText(row.Name) || item?.name || itemId,
        description: shortDescription?.replace(/\n+/g, " ").slice(0, 240) || `Vật phẩm thuộc quầy ${shopName}. ${candidates.length > 1 ? "Có nhiều mẫu trùng mã; xem chi tiết tại Wiki Vật Phẩm." : "Chưa có mô tả trong cấu hình."}`,
        reputation: reputationKey ? reputations.get(reputationKey) ?? `Danh vọng ${reputationKey}` : null,
        amount, currency, currencyId, conditions, source: `setting/shop/goods.txt:${row._line}`,
        priceOptions, templateSource: item ? `setting/item/${item.source}:${item.line}` : null });
    }
  }
  return { shops: branches.map(([id, name]) => ({ id: String(id), name })), products };
}
