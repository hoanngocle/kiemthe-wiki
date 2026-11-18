import { readFile } from "node:fs/promises";
import path from "node:path";
import { cleanItemText } from "./item-wiki.ts";
import { parseShopTable } from "./shop-wiki.ts";

export const specialEquipmentSlots = [
  { key: "phi-phong", name: "Phi Phong" },
  { key: "mat-na", name: "Mặt Nạ" },
  { key: "ngua", name: "Ngựa" },
  { key: "an", name: "Ấn" },
  { key: "chan-nguyen", name: "Chân Nguyên" },
  { key: "thanh-linh", name: "Thánh Linh" },
  { key: "phap-bao", name: "Pháp Bảo" },
  { key: "dong-hanh", name: "Trang Bị Đồng Hành" },
  { key: "ngoai-trang-ao", name: "Ngoại Trang Áo" },
  { key: "ngoai-trang-non", name: "Ngoại Trang Nón" },
] as const;

export type SpecialEquipmentSlot = typeof specialEquipmentSlots[number];
type Slot = SpecialEquipmentSlot["key"];
type Method = { where: string; costs: string; note: string };
export type SpecialEquipmentItem = {
  id: string;
  name: string;
  wearLevel: number | null;
  wearNote?: string;
  rank: number | null;
  rankLabel?: string;
  group: string;
  variant?: string;
  sources: Method[];
  upgrade?: Method & { targetId: string; result?: string };
  alternativeUpgrade?: Method;
  trainingCap?: number;
  exchange?: Method & { input: string; result: string };
};
export type SpecialEquipmentFilters = { q?: string; level?: string; group?: string; page?: string };

const partnerGroups = {
  partnerweapon: "Chi Nhẫn", partnerbody: "Áo", partnerring: "Chi Giới",
  partnercuff: "Hộ Uyển", partneramulet: "Hộ Thân Phù",
};
const files = {
  "phi-phong": ["mantle"], "mat-na": ["mask"], ngua: ["horse"], an: ["signet", "chop"],
  "chan-nguyen": ["zhenyuan"], "thanh-linh": ["soulsignet"], "phap-bao": ["zhen"],
  "dong-hanh": Object.keys(partnerGroups),
  "ngoai-trang-ao": ["garment"], "ngoai-trang-non": ["outhat"],
};
export const cosmeticStones = [
  { level: 1, name: "Tinh Thạch Phượng Hoàng", through: 2 },
  { level: 2, name: "Tinh Thạch Ảnh Nguyệt", through: 7 },
  { level: 3, name: "Tinh Thạch Đoạn Hải", through: 12 },
  { level: 4, name: "Tinh Thạch Thánh Hỏa", through: 17 },
  { level: 5, name: "Tinh Thạch Kim Long", through: 19 },
];
const mountRoot = "script/tranphai/nangcapngua";
const mountNpc = "Quan Ưng Phi → Hệ Thống Thú Cưỡi";
const maskNpc = "Quan Ưng Phi → Hệ Thống Mặt Nạ";
const baChuNpc = `${maskNpc} → Nâng Cấp Mặt Nạ Bá Chủ VIP`;
const sealNpc = "Quan Ưng Phi → Hệ Thống Luân Hồi Ấn";
const truyenKyNpc = `${sealNpc} → Nâng Cấp Truyền Kỳ Ấn`;
const phongThanNpc = `${sealNpc} → Nâng Cấp Phong Thần Ấn`;
const mantleNpc = "Tạ Hiền → Cửa Hàng Ngũ Hành Hồn Thạch → Phi Phong (VIP)";
const phapBaoNpc = "Quan Ưng Phi → Hệ Thống Pháp Bảo Trấn Phái";
const partnerNpc = "Quan Ưng Phi → Hệ Thống Trang Bị Đồng Hành → Nâng cấp Trang Bị Đồng Hành";
const shopRoutes = new Map<number, string>([
  [22, "Bán Ngựa → Ta muốn mua ngựa"],
  ...[140, 141, 142, 143, 144].map((id): [number, string] => [id, mantleNpc]),
  ...[149, 150, 151, 152, 153].map((id): [number, string] => [id, "Phó Thiếu Khanh → Tiệm Quan Ấn"]),
  [190, "Quan Phi Phi → Cửa Hàng Phi Phong"],
  [204, "Quan Phi Phi → Quan Ấn Chiến Trường"],
  [206, "Quan Phi Phi → Ngoại Trang → Áo"],
  [207, "Quan Phi Phi → Ngoại Trang → Nón"],
  [189, "Bổ Đầu Hình Bộ → Danh Bổ Lệnh"],
]);
const configuredShops: Partial<Record<Slot, number[]>> = {
  "phi-phong": [140, 141, 142, 143, 144, 171, 172, 190],
  "mat-na": [129, 181, 198],
  ngua: [22, 173, 174, 212],
  an: [149, 150, 151, 152, 153, 204],
  "dong-hanh": [189],
  "ngoai-trang-ao": [206, 181, 197, 199],
  "ngoai-trang-non": [207, 178, 179, 181, 199],
};
const equipmentId = (row: Record<string, string>) =>
  [row.Genre, row.DetailType, row.ParticularType, row.Level].join(",");
