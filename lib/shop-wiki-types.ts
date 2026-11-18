export type ShopProduct = {
  icon: string; iconUrl: string | null;
  key: string; shopId: string; shop: string; goodsId: string; itemId: string;
  name: string; description: string; reputation: string | null; amount: number | null; currency: string;
  currencyId: string; conditions: string[]; source: string; templateSource: string | null;
  priceOptions: { amount: number | null; source: string }[];
};
export type ShopCatalog = { shops: { id: string; name: string }[]; products: ShopProduct[] };
export function isElementEquipmentShop(shopId: string) {
  return /^(194|213|214|215|216|217|218|219|220|221)$/.test(shopId);
}
export function groupShopProducts(products: ShopProduct[]) {
  const groups = new Map<string, ShopProduct & { systems: string[]; variantCount: number }>();
  const order = ["Kim", "Mộc", "Thủy", "Hỏa", "Thổ"];
  for (const product of products) {
    const systems = product.conditions.filter((c) => c.startsWith("Hệ ")).map((c) => c.slice(3));
    const description = product.shopId === "194"
      ? product.description.replace(/(Trang bị tím · )(?:Kim|Mộc|Thủy|Hỏa|Thổ)\s+/, "$1")
      : product.description;
    const key = isElementEquipmentShop(product.shopId) ? JSON.stringify([
      product.shopId, product.name, description, product.amount, product.currencyId, product.reputation,
      product.itemId.split(",").filter((_, i) => i !== 2),
      product.conditions.filter((c) => !c.startsWith("Hệ ")),
      [...new Set(product.priceOptions.map((p) => p.amount))].sort(),
    ]) : product.key;
    const existing = groups.get(key);
    if (existing) {
      existing.systems = [...new Set([...existing.systems, ...systems])].sort((a, b) => order.indexOf(a) - order.indexOf(b));
      existing.variantCount++;
    } else groups.set(key, { ...product, description, systems, variantCount: 1 });
  }
  return [...groups.values()];
}
export type CurrencyGuide = { id: string; name: string; summary: string; sources: string[] };

export const currencyGuides: CurrencyGuide[] = [
  { id: "18,1,1338,1", name: "Kim Nguyên Bảo Đại", summary: "Tại NPC Tân Thủ → Mua Kim Nguyên Bảo Đại: 1 cái = 100.000 Đồng thường, hoặc 100.000 Đồng khóa, hoặc 1.000.000 Bạc thường, hoặc 2.000.000 Bạc khóa. Chọn gói 1 / 10 / 100; chỉ trừ loại tiền đã chọn. Vận tiêu cấp 1 thưởng 1 cái; Tống Kim từ 1.000 điểm thưởng 5–10 cái theo mốc điểm. Đừng dùng nhầm Kim Nguyên Bảo cấp 2 hoặc Tiểu Kim Nguyên Bảo.", sources: ["script/tranphai/tanthu1.lua:69", "script/tranphai/tanthu1.lua:155", "script/Config/VanTieu/TieuCap1/npc_vantieu.lua:112", "script/mission/battle/battle_bouns.lua:493"] },
  { id: "18,1,1696,1", name: "Thẻ Tích Lũy Sự Kiện", summary: "Hoàn thành vận tiêu cấp 1 nhận 1 thẻ. Tống Kim: 1.000–2.999 điểm nhận 5; 3.000–4.999 nhận 6; 5.000–6.999 nhận 7; 7.000–9.999 nhận 8; từ 10.000 nhận 10 thẻ. Rương TDLT có thể ra 5 thẻ khóa (6% mỗi lần mở theo bảng hiện tại).", sources: ["script/Config/VanTieu/TieuCap1/npc_vantieu.lua:115", "script/mission/battle/battle_bouns.lua:493", "script/Copdakto/item/ruongTDLT.lua:24"] },
  { id: "18,1,3072,1", name: "Chiến Thần", summary: "Dùng mua Quan Ấn Chiến Trường. Điểm danh hằng ngày cấp 500 cái khóa mỗi lượt thông thường; nhánh đặt lại chu kỳ có thể cộng thêm thưởng. Rương TDLT có 5% ra 1 cái khóa. Túi Nguyên Liệu Nâng Cấp cũng có nhánh ra Chiến Thần.", sources: ["script/tranphai/diemdanhhangngay.lua:27", "script/Copdakto/item/ruongTDLT.lua:67", "script/tranphai/item/tuinguyenlieu.lua:34", "setting/gamesetting.ini [Coin] CoinParam14"] },
  { id: "18,1,553,1", name: "Tiền Du Long", summary: "Điểm danh hằng ngày nhận 100 Tiền Du Long khóa mỗi lượt thông thường; nhánh đặt lại chu kỳ có thể cộng thêm thưởng. Mở Túi Tiền Du Long nhận ngẫu nhiên 10–100 đồng. Dùng ở quầy Du Long; không phải Đồng thường trong ví.", sources: ["script/tranphai/diemdanhhangngay.lua:46", "script/Copdakto/item/TuiTienDuLong.lua:1"] },
  { id: "18,1,476,1", name: "Nguyệt Ảnh Thạch", summary: "Dùng mua ngoại trang áo và nón, mỗi món 1 viên theo cấu hình quầy. Mở Rương Nguyệt Ảnh Thạch nhận 100 viên, cần 5 ô hành trang trống. Chưa xác minh đường nhận đạo cụ này trong hoạt động đang mở; có thể tra thêm tên trong Wiki Vật Phẩm.", sources: ["script/item/class/natr.lua:4", "setting/gamesetting.ini [Coin] CoinParam2"] },
  { id: "silver", name: "Bạc thường", summary: "Dùng mua trang bị cao cấp và có thể đổi KNB Đại. Hạ quái động vật có thưởng Bạc: người được ghi nhận nhận Bạc bằng cấp quái × 5; đồng đội cùng tổ đội trong phạm vi nhận một nửa (làm tròn xuống). Bạc khóa là ví riêng, không tự bù cho quầy dùng Bạc thường.", sources: ["script/npc/animal.lua:54", "script/npc/animal.lua:75", "script/shop/shop.lua:88"] },
  { id: "wallets", name: "Đồng thường · Đồng khóa · Bạc khóa", summary: "Tống Kim từ 1.000 điểm: nhận 10.000–100.000 Đồng thường, 20.000–100.000 Đồng khóa và 100.000–300.000 Bạc khóa theo mốc điểm. Dùng các ví này để mua KNB Đại tại NPC Tân Thủ. Dùng 1 KNB Đại cũng nhận lại 100.000 Đồng thường. Xem Wiki Hoạt Động để biết điều kiện và cách nhận thưởng Tống Kim.", sources: ["script/mission/battle/battle_bouns.lua:493", "script/item/class/knbbig.lua:4", "script/tranphai/tanthu1.lua:69"] },
];

export function filterShopProducts(products: ShopProduct[], options: { query?: string; shop?: string; currency?: string } = {}) {
  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
  const terms = normalize(options.query ?? "").trim().split(/\s+/).filter(Boolean);
  return products.filter((p) => (!options.shop || p.shopId === options.shop) && (!options.currency || p.currencyId === options.currency)
    && terms.every((term) => normalize(`${p.name} ${p.description} ${p.reputation ?? ""} ${p.itemId} ${p.goodsId} ${p.shop} ${p.currency} ${p.conditions.join(" ")}`).includes(term)));
}
