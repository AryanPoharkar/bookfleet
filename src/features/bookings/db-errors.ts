type ErrorRecord = { code?: unknown; message?: unknown; meta?: unknown; cause?: unknown };

function isRecord(value: unknown): value is ErrorRecord {
  return typeof value === "object" && value !== null;
}

function hasSqlState(value: unknown, state: string): boolean {
  if (!isRecord(value)) return false;
  return value.code === state || (isRecord(value.meta) && value.meta.code === state);
}

export function isExclusionViolation(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  for (let depth = 0; depth <= 5 && current !== null && current !== undefined && !seen.has(current); depth += 1) {
    seen.add(current);
    if (hasSqlState(current, "23P01")) return true;
    if (isRecord(current)) {
      if (typeof current.message === "string" && current.message.includes("booking_no_overlap")) return true;
      if (isRecord(current.meta) && typeof current.meta.message === "string" && current.meta.message.includes("booking_no_overlap")) return true;
    }
    current = isRecord(current) ? current.cause : undefined;
  }
  return false;
}

export function isUniqueViolation(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  for (let depth = 0; depth <= 5 && current !== null && current !== undefined && !seen.has(current); depth += 1) {
    seen.add(current);
    if (isRecord(current) && current.code === "P2002") return true;
    if (hasSqlState(current, "23505")) return true;
    current = isRecord(current) ? current.cause : undefined;
  }
  return false;
}