const clean = (name: string) => cleanItemText(name).replace(/\s+/g, " ").trim();
const number = new Intl.NumberFormat("vi-VN");
const elements = ["", "Kim", "Mộc", "Thủy", "Hỏa", "Thổ"];
const currencyNames = new Map([["18,1,1338,1", "KNB Đại"], ["18,1,205,1", "Hồn Thạch"]]);
const groups: Record<string, string> = {
  mantle: "Phi Phong", mask: "Mặt Nạ khác", horse: "Thú cưỡi khác", signet: "Ấn khác", chop: "Quan Ấn",
  zhenyuan: "Chân Nguyên", soulsignet: "Thánh Linh", zhen: "Pháp Bảo",
  ...partnerGroups,
  garment: "Ngoại Trang Áo", outhat: "Ngoại Trang Nón",
};

function ingredients(...entries: [number, string][]) {
  return entries.map(([count, name]) => `${number.format(count)} ${name}`).join(" + ");
}

function maskCost(knb: number, fragments: number) {
  return ingredients([knb, "KNB Đại"], [fragments, "Mảnh Mặt Nạ"], [fragments, "Dị Dung Thạch"]);
}

function requirement(row: Record<string, string>, type: string) {
  for (let i = 1; i <= 6; i++) {
    const value = row[`ReqProp${i}Value`];
    if (row[`ReqProp${i}Type`] === type && value) {
      return value;
    }
  }
  return null;
}

function addMaskRoute(item: SpecialEquipmentItem, particular: number) {
  const target = (n: number) => `1,13,${n},4`;
  if (particular >= 178 && particular <= 218) {
    const rank = particular - 178;
    item.group = "Bôn Lôi Quán";
    item.rank = rank;
    item.upgrade = rank === 40
      ? { targetId: target(220), where: `${baChuNpc} → Ghép Mặt Nạ Bá Chủ`, costs: maskCost(100, 20000),
        note: "Mặt nạ cấp 40 và nguyên liệu trong túi · 3 ô trống" }
      : { targetId: target(particular + 1), where: `${maskNpc} → Nâng Cấp Mặt Nạ Bôn Lôi Quán`,
        costs: maskCost(2 * (rank + 1), 1000 * (rank + 1)), note: "Đeo mặt nạ" };
  }
  if (particular >= 220 && particular <= 319) {
    const rank = particular - 219;
    item.group = "Bá Chủ VIP";
    item.rank = rank;
    if (rank < 100) {
      item.upgrade = { targetId: target(particular + 1), where: `${baChuNpc} → Nâng Cấp Mặt Nạ Bá Chủ`,
        costs: maskCost(78 + 2 * rank, 39000 + 1000 * rank), note: "Đeo mặt nạ" };
    }
  }
  if (particular === 178) item.sources.push({
    where: "Túi Tân Thủ → Nhận thưởng Cấp độ → Cấp 99",
    costs: "Nhận lần lượt các mốc cấp trước",
    note: "1 lần mỗi nhân vật · Vật phẩm khóa",
  });
  if (particular === 188) item.sources.push({
    where: "Cổ Phong Hà → Nhận Phúc Lợi Nạp → Phúc Lợi Nạp [15 Triệu]",
    costs: "Tích lũy nạp 15.000.000 đồng",
    note: "",
  });
}

