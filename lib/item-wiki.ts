import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { WikiItem, ItemSearchResult } from "./item-wiki-types.ts";
import { createItemTooltipReader } from "./item-tooltip.ts";
import { classifyTemplate } from "./item-classification.ts";

// Reward sources verified against the game scripts; supplement the template descriptions.
const itemNotes: Record<string, string> = {
  "18,1,3071,1": [
    "Công dụng: nguyên liệu nâng Tử Điệp, Pháp Sư, Phù Thủy, Bạch Linh. Mỗi lượt nâng dùng 5.000 Linh Khí và 20 Kim Nguyên Bảo Đại, để trong hành trang.",
    "Tối đa cấp 10. Tỷ lệ nâng từ 90% xuống 10%; thất bại giữ cấp nhưng mất nguyên liệu.",
    "Tử Điệp: kích hoạt cấp 1 cần 200 Kim Nguyên Bảo Đại, không dùng nguyên liệu này. Yêu cầu nhân vật cấp 20 trở lên.",
    "Pháp Sư: kích hoạt cấp 1 cần 200 Kim Nguyên Bảo Đại, không dùng nguyên liệu này.",
    "Phù Thủy: kích hoạt cấp 1 cần 200 Kim Nguyên Bảo Đại, không dùng nguyên liệu này.",
    "Bạch Linh: kích hoạt cấp 1 cần 200 Kim Nguyên Bảo Đại, không dùng nguyên liệu này.",
    "Nguồn nhận Linh Khí:",
    "• Túi Nguyên Liệu Nâng Cấp ngẫu nhiên cho 150 Linh Khí khóa.",
    "• Rương TDLT ngẫu nhiên cho 5 Linh Khí khóa.",
    "• Thưởng online tại NPC quay số may mắn có lượt nhận 1 Linh Khí khóa.",
    "Linh Khí còn dùng cho các tính năng khác; công thức trên áp dụng cho Tử Điệp, Pháp Sư, Phù Thủy và Bạch Linh.",
  ].join("\n"),
  "18,1,3090,1": [
    "Công dụng: nguyên liệu nâng Nguyệt Ảnh. Mỗi lượt nâng dùng 5.000 Linh Hồn Thú Cưng và 20 Kim Nguyên Bảo Đại, để trong hành trang.",
    "Tối đa cấp 10. Tỷ lệ nâng từ 90% xuống 10%; thất bại giữ cấp nhưng mất nguyên liệu.",
    "Nguyệt Ảnh: kích hoạt cấp 1 cần 200 Kim Nguyên Bảo Đại, không dùng nguyên liệu này. Yêu cầu nhân vật cấp 20 trở lên.",
    "Nguồn nhận Linh Hồn Thú Cưng:",
    "• Túi Nguyên Liệu Nâng Cấp ngẫu nhiên cho 150 Linh Hồn Thú Cưng khóa.",
    "• Rương Linh Hồn Thú Cưng cho ngẫu nhiên 2, 4, 6, 8 hoặc 10 Linh Hồn Thú Cưng khóa.",
    "Linh Hồn Thú Cưng còn dùng trong tính năng Thú Cưng; công thức trên áp dụng cho Nguyệt Ảnh.",
  ].join("\n"),
  "18,1,1781,1": [
    "Công dụng: nguyên liệu nâng Tín Vật. Mỗi lượt nâng dùng 5.000 Mật Tín và 20 Kim Nguyên Bảo Đại, để trong hành trang.",
    "Tối đa cấp 10. Tỷ lệ nâng từ 90% xuống 10%; thất bại giữ cấp nhưng mất nguyên liệu.",
    "Tín Vật: kích hoạt cấp 1 cần 500 Kim Nguyên Bảo Đại, không dùng nguyên liệu này.",
    "Nguồn nhận Mật Tín:",
    "• Túi Nguyên Liệu Nâng Cấp ngẫu nhiên cho 150 Mật Tín khóa.",
  ].join("\n"),
  "18,1,1064,1": [
    "Công dụng: nguyên liệu nâng Huy Chương. Mỗi lượt nâng dùng 5.000 Huy chương Chiến Thần và 20 Kim Nguyên Bảo Đại, để trong hành trang.",
    "Tối đa cấp 10. Tỷ lệ nâng từ 90% xuống 10%; thất bại giữ cấp nhưng mất nguyên liệu.",
    "Huy Chương: kích hoạt cấp 1 cần 200 Kim Nguyên Bảo Đại, không dùng nguyên liệu này.",
    "Nguồn nhận Huy chương Chiến Thần:",
    "• Túi Nguyên Liệu Nâng Cấp ngẫu nhiên cho 150 Huy chương Chiến Thần khóa.",
  ].join("\n"),
  "18,1,3051,1": [
    "Công dụng trong các nhánh Thủy Linh và Kiếm Sĩ: nhân vật cấp 20 trở lên dùng 5.000 Mảnh Già Lam Kinh và 20 Kim Nguyên Bảo Đại cho mỗi lượt nâng, để trong hành trang.",
    "Kích hoạt Thủy Linh hoặc Kiếm Sĩ cấp 1 chỉ cần 200 Kim Nguyên Bảo Đại, không dùng mảnh. Tối đa cấp 10; nâng thất bại giữ cấp nhưng mất nguyên liệu.",
    "Mảnh này còn được dùng trong các công thức Già Lam Kinh và tính năng khác; số lượng trên áp dụng cho Thủy Linh và Kiếm Sĩ.",
    "Nguồn nhận Mảnh Già Lam Kinh:",
    "• Túi Nguyên Liệu Nâng Cấp: ngẫu nhiên nhận 150 mảnh khóa.",
    "• Rương TDLT: ngẫu nhiên nhận 5 mảnh khóa.",
    "• Thưởng online tại NPC quay số may mắn: có lượt nhận 1 mảnh khóa.",
  ].join("\n"),
  "18,1,9133,1": [
    "Công dụng: nguyên liệu nâng Bảo Châu cho nhân vật cấp 20 trở lên. Mỗi lượt cần 5.000 Bảo Châu-Sơ và 20 Kim Nguyên Bảo Đại, để trong hành trang.",
    "Kích hoạt Bảo Châu cấp 1 chỉ cần 200 Kim Nguyên Bảo Đại, không dùng Bảo Châu-Sơ. Tối đa cấp 10; nâng thất bại giữ cấp nhưng mất nguyên liệu.",
    "Nguồn nhận Bảo Châu-Sơ:",
    "• NPC Đổi Thưởng → Nguyên Liệu Nâng Cấp → Bảo Châu: 50.000 nguyên liệu cùng loại đổi 50.000 Bảo Châu-Sơ khóa; không thu thêm KNB hoặc Đồng.",
    "Nguyên liệu đổi được: Linh Khí, Mảnh Già Lam Kinh, Kinh Mạch Toàn Thư, Linh Hồn Thú Cưng, Sách Kỹ Năng Ngựa, Mảnh Ghép Ngựa, Thuần Dưỡng Đơn, Căn Cốt Đan, Mảnh Mặt Nạ, Dị Dung Thạch, Mảnh Pháo Bảo.",
    "• Túi Nguyên Liệu Nâng Cấp: ngẫu nhiên nhận 150 Bảo Châu-Sơ khóa.",
    "• Rương TDLT: ngẫu nhiên nhận 5 Bảo Châu-Sơ khóa.",
    "• Thưởng online tại NPC quay số may mắn: có lượt nhận 1 Bảo Châu-Sơ khóa.",
  ].join("\n"),
  "18,1,9115,3": [
    "Công dụng: nâng Kinh Mạch cho nhân vật cấp 20 trở lên. Mỗi lượt nâng cần 5.000 Kinh Mạch Toàn Thư và 20 Kim Nguyên Bảo Đại, để trong hành trang.",
    "Kích hoạt Kinh Mạch cấp 1 chỉ cần 200 Kim Nguyên Bảo Đại; không dùng Kinh Mạch Toàn Thư. Tối đa cấp 10; nâng thất bại giữ cấp nhưng mất nguyên liệu.",
    "Nguồn nhận Kinh Mạch Toàn Thư:",
    "• Túi Nguyên Liệu Nâng Cấp: ngẫu nhiên nhận 150 cuốn khóa.",
    "• Rương TDLT: ngẫu nhiên nhận 5 cuốn khóa.",
    "• Thưởng online tại NPC quay số may mắn: có lượt nhận 1 cuốn khóa.",
  ].join("\n"),
  "18,1,3060,8": [
    "Cách dùng: mở túi nhận 50 mảnh khóa, ngẫu nhiên 1 trong 11 loại nguyên liệu Thú Cưng và Đồng Hành.",
    "Có thể nhận Mảnh [Liên], [Lưng], [Giày], [Bội], [Nón] Đồng Hành; tỷ lệ mỗi loại là 1/11 (khoảng 9,09%).",
    "Nguồn nhận Túi Nguyên Liệu Đồng Hành:",
    "• Tống Kim: 1.000–2.999 điểm nhận 10 túi; 3.000–4.999 nhận 20; 5.000–6.999 nhận 30; 7.000–9.999 nhận 40; từ 10.000 điểm nhận 50 túi.",
    "• Vận tiêu cấp 1: hoàn thành nhiệm vụ nhận 10 túi.",
    "• Thi đấu môn phái: hạng 1 nhận 200 túi; hạng 2 nhận 150; hạng 4 nhận 100; hạng 8 nhận 50; hạng 16 nhận 30 túi.",
    "• Công Thành Chiến: bang chủ bang hạng nhất nhận 100 túi khi nhận thưởng bang chủ.",
  ].join("\n"),
  "18,1,3120,7": [
    "Nguồn nhận Mảnh [Liên] Đồng Hành:",
    "• Mở Túi Nguyên Liệu Đồng Hành: có tỷ lệ 1/11 (khoảng 9,09%) nhận 50 Mảnh [Liên] Đồng Hành khóa mỗi lần mở.",
    "• Túi có thể nhận từ Tống Kim, hoàn thành vận tiêu cấp 1, thi đấu môn phái và thưởng bang chủ Công Thành Chiến. Xem số lượng chi tiết ở vật phẩm Túi Nguyên Liệu Đồng Hành.",
    "Công dụng: nâng Kỹ Năng Đồng Hành (Liên); mỗi lần cần 10.000 mảnh và 100 Kim Nguyên Bảo Đại.",
    "Lưu ý: khác nhóm Mảnh Ghép trang bị Đồng Hành cũ có tên gần giống; nhóm cũ không dùng cho chức năng nâng kỹ năng này.",
  ].join("\n"),
  "18,1,3120,8": [
    "Nguồn nhận Mảnh [Lưng] Đồng Hành:",
    "• Mở Túi Nguyên Liệu Đồng Hành: có tỷ lệ 1/11 (khoảng 9,09%) nhận 50 Mảnh [Lưng] Đồng Hành khóa mỗi lần mở.",
    "• Túi có thể nhận từ Tống Kim, hoàn thành vận tiêu cấp 1, thi đấu môn phái và thưởng bang chủ Công Thành Chiến. Xem số lượng chi tiết ở vật phẩm Túi Nguyên Liệu Đồng Hành.",
    "Công dụng: nâng Kỹ Năng Đồng Hành (Lưng); mỗi lần cần 10.000 mảnh và 100 Kim Nguyên Bảo Đại.",
    "Lưu ý: khác nhóm Mảnh Ghép trang bị Đồng Hành cũ có tên gần giống; nhóm cũ không dùng cho chức năng nâng kỹ năng này.",
  ].join("\n"),
  "18,1,3120,9": [
    "Nguồn nhận Mảnh [Giày] Đồng Hành:",
    "• Mở Túi Nguyên Liệu Đồng Hành: có tỷ lệ 1/11 (khoảng 9,09%) nhận 50 Mảnh [Giày] Đồng Hành khóa mỗi lần mở.",
    "• Túi có thể nhận từ Tống Kim, hoàn thành vận tiêu cấp 1, thi đấu môn phái và thưởng bang chủ Công Thành Chiến. Xem số lượng chi tiết ở vật phẩm Túi Nguyên Liệu Đồng Hành.",
    "Công dụng: nâng Kỹ Năng Đồng Hành (Giày); mỗi lần cần 10.000 mảnh và 100 Kim Nguyên Bảo Đại.",
    "Lưu ý: khác nhóm Mảnh Ghép trang bị Đồng Hành cũ có tên gần giống; nhóm cũ không dùng cho chức năng nâng kỹ năng này.",
  ].join("\n"),
  "18,1,3120,10": [
    "Nguồn nhận Mảnh [Bội] Đồng Hành:",
    "• Mở Túi Nguyên Liệu Đồng Hành: có tỷ lệ 1/11 (khoảng 9,09%) nhận 50 Mảnh [Bội] Đồng Hành khóa mỗi lần mở.",
    "• Túi có thể nhận từ Tống Kim, hoàn thành vận tiêu cấp 1, thi đấu môn phái và thưởng bang chủ Công Thành Chiến. Xem số lượng chi tiết ở vật phẩm Túi Nguyên Liệu Đồng Hành.",
    "Công dụng: nâng Kỹ Năng Đồng Hành (Bội); mỗi lần cần 10.000 mảnh và 100 Kim Nguyên Bảo Đại.",
    "Lưu ý: khác nhóm Mảnh Ghép trang bị Đồng Hành cũ có tên gần giống; nhóm cũ không dùng cho chức năng nâng kỹ năng này.",
  ].join("\n"),
  "18,1,3120,11": [
    "Nguồn nhận Mảnh [Nón] Đồng Hành:",
    "• Mở Túi Nguyên Liệu Đồng Hành: có tỷ lệ 1/11 (khoảng 9,09%) nhận 50 Mảnh [Nón] Đồng Hành khóa mỗi lần mở.",
    "• Túi có thể nhận từ Tống Kim, hoàn thành vận tiêu cấp 1, thi đấu môn phái và thưởng bang chủ Công Thành Chiến. Xem số lượng chi tiết ở vật phẩm Túi Nguyên Liệu Đồng Hành.",
    "Công dụng: nâng Kỹ Năng Đồng Hành (Nón); mỗi lần cần 10.000 mảnh và 100 Kim Nguyên Bảo Đại.",
    "Lưu ý: khác nhóm Mảnh Ghép trang bị Đồng Hành cũ có tên gần giống; nhóm cũ không dùng cho chức năng nâng kỹ năng này.",
  ].join("\n"),
  "18,1,1782,1": [
    "Nguồn nhận Tử Không Vô Hạ Dẫn:",
    "• Tống Kim: 1.000–2.999 điểm nhận 5 cái; 3.000–4.999 nhận 6; 5.000–6.999 nhận 7; 7.000–9.999 nhận 8; từ 10.000 điểm nhận 10 cái.",
    "• Rương TDLT: mỗi lần mở có 5% nhận 1 cái (khóa).",
    "• Vận tiêu cấp 1: hoàn thành nhiệm vụ nhận 1 cái.",
    "• Thi đấu môn phái: hạng 1 nhận 5 cái; hạng 2 nhận 4; hạng 4 và 8 nhận 3; hạng 16 nhận 2 cái.",
    "• Công Thành Chiến: bang chủ bang hạng nhất nhận 20 cái khi nhận thưởng bang chủ.",
  ].join("\n"),
};

