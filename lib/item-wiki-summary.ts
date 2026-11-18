import type { WikiItem } from "./item-wiki-types.ts";

const companionPieces = ["Liên", "Lưng", "Giày", "Bội", "Nón"];
const materialDrops = "Có thể nhận từ Túi Nguyên Liệu Nâng Cấp (150), Rương TDLT (5) và thưởng online (1).";
const curated: Record<string, string[]> = {
  "18,1,3071,1": ["Nâng Tử Điệp, Pháp Sư, Phù Thủy hoặc Bạch Linh. Mỗi lượt cần 5.000 Linh Khí và 20 KNB Đại.", materialDrops],
  "18,1,3090,1": [
    "Nâng Nguyệt Ảnh. Mỗi lượt cần 5.000 Linh Hồn Thú Cưng và 20 KNB Đại.",
    "Túi Nguyên Liệu Nâng Cấp có thể cho 150. Rương Linh Hồn Thú Cưng cho ngẫu nhiên 2–10.",
  ],
  "18,1,1781,1": ["Nâng Tín Vật. Mỗi lượt cần 5.000 Mật Tín và 20 KNB Đại.", "Túi Nguyên Liệu Nâng Cấp có thể cho 150 Mật Tín khóa."],
  "18,1,1064,1": ["Nâng Huy Chương. Mỗi lượt cần 5.000 Huy chương Chiến Thần và 20 KNB Đại.", "Túi Nguyên Liệu Nâng Cấp có thể cho 150 huy chương khóa."],
  "18,1,3051,1": ["Dùng cho Già Lam Kinh, Thủy Linh và Kiếm Sĩ. Nâng Thủy Linh hoặc Kiếm Sĩ cần 5.000 mảnh và 20 KNB Đại/lượt.", materialDrops],
  "18,1,9133,1": [
    "Nâng Bảo Châu từ cấp nhân vật 20. Mỗi lượt cần 5.000 Bảo Châu-Sơ và 20 KNB Đại.",
    "NPC Đổi Thưởng nhận 50.000 nguyên liệu cùng loại để đổi 50.000 Bảo Châu-Sơ khóa. Cũng có trong túi nguyên liệu, Rương TDLT và thưởng online.",
  ],
  "18,1,9115,3": ["Nâng Kinh Mạch từ cấp nhân vật 20. Mỗi lượt cần 5.000 cuốn và 20 KNB Đại.", materialDrops],
  "18,1,3060,8": [
    "Mở nhận 50 mảnh khóa, ngẫu nhiên 1 trong 11 loại nguyên liệu Thú Cưng và Đồng Hành.",
    "Nhận từ Tống Kim (10–50 túi), vận tiêu cấp 1 (10), thi đấu môn phái (30–200) và thưởng bang chủ Công Thành Chiến (100).",
  ],
  "18,1,1782,1": [
    "Dùng để đúc lại chỉ số vũ khí.",
    "Nhận từ Tống Kim (5–10), vận tiêu cấp 1 (1), thi đấu môn phái (2–5), thưởng bang chủ Công Thành Chiến (20) hoặc Rương TDLT (5% nhận 1).",
  ],
  "18,1,3114,1": ["Nâng Pháp Bảo Trấn Phái. Mỗi lượt cần 1.000 mảnh, 20 KNB Đại và 1 Bùa Bảo Toàn.", "Túi Nguyên Liệu Nâng Cấp có thể cho 150 mảnh khóa."],
  "18,1,3119,5": ["Đưa cả 5 dòng của Thánh Linh đang đeo lên cấp 400.", "Nhận kèm khi mở Rương Thánh Linh vĩnh viễn."],
  "18,1,3119,6": ["Đưa Ngoại Trang đang đeo lên mức luyện hóa 20. Cần đeo Nón có luyện hóa."],
  "18,1,3119,7": ["Đưa cả 4 dòng của Chân Nguyên chính đang đeo lên cấp 400.", "Nhận kèm khi mở Rương Chân Nguyên vĩnh viễn."],
  ...Object.fromEntries(companionPieces.map((piece, index) => [`18,1,3120,${index + 7}`, [
    `Nâng Kỹ Năng Đồng Hành (${piece}). Mỗi lượt cần 10.000 mảnh và 100 KNB Đại.`,
    "Túi Nguyên Liệu Đồng Hành có tỷ lệ 1/11 cho 50 mảnh khóa.",
  ]])),
};

