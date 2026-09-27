import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import {
  botChat,
  CODE_LANGUAGES,
  evaluateBotSession,
  getProblem,
  shouldPlantTrap,
  type BotEvent,
  type BotEventKind,
  type BotMessage,
  type CodeLanguage,
  type Problem,
} from "@synapse/core";
import type { BotChatResponse, BotReportResponse } from "@/lib/types";
import { badRequest, notFound, type JsonObject } from "./http";
import { withLlmBudget } from "./llm-budget";
import { now } from "./store";
import { fields, type Fields } from "./validate";

const MAX_MESSAGES = 60;
const MAX_EVENTS = 400;
const MAX_MESSAGE_CHARS = 8_000;
const EVENT_KINDS: readonly BotEventKind[] = ["prompt", "insert", "copy", "paste", "run", "submit", "accept", "reject"];

/**
 * Planted-bug notes travel through the browser sealed (AES-GCM, per-process key), so the
 * candidate can't read them in devtools mid-session. A server restart makes old seals unreadable.
 */
const KEY = randomBytes(32);

export function sealTrap(description: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const body = Buffer.concat([cipher.update(description, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

export function openTrap(token: string): string | null {
  try {
    const raw = Buffer.from(token, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", KEY, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

function requireProblem(id: string): Problem {
  const problem = getProblem(id);
  if (!problem) throw notFound(`Unknown problem "${id}".`);
  return problem;
}

function readMessages(f: Fields): BotMessage[] {
  const raw = f.raw("messages");
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) {
    throw badRequest(`Invalid request: messages must be a list of 1-${MAX_MESSAGES} messages.`);
  }
  return raw.map((entry, index) => {
    if (!entry || typeof entry !== "object") throw badRequest(`Invalid request: messages[${index}] must be an object.`);
    const item = fields(entry as JsonObject);
    const role = item.oneOf("role", ["user", "assistant"] as const);
    const content = item.string("content", { max: MAX_MESSAGE_CHARS, trim: false });
    item.done();
    return { role, content };
  });
}

export async function chatWithBot(body: JsonObject): Promise<BotChatResponse> {
  const f = fields(body);
  const problemId = f.string("problemId", { max: 120 });
  const language = f.oneOf("language", CODE_LANGUAGES as readonly CodeLanguage[]);
  const code = f.string("code", { min: 0, max: 50_000, trim: false });
  const trapMode = f.boolean("trapMode");
  const trapsUsed = f.number("trapsUsed", { integer: true, min: 0, max: 10 });
  f.done();
  const messages = readMessages(f);
  if (messages.at(-1)?.role !== "user") throw badRequest("Invalid request: the last message must be from the user.");
  const problem = requireProblem(problemId);
  const plantTrap = shouldPlantTrap(trapMode, trapsUsed);
  const reply = await withLlmBudget(now(), (useLlm) => botChat({ problem, language, code, messages, plantTrap }, { useLlm }));
  return {
    reply: reply.reply,
    source: reply.source,
    trapToken: reply.trap.planted && reply.trap.description ? sealTrap(reply.trap.description) : null,
  };
}

function readEvents(raw: unknown): BotEvent[] {
  if (!Array.isArray(raw) || raw.length > MAX_EVENTS) throw badRequest(`Invalid request: events must be a list of at most ${MAX_EVENTS}.`);
  return raw.map((entry, index) => {
    if (!entry || typeof entry !== "object") throw badRequest(`Invalid request: events[${index}] must be an object.`);
    const item = fields(entry as JsonObject);
    const event: BotEvent = {
      at: item.number("at", { min: 0, max: 24 * 3_600_000 }),
      kind: item.oneOf("kind", EVENT_KINDS),
      detail: item.optionalString("detail", { min: 0, max: 2_000 }),
      passed: item.optionalNumber("passed", { integer: true, min: 0, max: 1_000 }),
      total: item.optionalNumber("total", { integer: true, min: 0, max: 1_000 }),
    };
    item.done();
    return event;
  });
}

export async function reportBotSession(body: JsonObject): Promise<BotReportResponse> {
  const f = fields(body);
  const problemId = f.string("problemId", { max: 120 });
  const language = f.oneOf("language", CODE_LANGUAGES as readonly CodeLanguage[]);
  const finalCode = f.string("finalCode", { min: 0, max: 50_000, trim: false });
  const durationMs = f.number("durationMs", { integer: true, min: 0, max: 24 * 3_600_000 });
  const rawTraps = f.raw("traps");
  const rawResult = f.raw("lastResult");
  f.done();
  const messages = f.raw("messages") === undefined || (Array.isArray(f.raw("messages")) && (f.raw("messages") as unknown[]).length === 0) ? [] : readMessages(f);
  const events = readEvents(f.raw("events") ?? []);
  if (!Array.isArray(rawTraps) || rawTraps.length > 10) throw badRequest("Invalid request: traps must be a list.");
  const traps = rawTraps.map((entry, index) => {
    const item = fields((entry ?? {}) as JsonObject);
    const messageIndex = item.number("messageIndex", { integer: true, min: 0, max: MAX_MESSAGES });
    const token = item.string("token", { max: 4_000 });
    item.done();
    return { messageIndex, description: openTrap(token) ?? `A planted bug in message ${index + 1} (details expired after a server restart).` };
  });
  let lastResult: { status: string; passed: number; total: number } | null = null;
  if (rawResult && typeof rawResult === "object") {
    const item = fields(rawResult as JsonObject);
    lastResult = {
      status: item.string("status", { max: 40 }),
      passed: item.number("passed", { integer: true, min: 0, max: 1_000 }),
      total: item.number("total", { integer: true, min: 0, max: 1_000 }),
    };
    item.done();
  }
  const problem = requireProblem(problemId);
  return withLlmBudget(now(), (useLlm) => evaluateBotSession({ problem, language, finalCode, durationMs, messages, events, traps, lastResult }, { useLlm }));
}
