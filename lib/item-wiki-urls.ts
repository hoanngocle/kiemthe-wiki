export function legacyItemUrl(section: "vu-khi" | "trang-bi", params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams({ group: section });
  for (const name of ["q", "slot", "family", "series", "level", "quality", "page"]) {
    const value = params[name];
    if (typeof value === "string" && value) query.set(name, value);
  }
  if (section === "trang-bi") {
    const family = params.suite ?? params.group;
    if (typeof family === "string" && family) query.set("family", family);
  }
  return `/wiki/vat-pham?${query}`;
}
