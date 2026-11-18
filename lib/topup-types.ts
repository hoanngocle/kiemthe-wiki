export const topupPackages = [500, 1000, 2000] as const;
export type Character = { id: string; name: string; account: string };
export type TopupRequest = { requestId: string; characterId: string; amountK: number };
export type TopupReceipt = { requestId: string; character: Character; amountK: number; coin: number; createdAt: string };
export type TopupMilestone = { amountK: number; rewards: { name: string; quantity: number; iconUrl?: string }[] };
