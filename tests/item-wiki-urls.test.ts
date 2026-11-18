import assert from "node:assert/strict";
import { test } from "node:test";
import { legacyItemUrl } from "../lib/item-wiki-urls.ts";

test("legacy weapon links retain the selected family, element, wear level and query", () => {
  const url = new URL(legacyItemUrl("vu-khi", { family: "hao-thien", level: "130", series: "1", q: "2,1,12084,10" }), "http://localhost");
  assert.equal(url.pathname, "/wiki/vat-pham");
  assert.equal(url.searchParams.get("group"), "vu-khi");
  assert.equal(url.searchParams.get("family"), "hao-thien");
  assert.equal(url.searchParams.get("q"), "2,1,12084,10");
  assert.equal(url.searchParams.get("level"), "130");
  assert.equal(url.searchParams.get("series"), "1");
});
test("legacy armor and special-equipment links map their family filters without losing the slot", () => {
  const gear = new URL(legacyItemUrl("trang-bi", { slot: "mu", suite: "12" }), "http://localhost");
  assert.equal(gear.searchParams.get("group"), "trang-bi");
  assert.equal(gear.searchParams.get("family"), "12");
  assert.equal(gear.searchParams.get("slot"), "mu");
  const special = new URL(legacyItemUrl("trang-bi", { slot: "dong-hanh", group: "Chi Nhẫn" }), "http://localhost");
  assert.equal(special.searchParams.get("family"), "Chi Nhẫn");
  assert.equal(special.searchParams.get("group"), "trang-bi");
});