function addSealRoute(item: SpecialEquipmentItem, particular: number) {
  const target = (n: number) => `1,16,${n},1`;
  const bag = "Đeo ấn";
  if (particular <= 12) {
    item.group = "Ngũ Hành Ấn";
    item.upgrade = { targetId: item.id, where: "Dã Luyện Đại Sư → Tăng cấp Ngũ Hành Ấn",
      costs: "Miễn phí", note: "Đeo ấn · Tương khắc 1.000 cho dòng đã chọn" };
    return;
  }
  if (particular <= 22) {
    const rank = particular - 12;
    item.group = "Truyền Kỳ Ấn";
    item.rank = rank;
    if (rank === 1) item.sources.push({
      where: `${truyenKyNpc} → Ghép Truyền Kỳ Ấn cấp 1`,
      costs: ingredients([1000, "Mảnh Ghép Luân Hồi Ấn"], [2, "KNB Đại"]),
      note: "Nguyên liệu vào khung · 1 ô trống · 100%",
    });
    item.upgrade = rank === 10
      ? { targetId: target(23), where: `${phongThanNpc} → Ghép Phong Thần Ấn Cấp 1`,
        costs: ingredients([1000, "KNB Đại"]), note: "Ấn cấp 10 và KNB trong túi · 1 ô trống · 100%" }
      : { targetId: target(particular + 1), where: `${truyenKyNpc} → Nâng Cấp Truyền Kỳ Ấn`,
        costs: ingredients([rank * 1000, "Mảnh Ghép Luân Hồi Ấn"], [rank * 5, "KNB Đại"], [1, "Bùa Bảo Toàn"]),
        note: `${bag} · Bùa Bảo Toàn: lên bậc 100%. Thiếu bùa: mất phí và tụt 1 bậc, tối thiểu bậc 1.` };
    return;
  }
  if (particular <= 122) {
    const rank = particular - 22;
    item.group = "Phong Thần Ấn";
    item.rank = rank;
    if (rank < 100) item.upgrade = {
      targetId: target(particular + 1), where: `${phongThanNpc} → Nâng Cấp Phong Thần Ấn`,
      costs: ingredients([rank * 1000, "Mảnh Ghép Luân Hồi Ấn"], [rank * 10, "KNB Đại"]),
      note: `${bag} · ${Math.max(50, 110 - 10 * rank)}%. Trượt mất phí. Có bùa: giữ bậc, hao 1 bùa. Thiếu bùa: tụt 1 bậc, tối thiểu bậc 1.`,
    };
  }
}

