import "server-only";

import { evaluateMockLoop, type MockBehavioralRound, type MockCodingRound, type MockGrillRound, type MockPacket } from "@synapse/core";
import { badRequest, type JsonObject } from "./http";
import { withLlmBudget } from "./llm-budget";
import { currentUserId, getStore, now } from "./store";
import { fields } from "./validate";

function object(raw: unknown, name: string): JsonObject | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) throw badRequest(`Invalid request: ${name} must be an object.`);
  return raw as JsonObject;
}

function strings(raw: unknown, name: string): string[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > 5 || raw.some((item) => typeof item !== "string" || item.length > 400)) {
    throw badRequest(`Invalid request: ${name} must be a list of up to 5 short strings.`);
  }
  return raw as string[];
}

function readCoding(raw: JsonObject): MockCodingRound {
  const f = fields(raw);
  const aiUseRaw = object(f.raw("aiUse"), "coding.aiUse");
  const round: MockCodingRound = {
    problemTitle: f.string("problemTitle", { max: 200 }),
    difficulty: f.string("difficulty", { max: 20 }),
    language: f.string("language", { max: 40 }),
    passed: f.number("passed", { integer: true, min: 0, max: 1_000 }),
    total: f.number("total", { integer: true, min: 0, max: 1_000 }),
    status: f.string("status", { max: 40 }),
    minutesUsed: f.number("minutesUsed", { min: 0, max: 600 }),
    minutesAllowed: f.number("minutesAllowed", { min: 1, max: 600 }),
    aiAllowed: f.boolean("aiAllowed"),
    aiUse: null,
  };
  f.done();
  if (aiUseRaw) {
    const a = fields(aiUseRaw);
    round.aiUse = { overall: a.number("overall", { min: 0, max: 100 }), summary: a.string("summary", { min: 0, max: 600 }) };
    a.done();
  }
  return round;
}

function readBehavioral(raw: JsonObject): MockBehavioralRound {
  const f = fields(raw);
  const round: MockBehavioralRound = {
    question: f.string("question", { max: 600 }),
    competency: f.string("competency", { max: 120 }),
    overall: f.number("overall", { min: 0, max: 100 }),
    strengths: strings(f.raw("strengths"), "behavioral.strengths"),
    improvements: strings(f.raw("improvements"), "behavioral.improvements"),
  };
  f.done();
  return round;
}

function readGrill(raw: JsonObject): MockGrillRound {
  const f = fields(raw);
  const round: MockGrillRound = {
    overall: f.number("overall", { min: 0, max: 100 }),
    summary: f.string("summary", { min: 0, max: 600 }),
    held: f.number("held", { integer: true, min: 0, max: 50 }),
    shaky: f.number("shaky", { integer: true, min: 0, max: 50 }),
    cracked: f.number("cracked", { integer: true, min: 0, max: 50 }),
  };
  f.done();
  return round;
}

/** Scores the loop, writes the committee packet, and saves it as a "mock" practice session. */
export async function mockPacket(body: JsonObject): Promise<MockPacket> {
  const coding = object(body.coding, "coding");
  const behavioral = object(body.behavioral, "behavioral");
  const grill = object(body.grill, "grill");
  if (!coding && !behavioral && !grill) throw badRequest("Invalid request: finish at least one round.");
  const input = {
    coding: coding ? readCoding(coding) : null,
    behavioral: behavioral ? readBehavioral(behavioral) : null,
    grill: grill ? readGrill(grill) : null,
  };
  const packet = await withLlmBudget(now(), (useLlm) => evaluateMockLoop(input, { useLlm }));
  const store = getStore();
  const userId = currentUserId();
  store.ensureUser(userId, now());
  store.recordPracticeSession({ userId, kind: "mock", subject: input.coding?.problemTitle ?? null, score: packet.overall, report: { packet, input }, now: now() });
  return packet;
}