const clickAction = "(?:(?:nhấn|nhấp|bấm|click|kích)\\s+(?:(?:nút\\s+)?(?:chuột\\s+)?(?:phải|trái)|vào)|chuột\\s+(?:phải|trái))";
const splitFacts = new RegExp(`\\n+|(?<=[.!?…])\\s+|[,;]\\s*(?=${clickAction}\\b)`, "iu");
const manual = new RegExp(`(?:^|\\s+)(?:(?:hãy|sau khi|rồi|sau đó)\\s+)?${clickAction}\\b\\s*`, "giu");
const noAction = /^(?:(?:để|sẽ)\s+)?(?:mở(?:\s+ra)?|dùng|sử dụng|xem(?:\s+thêm)?)\s*[.!]?$/iu;
const dismissible = /^(?:vui lòng tra|xem thêm tại|chi tiết xem|tham khảo (?:tại|trong))/iu;
const functionText = /(?:^|[\s,])(?:dùng|nhận|tăng|giảm|đổi|ghép|mua|hồi|cường hóa|luyện(?: hóa| thành)|nâng|yêu cầu|điều kiện|nguyên liệu|phần thưởng|rơi|chế tạo|cộng|cho phép|danh vọng|tiêu hao|vào phó bản)\b/iu;
const sourceText = /phần thưởng (?:cho|từ|của)|nhận được (?:khi|từ|sau)|có thể rơi|mua (?:ở|tại)|nguồn nhận/iu;

function coreSentence(value: string) {
  let sentence = value.trim().replace(/^[•·]\s*/, "").replace(/\s+/g, " ");
  if (!sentence || dismissible.test(sentence)) return "";
  sentence = sentence.replace(manual, " ").trim();
  if (noAction.test(sentence)) return "";
  sentence = sentence
    .replace(/^dùng để\s+/iu, "")
    .replace(/^dùng lệnh bài này có thể vào\s+/iu, "Vào ")
    .replace(/^mở(?:\s+ra)?(?:\s+xem)?\s+(?:(?:sẽ|có thể|được)\s+)+nhận(?:\s+được)?\s+/iu, "Mở nhận ")
    .replace(/^(?:sử dụng|dùng)(?:,|\s+)\s*(?:(?:sẽ|có thể|được)\s+)*nhận(?:\s+được)?\s+/iu, "Nhận ")
    .replace(/^(?:dùng|sử dụng),?\s+(?:có\s+)?được\s+/iu, "Nhận ")
    .replace(/^(?:dùng|sử dụng)\s+(?:để\s+)?(?=tăng|giảm|đổi|ghép|nhận|hồi)/iu, "")
    .replace(/^(sẽ nhận|có thể nhận) được\s+/iu, "Nhận ")
    .replace(/^(vào phó bản[^,]+),\s+đối thoại với.+$/iu, "$1.")
    .replace(/\s+,/g, ",");
  return sentence ? sentence[0].toLocaleUpperCase("vi-VN") + sentence.slice(1) : "";
}

function limitSentence(text: string) {
  if (text.length <= 170) return text;
  const prefix = text.slice(0, 165);
  const end = Math.max(prefix.lastIndexOf(", "), prefix.lastIndexOf("; "));
  if (end > 105) return prefix.slice(0, end) + ".";
  return prefix.replace(/\s+\S*$/, "").trimEnd() + "…";
}

export function summarizeItem(item: Pick<WikiItem, "ids" | "descriptions">): string[] {
  const exact = item.ids.flatMap((id) => curated[id] ?? []);
  if (exact.length) return [...new Set(exact)].slice(0, 2);
  const sentences = item.descriptions.flatMap((text) => text.split(splitFacts).map(coreSentence).filter(Boolean));
  const unique = [...new Map(sentences.map((text) => [text.toLocaleLowerCase("vi-VN").replace(/[.!?]+$/, ""), text])).values()];
  const core = unique.filter((text) => functionText.test(text));
  if (!core.length) return unique.slice(0, 1).map(limitSentence);
  const source = core.find((text) => sourceText.test(text));
  const priority = (text: string) => Number(/\d/.test(text)) + Number(/^(?:mở nhận|nhận|tăng|giảm|đổi|ghép|hồi|nâng|yêu cầu|điều kiện|vào phó bản)\b/iu.test(text));
  const effects = core.filter((text) => text !== source).sort((a, b) => priority(b) - priority(a));
  return (source ? [...effects.slice(0, 1), source] : effects.slice(0, 2)).map(limitSentence);
}
