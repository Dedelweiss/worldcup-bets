const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Extrait un UUID renvoyé par une RPC Supabase (scalaire ou JSON string) */
export function parseRpcUuid(data: unknown): string | null {
  if (data == null) return null;

  if (typeof data === "string") {
    const trimmed = data.trim().replace(/^"|"$/g, "");
    return UUID_REGEX.test(trimmed) ? trimmed : null;
  }

  if (typeof data === "object" && data !== null && "id" in data) {
    return parseRpcUuid((data as { id: unknown }).id);
  }

  return null;
}

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}
