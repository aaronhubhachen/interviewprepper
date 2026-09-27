import "server-only";

import {
  DESIGN_COMPONENTS,
  DESIGN_PHASES,
  DESIGN_QUESTION_COUNT,
  getDesignPrompt,
  type DesignComponentKind,
  type DesignDiagram,
  type DesignPhase,
  type DesignSessionInput,
  type DesignTurn,
} from "@synapse/core";
import { badRequest, type JsonObject } from "./http";
import { fields } from "./validate";

const MAX_NODES = 40;
const MAX_EDGES = 80;
const MAX_NOTES = 8_000;
const MAX_ANSWER = 6_000;
const KINDS = DESIGN_COMPONENTS.map((component) => component.kind);

function object(raw: unknown, name: string): JsonObject {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw badRequest(`Invalid request: ${name} must be an object.`);
  return raw as JsonObject;
}

function array(raw: unknown, name: string, max: number): unknown[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw badRequest(`Invalid request: ${name} must be an array.`);
  if (raw.length > max) throw badRequest(`Invalid request: ${name} must have at most ${max} entries.`);
  return raw;
}

function readDiagram(raw: unknown): DesignDiagram {
  const body = object(raw ?? { nodes: [], edges: [] }, "diagram");
  const nodes = array(body.nodes, "diagram.nodes", MAX_NODES).map((entry, i) => {
    const f = fields(object(entry, `diagram.nodes[${i}]`));
    const node = {
      id: f.string("id", { max: 40 }),
      kind: f.oneOf("kind", KINDS) as DesignComponentKind,
      label: f.string("label", { min: 0, max: 60 }),
      x: f.number("x", { min: -100, max: 2_000 }),
      y: f.number("y", { min: -100, max: 2_000 }),
    };
    f.done();
    return node;
  });
  const ids = new Set(nodes.map((node) => node.id));
  if (ids.size !== nodes.length) throw badRequest("Invalid request: diagram node ids must be unique.");
  const edges = array(body.edges, "diagram.edges", MAX_EDGES).map((entry, i) => {
    const f = fields(object(entry, `diagram.edges[${i}]`));
    const edge = { from: f.string("from", { max: 40 }), to: f.string("to", { max: 40 }), label: f.string("label", { min: 0, max: 60 }) };
    f.done();
    if (!ids.has(edge.from) || !ids.has(edge.to)) throw badRequest(`Invalid request: diagram.edges[${i}] must connect existing nodes.`);
    return edge;
  });
  return { nodes, edges };
}

function readTurn(raw: unknown, index: number): DesignTurn {
  const f = fields(object(raw, `turns[${index}]`));
  const turn = {
    phase: f.oneOf("phase", DESIGN_PHASES) as DesignPhase,
    question: f.string("question", { max: 600 }),
    answer: f.string("answer", { max: MAX_ANSWER }),
  };
  f.done();
  return turn;
}

/** Validates { promptId, diagram, notes, turns } for /api/design/next and /api/design/report. */
export function readDesignSession(body: JsonObject, { requireTurns = false } = {}): DesignSessionInput {
  const f = fields(body);
  const promptId = f.string("promptId", { max: 60 });
  const notes = f.optionalString("notes", { min: 0, max: MAX_NOTES }) ?? "";
  f.done();
  const prompt = getDesignPrompt(promptId);
  if (!prompt) throw badRequest("Invalid request: unknown design prompt.");
  const turns = array(body.turns, "turns", DESIGN_QUESTION_COUNT).map(readTurn);
  if (requireTurns && turns.length === 0) throw badRequest("Invalid request: answer at least one question first.");
  return { prompt, diagram: readDiagram(body.diagram), notes, turns };
}
