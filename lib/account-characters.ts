import type { Character } from "./topup-types.ts";

export type AccountCharacterGroup = { account: string; registered: boolean; characters: Character[] };

export function groupAccountCharacters(registeredNames: string[], characters: Character[]): AccountCharacterGroup[] {
  const keyOf = (name: string) => name.trim().toLowerCase();
  const registered = new Set(registeredNames.map(keyOf));
  const groups = new Map<string, AccountCharacterGroup>();
  for (const character of characters) {
    const key = keyOf(character.account);
    const group = groups.get(key) ?? { account: character.account, registered: registered.has(key), characters: [] };
    if (!group.characters.some((existing) => existing.id === character.id)) group.characters.push(character);
    groups.set(key, group);
  }
  return [...groups.values()];
}