const groupLabels: Record<string, string> = {
  general: "Trang bị thường", purple: "Trang bị tím", partnerequip: "Trang bị đồng hành",
  scriptitem: "Vật phẩm chức năng", medicine: "Thuốc", taskquest: "Vật phẩm nhiệm vụ",
  stuffitem: "Nguyên liệu", extbag: "Túi mở rộng", skillitem: "Vật phẩm kỹ năng",
  planitem: "Công thức chế tạo", presentitem: "Túi quà", randomitem: "Túi ngẫu nhiên",
  eventpresent: "Quà sự kiện", horse: "Thú cưỡi", greenequip: "Trang bị bộ",
  "1greenequip": "Trang bị bộ bổ sung", goldequip: "Trang bị vàng", extern: "Cấu hình chuyển đổi",
};
export function cleanItemText(value: string) {
  return value.replace(/<enter\s*\/?>/gi, "\n").replace(/\\n/g, "\n").replace(/<[^>]*>/g, "").trim();
}
function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
}
function categoryOf(source: string) {
  const parts = source.split("/");
  const group = ["extern", "partnerequip", "general", "purple"].find((name) => parts.includes(name));
  const base = path.posix.basename(source, ".txt");
  return groupLabels[group ?? base] ?? "Vật phẩm khác";
}
function neutralName(value: string) {
  return value.replace(/^(?:nam|nữ)\s+/iu, "").replace(/\s*[([]\s*(?:nam|nữ)\s*[)\]]/gi, "").replace(/\s*[-–]\s*(?:nam|nữ)\s*$/gi, "").replace(/\s+/g, " ").trim();
}
const factionLabels = new Set([
  "Đao Thiếu", "Chưởng Độc", "Chỉ Đoàn", "Chiến Nhẫn", "Kiếm Võ", "Côn Thiếu", "Thiên Vương", "Đao Độc", "Đường Môn", "Minh Giáo",
  "Ma Nhẫn", "Cái Bang", "Khí Võ", "Côn Lôn", "Nga My", "Thúy Yên", "Khí Đoàn", "Đao Đường", "Nỏ Đường", "Thương Thiên", "Chùy Thiên",
  "Đao Thúy", "Chưởng Nga", "Côn Cái", "Chưởng Cái", "Đao Côn", "Kiếm Côn", "Chùy Minh", "Kiếm Minh", "Kiếm Thúy", "Phụ Nga",
  "Kim", "Mộc", "Thủy", "Hỏa", "Thổ",
].map(normalize));
function neutralKind(value: string) {
  return value.replace(/\(([^()]*)\)/g, (match, label: string) => label.split(",").every((part) => factionLabels.has(normalize(part.trim()))) ? "" : match)
    .replace(/(?<!\p{L})(?:nam|nữ)(?!\p{L})/giu, "")
    .replace(/\bhệ\s+(?:Kim|Mộc|Thủy|Thổ|Hỏa|-?\d+)/giu, "")
    .replace(/[([]\s*[)\]]/g, "").replace(/\s+/g, " ").trim();
}
export function parseItemTable(text: string, source: string, magicRows: Record<string, string>[] = []): WikiItem[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const columns = lines[0].split("\t").map((name) => name.trim());
  const idColumns = ["Genre", "DetailType", "ParticularType", "Level"];
  // Reward recipes also contain GDPL columns; only template tables declare Icon.
  if (!["Name", "Icon", ...idColumns].every((name) => columns.includes(name))) return [];
  const items: WikiItem[] = [];
  const category = categoryOf(source);
  const readTooltip = createItemTooltipReader(magicRows);
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split("\t");
    const get = (name: string) => cells[columns.indexOf(name)]?.trim() ?? "";
    if (!get("Name") || !idColumns.every((name) => /^\d+$/.test(get(name)))) continue;
    const id = idColumns.map((name) => String(Number(get(name)))).join(",");
    const kind = cleanItemText(get("Kind"));
    const description = [...new Set([get("Intro"), get("Help"), itemNotes[id] ?? ""].map(cleanItemText).filter(Boolean))].join("\n");
    const name = cleanItemText(get("Name"));
    const series = /^-?\d+$/.test(get("Series")) ? Number(get("Series")) : 0;
    const systems = series === -1 ? [1, 2, 3, 4, 5] : series >= 1 && series <= 5 ? [series] : [];
    const equipment = Number(get("Genre")) >= 1 && Number(get("Genre")) <= 5;
    const variantKind = neutralKind(kind);
    // Keep the detailed template key for other consumers, including shop grouping.
    const requirements = Array.from({ length: 6 }, (_, index) => index + 1)
      .filter((index) => !["7", "8"].includes(get(`ReqProp${index}Type`)))
      .map((index) => [get(`ReqProp${index}Type`), get(`ReqProp${index}Value`)])
      .filter(([type]) => type);
    const groupKey = equipment ? JSON.stringify([neutralName(name), get("Genre"), get("DetailType"), get("Level"), category,
      get("QualityPrefix"), get("Category"), variantKind, get("ClassName"), description, get("BindType"), requirements,
      Array.from({ length: 20 }, (_, index) => get(`ExtParam${index + 1}`))]) : JSON.stringify([id, kind, description, get("ClassName")]);
    const quality = get("QualityPrefix");
    const qualityLabel = ({ "3": "Xanh", "4": "Tím", "5": "Cam" } as Record<string, string>)[quality] ?? (quality ? `Phẩm chất ${quality}` : "");
    items.push({
      key: `${source}:${i + 1}`, id, name, kind, category,
      description: description || `${category}${kind ? ` · ${kind}` : ""}. Chưa có mô tả công dụng trong cấu hình.`,
      hasDescription: Boolean(description), icon: get("Icon").replace(/\//g, "\\").toLowerCase(), iconUrl: null,
      level: Number(get("Level")), className: get("ClassName"), source, line: i + 1,
      baseValue: Number(get("ItemValue")) || 0, nameColor: get("Name").match(/<color=([a-z]+)>/i)?.[1]?.toLowerCase(),
      levels: [Number(get("Level"))], qualities: qualityLabel ? [qualityLabel] : [], categories: [category],
      kinds: (equipment ? variantKind : kind) ? [(equipment ? variantKind : kind).replace(/_/g, " · ")] : [],
      descriptions: description ? [description] : [],
      series, groupKey, ids: [id], systems, recordCount: 1, variants: [{ id, source, line: i + 1,
        tooltip: readTooltip(Object.fromEntries(columns.map((column) => [column, get(column)])), description),
        classification: classifyTemplate(id, source, Object.fromEntries(columns.map((column) => [column, get(column)])), category) }],
    });
  }
  return items;
}
export async function readItemCatalog(root: string) {
  const items: WikiItem[] = [];
  let files = 0;
  let magicRows: Record<string, string>[] = [];
  try {
    const magic = (await readFile(path.join(root, "001/magic/magicattrib.txt"), "utf8")).replace(/^\uFEFF/, "").split(/\r?\n/);
    const columns = magic[0].split("\t");
    magicRows = magic.slice(1).filter(Boolean).map((line) => {
      const cells = line.split("\t");
      return Object.fromEntries(columns.map((column, index) => [column, cells[index]?.trim() ?? ""]));
    });
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  async function visit(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
    for (const entry of entries) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile() && entry.name.endsWith(".txt")) {
        const bytes = await readFile(file);
        let text: string;
        try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
        catch { text = new TextDecoder("gb18030").decode(bytes); }
        const parsed = parseItemTable(text, path.relative(root, file).split(path.sep).join("/"), magicRows);
        if (parsed.length) { files++; items.push(...parsed); }
      }
    }
  }
  await visit(root);
  return { items, files };
}
export function groupItemVariants(items: WikiItem[]): WikiItem[] {
  const groups = new Map<string, WikiItem>();
  const canonicalName = (item: WikiItem) => {
    const genre = Number(item.id.split(",")[0]);
    return (genre >= 1 && genre <= 5 ? neutralName(item.name) : item.name)
      .normalize("NFC").replace(/\s+/g, " ").trim().toLocaleLowerCase("vi-VN");
  };
  // A template code may be repeated in legacy tables under another name.
  // Join those aliases before grouping so each code appears in only one row.
  const parents = new Map<string, string>();
  const owners = new Map<string, string>();
  const find = (name: string): string => {
    const parent = parents.get(name);
    if (!parent || parent === name) return name;
    const root = find(parent);
    parents.set(name, root);
    return root;
  };
  for (const item of items) {
    const name = canonicalName(item);
    for (const id of item.ids) {
      const owner = owners.get(id);
      if (owner !== undefined) parents.set(find(name), find(owner));
      else owners.set(id, name);
    }
  }
  for (const item of items) {
    const [genre] = item.id.split(",");
    const equipment = Number(genre) >= 1 && Number(genre) <= 5;
    const name = equipment ? neutralName(item.name) : item.name;
    const key = find(canonicalName(item));
    const group = groups.get(key);
    if (!group) {
      const kind = equipment ? neutralKind(item.kind).replace(/_/g, " · ") : item.kind;
      groups.set(key, { ...item, name, kind,
        description: item.descriptions.join("\n\n"),
        levels: [...item.levels], qualities: [...item.qualities], kinds: [...item.kinds], descriptions: [...item.descriptions], categories: [...item.categories],
        ids: [...item.ids], systems: [...item.systems], variants: [...item.variants] });
      continue;
    }
    group.recordCount += item.recordCount;
    group.ids = [...new Set([...group.ids, ...item.ids])];
    group.systems = [...new Set([...group.systems, ...item.systems])].sort((a, b) => a - b);
    group.variants.push(...item.variants);
    group.categories = [...new Set([...group.categories, ...item.categories])];
    group.levels = [...new Set([...group.levels, ...item.levels])].sort((a, b) => a - b);
    const qualityOrder = ["Trắng", "Lục", "Xanh", "Tím", "Cam"];
    group.qualities = [...new Set([...group.qualities, ...item.qualities])].sort((a, b) => qualityOrder.indexOf(a) - qualityOrder.indexOf(b));
    group.kinds = [...new Set([...group.kinds, ...item.kinds])];
    group.kind = group.kinds.join("\n");
    group.descriptions = [...new Set([...group.descriptions, ...item.descriptions])];
    group.description = group.descriptions.join("\n\n");
    group.hasDescription = group.descriptions.length > 0;
    if (!group.iconUrl && item.iconUrl) { group.icon = item.icon; group.iconUrl = item.iconUrl; }
  }
  return [...groups.values()];
}
export function searchItems(items: WikiItem[], options: { query?: string; category?: string; page?: number; pageSize?: number } = {}): ItemSearchResult {
  const query = normalize(options.query ?? "").trim();
  const codeText = query.replace(/^[{[(]\s*/, "").replace(/\s*[}\])]$/, "").replace(/[,;]\s*$/, "").trim();
  const numericId = /^\d+(?:[\s,;:.\-/]+\d+){0,3}$/.test(codeText)
    ? codeText.split(/[\s,;:.\-/]+/).map(Number) : null;
  const terms = query.split(/\s+/).filter(Boolean);
  const matchesId = (id: string) => {
    const parts = id.split(",").map(Number);
    return numericId!.length === 1 ? parts[2] === numericId![0] : numericId!.every((value, index) => value === parts[index]);
  };
  const names = (item: WikiItem) => normalize([item.name, ...item.variants.map((variant) => variant.tooltip.name)].join(" "));
  const candidates = items.filter((item) => !options.category || item.categories.includes(options.category));
  const named = query && !numericId ? candidates.filter((item) => terms.every((term) => names(item).includes(term))) : [];
  const filtered = named.length ? named : candidates.filter((item) => numericId ? item.ids.some(matchesId)
    : terms.every((term) => normalize(`${names(item)} ${item.ids.join(" ")} ${item.kind} ${item.description} ${item.className} ${item.categories.join(" ")}`).includes(term)));
  if (query && !numericId) {
    const rank = (item: WikiItem) => normalize(item.name) === query ? 0 : names(item).includes(query) ? 1 : terms.every((term) => names(item).includes(term)) ? 2 : 3;
    filtered.sort((a, b) => rank(a) - rank(b));
  }
  const pageSize = Number.isFinite(options.pageSize) ? Math.max(1, Math.min(200, Math.floor(options.pageSize!))) : 50;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Number.isFinite(options.page) ? Math.max(1, Math.min(pages, Math.floor(options.page!))) : 1;
  const selected = filtered.slice((page - 1) * pageSize, page * pageSize).map((item) => {
    const variant = numericId ? item.variants.find((variant) => matchesId(variant.id))
      : query ? item.variants.find((variant) => normalize(variant.tooltip.name) === query) : undefined;
    return variant ? { ...item, id: variant.id, variants: [variant, ...item.variants.filter((entry) => entry !== variant)] } : item;
  });
  return { items: selected, total: filtered.length, page, pages, pageSize };
}
