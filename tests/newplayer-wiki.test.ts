import assert from "node:assert/strict";
import { test } from "node:test";
import { filterNewplayerSections } from "../lib/newplayer-wiki.ts";

const sections = [
  { id: "chuyen-sinh", title: "Tiến Hành Chuyển Sinh", searchText: "Tháo 10 món trang bị, tối đa 250 lần." },
  { id: "knb", title: "Mua Kim Nguyên Bảo Đại", searchText: "100.000 Đồng khóa hoặc 1.000.000 Bạc thường mỗi viên." },
  { id: "tui", title: "Nhận Lại Túi Tân Thủ", searchText: "Quà OPEN trao danh hiệu Tân Thủ." },
];

test("searches Vietnamese titles and body text without requiring accents", () => {
  assert.deepEqual(filterNewplayerSections(sections, "NGUYEN BAO dong khoa").map((s) => s.id), ["knb"]);
  assert.deepEqual(filterNewplayerSections(sections, "qua open danh hieu").map((s) => s.id), ["tui"]);
});

test("requires every query word and keeps the original order and data", () => {
  const before = JSON.stringify(sections);
  assert.deepEqual(filterNewplayerSections(sections, "chuyen 250").map((s) => s.id), ["chuyen-sinh"]);
  assert.deepEqual(filterNewplayerSections(sections, "chuyen bac"), []);
  assert.equal(JSON.stringify(sections), before);
});

test("blank search restores all sections while an unmatched search is empty", () => {
  assert.deepEqual(filterNewplayerSections(sections, "  \n "), sections);
  assert.deepEqual(filterNewplayerSections(sections, "khong-co-muc-nay"), []);
});
