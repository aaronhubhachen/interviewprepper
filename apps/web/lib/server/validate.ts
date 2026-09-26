import { badRequest, type JsonObject } from "./http";

interface StringOptions {
  /** Minimum trimmed length (default 1; use 0 to allow ""). */
  min?: number;
  max?: number;
  /** Trim surrounding whitespace (default true). */
  trim?: boolean;
}

interface NumberOptions {
  min?: number;
  max?: number;
  integer?: boolean;
}

/**
 * Tiny field validator (no zod dependency in the web workspace). Collects
 * every problem, then `done()` throws a 400 listing them per field:
 *
 *   const f = fields(await readJson(request));
 *   const cardId = f.string("cardId", { max: 120 });
 *   const grade = f.optionalOneOf("grade", [1, 3, 5] as const);
 *   f.done();
 */
export function fields(body: JsonObject) {
  const errors: Record<string, string> = {};
  const fail = (key: string, message: string) => {
    errors[key] ??= message;
  };
  const present = (key: string) => body[key] !== undefined && body[key] !== null;

  function readString(key: string, required: boolean, options: StringOptions): string | undefined {
    if (!present(key)) {
      if (required) fail(key, "is required");
      return undefined;
    }
    const raw = body[key];
    if (typeof raw !== "string") {
      fail(key, "must be a string");
      return undefined;
    }
    const value = options.trim === false ? raw : raw.trim();
    const min = options.min ?? 1;
    if (value.length < min) fail(key, min <= 1 ? "must not be empty" : `must be at least ${min} characters`);
    else if (options.max !== undefined && value.length > options.max) fail(key, `must be at most ${options.max} characters`);
    return value;
  }

  function readNumber(key: string, required: boolean, options: NumberOptions): number | undefined {
    if (!present(key)) {
      if (required) fail(key, "is required");
      return undefined;
    }
    const raw = body[key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      fail(key, "must be a number");
      return undefined;
    }
    if (options.integer && !Number.isInteger(raw)) fail(key, "must be an integer");
    else if (options.min !== undefined && raw < options.min) fail(key, `must be >= ${options.min}`);
    else if (options.max !== undefined && raw > options.max) fail(key, `must be <= ${options.max}`);
    return raw;
  }

  function readOneOf<T extends string | number>(key: string, required: boolean, allowed: readonly T[]): T | undefined {
    if (!present(key)) {
      if (required) fail(key, "is required");
      return undefined;
    }
    const raw = body[key];
    if (!allowed.includes(raw as T)) {
      fail(key, `must be one of: ${allowed.join(", ")}`);
      return undefined;
    }
    return raw as T;
  }

  return {
    /** Required string ("" placeholder after an error; done() will throw). */
    string: (key: string, options: StringOptions = {}): string => readString(key, true, options) ?? "",
    optionalString: (key: string, options: StringOptions = {}): string | undefined => readString(key, false, options),
    number: (key: string, options: NumberOptions = {}): number => readNumber(key, true, options) ?? 0,
    optionalNumber: (key: string, options: NumberOptions = {}): number | undefined => readNumber(key, false, options),
    optionalBoolean: (key: string): boolean | undefined => {
      if (!present(key)) return undefined;
      if (typeof body[key] !== "boolean") {
        fail(key, "must be true or false");
        return undefined;
      }
      return body[key] as boolean;
    },
    boolean: (key: string): boolean => {
      if (typeof body[key] !== "boolean") {
        fail(key, present(key) ? "must be true or false" : "is required");
        return false;
      }
      return body[key] as boolean;
    },
    oneOf: <T extends string | number>(key: string, allowed: readonly T[]): T =>
      readOneOf(key, true, allowed) ?? allowed[0]!,
    optionalOneOf: <T extends string | number>(key: string, allowed: readonly T[]): T | undefined =>
      readOneOf(key, false, allowed),
    /** Raw value for custom checks. */
    raw: (key: string): unknown => body[key],
    /** Record a custom validation error. */
    fail,
    /** Throws a 400 with every collected field error. */
    done(): void {
      const keys = Object.keys(errors);
      if (keys.length > 0) {
        const summary = keys.map((key) => `${key} ${errors[key]}`).join("; ");
        throw badRequest(`Invalid request: ${summary}.`, errors);
      }
    },
  };
}

export type Fields = ReturnType<typeof fields>;
