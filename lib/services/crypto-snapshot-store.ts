import { prisma } from "@/lib/db";

/** Get previous snapshot for change detection */
export async function getSnapshot(
  source: string,
  symbol: string
): Promise<{ value: number; metadata: unknown } | null> {
  const record = await prisma.cryptoSnapshot.findUnique({
    where: { source_symbol: { source, symbol } },
  });
  if (!record) return null;
  return { value: record.value, metadata: record.metadata };
}

/** Upsert current value after fetch cycle */
export async function upsertSnapshot(
  source: string,
  symbol: string,
  value: number,
  metadata?: unknown
): Promise<void> {
  await prisma.cryptoSnapshot.upsert({
    where: { source_symbol: { source, symbol } },
    update: { value, metadata: metadata ?? undefined },
    create: { source, symbol, value, metadata: metadata ?? undefined },
  });
}

/** Calculate percentage change between old and new values */
export function calcPercentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}
