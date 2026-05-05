/** Compute Prisma skip/take from page and limit params */
export function paginate(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 50);
  return { skip: (safePage - 1) * safeLimit, take: safeLimit };
}

/** Create a JSON error response */
export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
