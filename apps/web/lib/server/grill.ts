import "server-only";

import { GRILL_QUESTION_COUNT, type GrillInput, type GrillTurn } from "@synapse/core";
import { badRequest, HttpError, type JsonObject } from "./http";
import { fields } from "./validate";

export const MAX_RESUME_CHARS = 20_000;
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const MAX_ANSWER_CHARS = 6_000;
/** Answering after the last question is allowed, so the report can see every turn. */
const MAX_TURNS = GRILL_QUESTION_COUNT;

function readTurn(raw: unknown, index: number): GrillTurn {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw badRequest(`Invalid request: turns[${index}] must be an object.`);
  const f = fields(raw as JsonObject);
  const turn = {
    question: f.string("question", { max: 600 }),
    target: f.string("target", { max: 400 }),
    answer: f.string("answer", { max: MAX_ANSWER_CHARS }),
  };
  f.done();
  return turn;
}

/** Validates { resume, turns } for /api/grill/next and /api/grill/report. */
export function readGrillSession(body: JsonObject, { requireTurns = false } = {}): GrillInput {
  const f = fields(body);
  const resume = f.string("resume", { min: 80, max: MAX_RESUME_CHARS });
  const rawTurns = f.raw("turns") ?? [];
  if (!Array.isArray(rawTurns)) f.fail("turns", "must be an array");
  else if (rawTurns.length > MAX_TURNS) f.fail("turns", `must have at most ${MAX_TURNS} entries`);
  else if (requireTurns && rawTurns.length === 0) f.fail("turns", "must include at least one answered question");
  f.done();
  return { resume, turns: (rawTurns as unknown[]).map(readTurn) };
}

function tidy(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_RESUME_CHARS);
}

/** Resume file → plain text. PDFs go through unpdf; text files are read as UTF-8. */
export async function extractResumeText(file: File): Promise<{ text: string; pages: number | null }> {
  if (file.size === 0) throw badRequest("That file is empty.");
  if (file.size > MAX_RESUME_BYTES) throw new HttpError(413, "payload_too_large", "Resume must be 5 MB or smaller.");
  const name = file.name.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";

  let text: string;
  let pages: number | null = null;
  if (isPdf) {
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw badRequest("That file is not a valid PDF.");
    try {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(bytes);
      const result = await extractText(pdf, { mergePages: false });
      pages = result.totalPages;
      text = result.text.join("\n\n");
    } catch (error) {
      console.warn("[grill] PDF extraction failed:", error instanceof Error ? error.message : error);
      throw badRequest("Couldn't read that PDF. Try exporting it again, or paste the text instead.");
    }
  } else if (/\.(txt|md|markdown)$/.test(name) || file.type.startsWith("text/")) {
    text = new TextDecoder().decode(bytes);
  } else {
    throw badRequest("Upload a PDF, .txt, or .md file.");
  }

  const clean = tidy(text);
  if (clean.length < 80) {
    throw badRequest(
      isPdf ? "That PDF has almost no selectable text (is it a scanned image?). Paste the text instead." : "That file is too short to be a resume.",
    );
  }
  return { text: clean, pages };
}
