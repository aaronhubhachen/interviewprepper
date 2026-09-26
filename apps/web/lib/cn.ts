export type ClassValue = string | number | false | null | undefined | ClassValue[];

/**
 * Joins class names, skipping falsy values. There is no tailwind-merge: when a
 * caller's className conflicts with a component default (e.g. two paddings),
 * CSS order decides, so prefer additive overrides.
 */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const value of values) {
    if (!value && value !== 0) continue;
    if (Array.isArray(value)) {
      const nested = cn(...value);
      if (nested) out.push(nested);
    } else {
      out.push(String(value));
    }
  }
  return out.join(" ");
}
