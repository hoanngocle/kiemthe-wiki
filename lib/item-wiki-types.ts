export type ItemTooltipStat = {
  section: string; label: string; code: string; value: string;
  magicLevel?: number; unlock?: number;
};
export type ItemTooltip = {
  name: string; kind: string; level: number; series: number; quality: string;
  description: string; stats: ItemTooltipStat[]; requirements: string[];
};
export type ItemClassification = {
  group: "vu-khi" | "trang-bi" | "vat-pham"; slot: string; slotName: string;
  family: string; familyName: string; requiredLevel: number | null; suiteId?: number;
};
export type ItemFilters = { group?: string; slot?: string; family?: string; series?: string; level?: string; quality?: string };
export type ItemFacets = {
  groups: { value: string; label: string; count: number }[];
  slots: { value: string; label: string }[]; families: { value: string; label: string }[];
  levels: number[]; qualities: string[];
};
export type ItemVariant = { id: string; source: string; line: number; tooltip: ItemTooltip; classification: ItemClassification };
export type ItemAcquisition = {
  method: string; npc?: string; maps: string[]; requirements: string[];
  cost?: string; series?: number;
  type?: "upgrade"; targetId?: string;
};
export type WikiItem = {
  key: string; id: string; name: string; kind: string; category: string;
  description: string; hasDescription: boolean; icon: string; iconUrl: string | null;
  level: number; className: string; source: string; line: number;
  baseValue?: number; nameColor?: string;
  levels: number[]; qualities: string[]; kinds: string[]; descriptions: string[]; categories: string[];
  series: number; groupKey: string; ids: string[]; systems: number[]; recordCount: number;
  variants: ItemVariant[];
};
export type ItemSearchResult = {
  items: WikiItem[]; total: number; page: number; pages: number; pageSize: number;
};
export type ItemWikiEntry = Pick<WikiItem, "id" | "name" | "iconUrl" | "levels" | "qualities" | "systems" | "key"> & {
  variantCount: number;
  summary: string[];
  variants: (Pick<ItemVariant, "id" | "source" | "line"> & { label: string })[];
  tooltip: ItemTooltip;
  selectedVariant: string;
  acquisition: ItemAcquisition[];
  classification: ItemClassification;
};
export type ItemWikiResponse = Omit<ItemSearchResult, "items"> & {
  items: ItemWikiEntry[];
  categories: { name: string; count: number }[];
  facets: ItemFacets;
};