async function addMountRoutes(items: SpecialEquipmentItem[], read: (file: string) => Promise<string>) {
  const [mountConfig, starterScript, exchangeScript] = await Promise.all(
    ["mount_config.lua", "nhanthucuoi.lua", "doingua1.lua"].map((file) => read(`${mountRoot}/${file}`)),
  );
  const rankMap = new Map(Array.from(mountConfig.matchAll(/\[(\d+)\]\s*=\s*\{(\d+),(\d+)\}/g),
    ([, id, rank, next]) => [id, { rank: Number(rank), next: Number(next) }]));
  const starters = new Set(Array.from(starterScript.matchAll(/self\.GetHorse, self, (\d+)/g), ([, id]) => id));
  const starterFee = Number(starterScript.match(/local COST = \{\{id=\{18,1,1338,1\},count=(\d+)\}\}/)?.[1]);
  const targets = exchangeScript.match(/local choices = \{([\s\S]*?)^\}/m)?.[1] ?? "";
  const exchange = new Set(Array.from(targets.matchAll(/\{(\d+),"/g), ([, id]) => id));
  for (const item of items) {
    const [, , id, level] = item.id.split(",");
    if (level !== "4") continue;
    const step = rankMap.get(id);
    if (!step) continue;
    const { rank, next } = step;
    item.group = "Thú Cưỡi VIP";
    item.rank = rank;
    if (starters.has(id) && starterFee > 0) item.sources.push({
      where: `${mountNpc} → Nhận Thú Cưỡi VIP`, costs: ingredients([starterFee, "KNB Đại"]),
      note: "1 ô trống · Thú cưỡi khóa",
    });
    if (next) item.upgrade = {
      targetId: `1,12,${next},4`, where: `${mountNpc} → Nâng Cấp Thú Cưỡi VIP`,
      costs: ingredients([2 * rank, "KNB Đại"], [500 * rank, "Thuần Dưỡng Đơn"], [500 * rank, "Căn Cốt Đan"],
        [500 * rank, "Mảnh Ghép Ngựa"], [rank, "Linh Tê Ngọc"]),
      note: "Đeo thú cưỡi · Giữ ô trang bị",
    };
    if (exchange.has(id)) item.exchange = {
      input: "Thú VIP cấp 60", result: "Chọn mẫu thú VIP cấp 60",
      where: `${mountNpc} → Hoán Đổi Thú Cưỡi VIP Cấp 60`, costs: "20 KNB Đại",
      note: "1 thú cấp 60 vào khung · KNB trong túi",
    };
  }
}

async function addCultivationRoutes(items: SpecialEquipmentItem[], slot: "chan-nguyen" | "thanh-linh", read: (file: string) => Promise<string>) {
  const isSoul = slot === "thanh-linh";
  const crate = isSoul ? "18,1,3118,4" : "18,1,3118,2";
  const script = isSoul ? "ruongtb_BiBao_VV" : "ruongtb_ChanNguyen_VV";
  const [shopText, goodsText, crateScript] = await Promise.all([
    read("setting/shop/buysell.txt"), read("setting/shop/goods.txt"), read(`script/tinhtinhtang/${script}.lua`),
  ]);
  const shop = parseShopTable(shopText).find((row) => row.ShopId === "209");
  const product = parseShopTable(goodsText).find((row) => equipmentId(row) === crate && Object.values(shop ?? {}).includes(row.Id));
  const rewards = new Set(Array.from(crateScript.replace(/^\s*--[^\r\n]*/gm, "")
    .matchAll(/me\.AddItem\(\s*(1,\s*(?:24|27),\s*\d+,\s*1)\s*\)/g), ([, id]) => id.replace(/\s/g, "")));
  for (const item of items) {
    const element = elements[Number(item.id.split(",")[2])];
    if (isSoul) item.variant = `Hệ ${element}`;
    if (product?.goodsindex === "6" && Number(product.goodsprice) > 0 && rewards.has(item.id)) {
      item.sources.push({
        where: `Quan Phi Phi → Cửa Hàng Đặc Biệt (shop 209) → ${isSoul ? `mở rương, [Nhận] Bí Bảo, chọn ${element}` : "mở rương, chọn Chân Nguyên theo tên"}`,
        costs: `${ingredients([Number(product.goodsprice), "KNB Đại"])} mua 1 ${clean(product.Name)} (${crate})`,
        note: `5 ô trống · Kèm Sách Tu Luyện (${isSoul ? "Thánh Linh" : "Chân Nguyên"})`,
      });
    }
    if (item.id === "1,24,2,1") item.sources.push({
      where: "Mở rương Chân Nguyên thuê và chọn Bảo Ngọc",
      costs: "1 Rương Chân Nguyên thuê 1 ngày (18,1,3098,1) hoặc 7 ngày (18,1,3098,2)",
      note: "5 ô trống · Hạn 1 hoặc 7 ngày · Chưa rõ nguồn rương",
    });
    item.trainingCap = 400;
    item.upgrade = isSoul
      ? {
        targetId: item.id, result: "Tăng cấp từng dòng trên cùng Thánh Linh",
        where: "Đeo Thánh Linh → Tu Luyện Châu (18,1,16,1) → Tụ Linh Thánh Linh → chọn dòng 1–5",
        costs: "Linh Hồn đã tích từ Thánh Linh Bảo Hạp Hồn (18,1,1334,1), mỗi hạp cộng 10.000 Linh Hồn",
        note: "1 Linh Hồn = 1 điểm · Dồn vào dòng đã chọn · Giữ điểm dư ở cấp 400",
      }
      : {
        targetId: item.id, result: "Tăng cấp từng dòng trên cùng Chân Nguyên",
        where: "Đeo Chân Nguyên chính → nhấn phải Tu Luyện Đơn → chọn thuộc tính thứ nhất đến thứ tư",
        costs: "1 Chân Nguyên Tu Luyện Đơn (18,1,1333,1 hoặc 18,1,402,1)",
        note: "+100 điểm vào dòng chọn · Lên bậc cần 5 × cấp hiện tại",
      };
    item.alternativeUpgrade = isSoul
      ? {
        where: "Đeo Thánh Linh → nhấn phải sách → [Nâng Max]",
        costs: "1 Sách Tu Luyện (Thánh Linh) (18,1,3119,5)",
        note: "5 dòng lên cấp 400 · Giữ số dư Linh Hồn",
      }
      : {
        where: "Đeo Chân Nguyên chính → nhấn phải sách → [Nâng Max] Ngoại Trang",
        costs: "1 Sách Tu Luyện (Chân Nguyên) (18,1,3119,7)",
        note: "+1.000.000 điểm mỗi dòng · Cả 4 dòng lên cấp 400",
      };
  }
}

async function addPhapBaoRoutes(items: SpecialEquipmentItem[], requiredFactions: Map<string, string>, read: (file: string) => Promise<string>) {
  const [script, factionXml] = await Promise.all([
    read("script/tranphai/phapbao/nhanphapbao.lua"), read("setting/faction/faction.xml"),
  ]);
  const factionNames = new Map(Array.from(factionXml.matchAll(/<faction id="(\d+)" name="([^"]+)"/g),
    ([, id, name]) => [id, name.trim()]));
  const menuNames = Array.from((script.match(/local names = \{([^}]+)\}/)?.[1] ?? "").matchAll(/"([^"]+)"/g), ([, name]) => name);
  const starterFee = Number(script.match(/local COST = \{\{id=\{18,1,1338,1\},count=(\d+)\}\}/)?.[1]);
  const byId = new Map(items.map((item) => [item.id, item]));
  for (const item of items) {
    const id = Number(item.id.split(",")[2]);
    const branch = Math.floor((id - 101) / 20);
    const rank = id - 100 - 20 * branch;
    const starter = byId.get(`1,15,${101 + branch * 20},7`);
    const group = starter?.name.replace(/^\[[^\]]+\]\s*/, "").replace(/\s*\+\s*1$/, "") ?? item.group;
    const alias = menuNames[branch];
    const menuNote = alias && group !== alias ? ` Tên trên menu là “${alias}”.` : "";
    item.group = group;
    item.rank = rank;
    const faction = factionNames.get(requiredFactions.get(item.id) ?? "");
    if (faction) item.wearNote = `Môn phái: ${faction}`;
    if (menuNote) item.variant = `${group} · tên menu ${alias}`;
    if (rank === 1 && starterFee > 0 && alias) item.sources.push({
      where: `${phapBaoNpc} → Nhận Pháp Bảo cấp 1`, costs: ingredients([starterFee, "KNB Đại"]),
      note: `1 ô trống${menuNote}`,
    });
    if (rank < 20) item.upgrade = {
      targetId: `1,15,${id + 1},7`, where: `${phapBaoNpc} → Nâng cấp Pháp Bảo Trấn Phái`,
      costs: ingredients([20, "KNB Đại"], [1, "Bùa Bảo Toàn"], [1000, "Mảnh Pháo Bảo"]),
      note: "Đeo Pháp Bảo · Giữ thuộc tính riêng · Khóa món",
    };
    if (rank === 20) item.exchange = {
      input: "Pháp Bảo Trấn Phái +20", result: "Chọn nhánh Pháp Bảo +20",
      where: `${phapBaoNpc} → Đổi loại Pháp Bảo +20`, costs: "2 KNB Đại",
      note: "1 Pháp Bảo +20 vào khung · Giữ bậc, thuộc tính và trạng thái khóa",
    };
  }
}

async function addPartnerRoutes(items: SpecialEquipmentItem[], read: (file: string) => Promise<string>) {
  const [script, templates] = await Promise.all([
    read("script/tranphai/trangbidonghanh/bo7.lua"), read("setting/item/001/other/scriptitem.txt"),
  ]);
  const fee = Number(script.match(/\bcoin\s*=\s*(\d+)/)?.[1]);
  const crates = parseShopTable(templates).filter((row) =>
    row.Genre === "18" && row.DetailType === "1" && row.Level === "1"
    && /^TrangBi(?:DongHanh(?:4|5|6|8|9|10)|_DongHanh_Rate)$/.test(row.ClassName));
  const byId = new Map(items.map((item) => [item.id, item]));
  const rewards = await Promise.all(crates.map(async (row) => {
    const crateScript = await read(`script/tinhtinhtang/${row.ClassName}.lua`);
    const ids = [...crateScript.matchAll(/^\s*me\.AddItem\(\s*(5\s*,\s*\d+\s*,\s*\d+\s*,\s*\d+)\s*\)/gm)]
      .map(([, id]) => id.replace(/\s/g, ""));
    return { ids, row };
  }));
  for (const { ids, row } of rewards) {
    const id = equipmentId(row);
    let where = "Nhấn phải rương trong hành trang";
    let note = "5 ô trống · Chưa rõ nguồn rương";
    if (id === "18,1,3100,1") {
      where = "Thiên Quỳnh Cung → nhận rương → nhấn phải để mở";
      note = "5 ô trống · Đủ bộ cấp 4";
    }
    if (id === "18,1,3103,1") {
      where = "Bảo Ngọc → Hằng Ngày → Nhiệm Vụ Tiêu Diệt Quái 95 → Nhận Thưởng Nhiệm Vụ 1, 2 hoặc 3";
      note = "500 quái/nhiệm vụ · Rương khóa · Bộ 4, 5, 6 (mỗi bộ 1/3) · 5 ô trống";
    }
    if (id === "18,1,3106,1") {
      note = "5 ô trống · Ra Bạch Kim +1 · Lên 11 cần Vô Minh · Chưa rõ nguồn rương";
    }
    for (const rewardId of new Set(ids)) byId.get(rewardId)?.sources.push({
      where, costs: `1 ${clean(row.Name)} (${id})`, note,
    });
  }

  // These are the menu's five consecutive upgrades. Both final ranks use template level 10.
  const setLevels = ["1,6", "1,7", "1,8", "1,9", "11,10", "12,10"];
  for (const item of items) {
    const [, detail, particular, level] = item.id.split(",");
    const index = setLevels.indexOf(`${particular},${level}`);
    if (index === -1) {
      if (Number(level) < 6) item.rank = Number(level);
      continue;
    }
    const rank = index + 6;
    item.rank = rank;
    const target = `5,${detail},${setLevels[index + 1]}`;
    if (fee > 0 && byId.has(target)) item.upgrade = {
      targetId: target, where: `${partnerNpc} → chọn cấp ${rank + 1}`,
      costs: `Đủ 5 món cấp ${rank} + ${ingredients([fee, "Đồng thường"])} cho cả bộ`,
      note: "Tháo đồ vào khung · 5 ô trống · 100% · Bộ mới theo mẫu",
    };
  }
}

function setCosmeticUpgrade(item: SpecialEquipmentItem, row: Record<string, string>) {
  const sex = requirement(row, "8");
  const gender = sex === "0" ? "Nam" : sex === "1" ? "Nữ" : undefined;
  if (gender) item.wearNote = `Giới tính: ${gender}`;
  if (row.ClassName !== "upgradeequip" || Number(row.Level) < 2) {
    item.group = "Mẫu ngoại hình";
    item.rankLabel = "Mẫu ngoại hình";
    return;
  }
  item.group = "Có luyện hóa";
  item.rankLabel = "Luyện hóa 0–20";
  item.upgrade = {
    targetId: item.id, result: "Cùng món và mã, tăng 1 cấp luyện hóa",
    where: "Đeo Ngoại Trang → dùng Tinh Thạch → chọn món",
    costs: "1 Tinh Thạch luyện hóa (18,1,1331,1–5) mỗi lượt",
    note: "Thành công +1 bậc · Trượt −1 bậc · Mỗi lượt hao 1 đá",
  };
  item.alternativeUpgrade = {
    where: "Dùng sách → [Nâng Max] Ngoại Trang",
    costs: "1 Sách Tu Luyện (Ngoại Trang) (18,1,3119,6)",
    note: "Cần đeo Nón hỗ trợ luyện hóa · Nón và Áo đang đeo lên bậc 20",
  };
}

async function addCosmeticCrateSources(items: SpecialEquipmentItem[], read: (file: string) => Promise<string>) {
  const crates = [
    { script: "ruongtb_NgoaiTrang_VV", id: "18,1,3118,1", name: "Rương Trang Bị Ngoại Trang (Vĩnh Viễn)", days: 0 },
    { script: "ruongtb_NgoaiTrang_thue1", id: "18,1,3097,1", name: "Rương Ngoại Trang (1 ngày)", days: 1 },
    { script: "ruongtb_NgoaiTrang_thue7", id: "18,1,3097,2", name: "Rương Ngoại Trang (7 ngày)", days: 7 },
  ];
  const texts = await Promise.all(crates.map(({ script }) => read(`script/tinhtinhtang/${script}.lua`)));
  const byId = new Map(items.map((item) => [item.id, item]));
  for (const [index, crate] of crates.entries()) {
    const script = texts[index];
    const options = script.matchAll(/^\s*\{"\[Áo\] \+ \[Nón\]<color=yellow>([^<]+)<color>",self\.GetItem(\d+),/gm);
    const functions = new Map(Array.from(script.matchAll(/^function tbItem:GetItem1_(\d+)\([^)]*\)([\s\S]*?)(?=^function |(?![\s\S]))/gm),
      ([, choice, body]) => [choice, body]));
    for (const [, label, choice] of options) {
      const rewards = (functions.get(choice) ?? "").matchAll(/^[ \t]*(?:local pItem =\s*)?me\.AddItem\((1,2[56],\d+,2)\)/gm);
      for (const [, id] of rewards) byId.get(id)?.sources.push({
        where: `Nhấn phải rương → chọn ${label.trim()}`,
        costs: `1 ${crate.name} (${crate.id})`,
        note: `Môn phái · Mốc mở Boss 120 · 15 ô trống · Cặp Áo + Nón${crate.days ? ` (${crate.days} ngày)` : ""} · Chưa rõ nguồn rương`,
      });
    }
  }
}

async function addShopSources(items: SpecialEquipmentItem[], shopIds: number[], prices: Map<string, string>, read: (file: string) => Promise<string>) {
  const [shops, products, ini, currencyTable] = await Promise.all([
    read("setting/shop/buysell.txt"), read("setting/shop/goods.txt"), read("setting/gamesetting.ini"),
    read("setting/item/001/other/scriptitem.txt"),
  ]);
  const goods = new Map(parseShopTable(products).map((row) => [row.Id, row]));
  const currencies = new Map(parseShopTable(currencyTable).map((row) => [equipmentId(row), clean(row.Name)]));
  const coinParams = new Map(Array.from(ini.matchAll(/^CoinParam(\d+)_(\d+)\s*=\s*(\d+)/gm),
    ([, index, part, value]) => [`${index}_${part}`, value]));
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const shopsById = new Map(parseShopTable(shops).map((row) => [Number(row.ShopId), row]));
  for (const shopId of shopIds) {
    const shop = shopsById.get(shopId);
    if (!shop) continue;
    const where = shopRoutes.get(shopId);
    for (const [column, key] of Object.entries(shop)) {
      if (!/^Item\d+$/.test(column)) continue;
      const row = goods.get(key);
      if (!row) continue;
      const item = itemsById.get(equipmentId(row));
      if (!item) continue;
      const name = clean(row.Name);
      const currencyId = [1, 2, 3, 4].map((part) => coinParams.get(`${row.goodsindex}_${part}`)).join(",");
      const currency = shopId === 22 ? "bạc thường" : currencyNames.get(currencyId) ?? currencies.get(currencyId);
      const price = shopId === 22 ? prices.get(item.id) : row.goodsprice;
      const conditions = [];
      if (name !== item.name) conditions.push(`Tên trên quầy “${name}”`);
      if (elements[Number(row.Series)]) conditions.push(`Hệ ${elements[Number(row.Series)]}`);
      if (Number(row.honor) > 0) conditions.push(`Vinh dự cấp ${row.honor}`);
      if (Number(row.OfficialLevel) > 0) conditions.push(`Quan hàm cấp ${row.OfficialLevel}`);
      if (Number(row.ReputeLevel) > 0) conditions.push(`Danh vọng ${row.ReputeCamp}/${row.ReputeClass} cấp ${row.ReputeLevel}`);
      const minutes = Number(row.timeout);
      if (minutes > 0) conditions.push(`Hạn dùng ${minutes % 1440 === 0 ? `${minutes / 1440} ngày` : `${minutes} phút`}`);
      if (!where) conditions.push("Quầy có trong cấu hình, chưa xác minh đường mở");
      item.sources.push({
        where: `${where ?? clean(shop.ShopName)} · Shop ${shopId}`,
        costs: currency && price ? ingredients([Number(price), currency]) : "Chưa xác minh giá mua",
        note: conditions.join(" · "),
      });
    }
  }
}

export async function loadSpecialEquipment(root: string, slot: Slot) {
  const read = (file: string) => readFile(path.join(root, file), "utf8");
  const isPartner = slot === "dong-hanh";
  const isCosmetic = slot === "ngoai-trang-ao" || slot === "ngoai-trang-non";
  const folder = isPartner ? "partnerequip" : "equip/general";
  const tables = await Promise.all(files[slot].map(async (file) => ({
    file, rows: parseShopTable(await read(`setting/item/001/${folder}/${file}.txt`)),
  })));
  const items = new Map<string, SpecialEquipmentItem>();
  const prices = new Map<string, string>();
  const requiredFactions = new Map<string, string>();
  for (const { file, rows } of tables) {
    for (const row of rows) {
      const id = equipmentId(row);
      if (items.has(id) || row.Genre !== (isPartner ? "5" : "1") || !row.Name) continue;
      const particular = Number(row.ParticularType);
      if (file === "zhen" && (row.Level !== "7" || particular < 101 || particular > 580)) continue;
      const group = file === "chop" && particular === 16 ? "Quan Ấn Chiến Trường" : groups[file];
      const item: SpecialEquipmentItem = {
        id, name: clean(row.Name), wearLevel: Number(requirement(row, "5")) || null, rank: null, group, sources: [],
      };
      if (file === "mantle") {
        const element = elements[Number(row.Series)];
        const gender = row.ReqProp1Type === "8" ? ["Nam", "Nữ"][Number(row.ReqProp1Value)] : undefined;
        item.variant = [element && `Hệ ${element}`, gender].filter(Boolean).join(" · ");
      }
      if (file === "mask" && row.Level === "4") addMaskRoute(item, particular);
      if (file === "signet" && row.Level === "1") addSealRoute(item, particular);
      if (isCosmetic) setCosmeticUpgrade(item, row);
      items.set(id, item);
      if (file === "horse") prices.set(id, row.Price);
      if (file === "zhen") {
        const faction = requirement(row, "6");
        if (faction) requiredFactions.set(id, faction);
      }
    }
  }
  const catalogue = Array.from(items.values());
  if (slot === "chan-nguyen" || slot === "thanh-linh") await addCultivationRoutes(catalogue, slot, read);
  if (slot === "phap-bao") await addPhapBaoRoutes(catalogue, requiredFactions, read);
  if (slot === "ngua") await addMountRoutes(catalogue, read);
  if (isPartner) await addPartnerRoutes(catalogue, read);
  const shops = configuredShops[slot];
  if (shops) await addShopSources(catalogue, shops, prices, read);
  if (isCosmetic) await addCosmeticCrateSources(catalogue, read);
  if (isCosmetic) {
    const soldAtMainShop = (item: SpecialEquipmentItem) => item.sources.some(({ where }) => /Shop 20[67]$/.test(where));
    return catalogue.sort((a, b) => Number(soldAtMainShop(b)) - Number(soldAtMainShop(a)));
  }
  const order = (item: SpecialEquipmentItem) => item.rank !== null || item.sources.length || item.upgrade ? 0 : 1;
  return catalogue.sort((a, b) => order(a) - order(b));
}

const fold = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replaceAll("đ", "d");

export function selectSpecialEquipment(items: SpecialEquipmentItem[], filters: SpecialEquipmentFilters) {
  const query = fold(filters.q?.trim() ?? "");
  const id = query.replace(/\s*[-,]\s*/g, ",");
  const matching = items.filter((item) =>
    (!filters.group || item.group === filters.group)
    && (!filters.level || String(item.wearLevel ?? 0) === filters.level)
    && (!query || item.id.includes(id) || fold(item.name).includes(query)
      || fold(item.variant ?? "").includes(query) || fold(item.wearNote ?? "").includes(query)
      || item.sources.some(({ note }) => fold(note).includes(query))));
  const pageSize = 25;
  const pages = Math.max(1, Math.ceil(matching.length / pageSize));
  const page = Math.min(pages, Math.max(1, Math.floor(Number(filters.page)) || 1));
  return { items: matching.slice((page - 1) * pageSize, page * pageSize), total: matching.length, page, pages };
}
