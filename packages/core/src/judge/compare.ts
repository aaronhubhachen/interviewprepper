import type { CompareMode } from "../content/types";

const FLOAT_TOLERANCE = 1e-5;

/** JSON with object keys sorted, so structurally equal values serialize identically. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, inner: unknown) => {
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      const entries = Object.entries(inner as Record<string, unknown>);
      return Object.fromEntries(entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
    }
    return inner;
  });
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => deepEqual(item, b[i]));
  }
  const aEntries = Object.keys(a as object);
  const bRecord = b as Record<string, unknown>;
  return (
    aEntries.length === Object.keys(bRecord).length &&
    aEntries.every((key) => key in bRecord && deepEqual((a as Record<string, unknown>)[key], bRecord[key]))
  );
}

function floatEqual(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) <= FLOAT_TOLERANCE * Math.max(1, Math.abs(a), Math.abs(b));
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => floatEqual(item, b[i]));
  }
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const aRecord = a as Record<string, unknown>;
    const bRecord = b as Record<string, unknown>;
    const keys = Object.keys(aRecord);
    return (
      keys.length === Object.keys(bRecord).length &&
      keys.every((key) => key in bRecord && floatEqual(aRecord[key], bRecord[key]))
    );
  }
  return deepEqual(a, b);
}

function sortedCanonical(items: unknown[]): string[] {
  return items.map(canonicalJson).sort();
}

function sameMultiset(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  const left = sortedCanonical(a);
  const right = sortedCanonical(b);
  return left.every((item, i) => item === right[i]);
}

/** Order-independent stand-in for an inner array: its elements' canonical JSON, sorted. */
function innerKey(item: unknown): unknown {
  return Array.isArray(item) ? sortedCanonical(item) : item;
}

/**
 * exact: deep equality. unordered: top-level multiset (inner order matters).
 * unordered-nested: inner arrays sorted, then outer multiset. float: 1e-5 tolerance, recursive.
 */
export function compareOutput(actual: unknown, expected: unknown, mode: CompareMode): boolean {
  switch (mode) {
    case "exact":
      return deepEqual(actual, expected);
    case "float":
      return floatEqual(actual, expected);
    case "unordered":
      return Array.isArray(actual) && Array.isArray(expected) ? sameMultiset(actual, expected) : deepEqual(actual, expected);
    case "unordered-nested":
      return Array.isArray(actual) && Array.isArray(expected)
        ? sameMultiset(actual.map(innerKey), expected.map(innerKey))
        : deepEqual(actual, expected);
  }
}
