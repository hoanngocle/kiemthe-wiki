export type NewplayerSectionInfo = { id: string; title: string; searchText: string };

export function filterNewplayerSections<T extends NewplayerSectionInfo>(sections: T[], query: string): T[] {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return sections.filter((section) => {
    const text = normalize(`${section.title} ${section.searchText}`);
    return terms.every((term) => text.includes(term));
  });
}
