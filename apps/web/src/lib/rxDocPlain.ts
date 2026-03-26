export type MutableJsonable = { toMutableJSON: () => unknown };

export function hasToMutableJSON(value: unknown): value is MutableJsonable {
  return (
    typeof value === "object" &&
    value !== null &&
    "toMutableJSON" in value &&
    typeof (value as { toMutableJSON?: unknown }).toMutableJSON === "function"
  );
}

export function toPlain<T>(doc: unknown): T {
  if (hasToMutableJSON(doc)) return doc.toMutableJSON() as T;
  return doc as T;
}
