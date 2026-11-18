import { redirect } from "next/navigation";

export default async function LegacyWeaponPage({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/wiki/vat-pham/${encodeURIComponent((await params).id)}`);
}
