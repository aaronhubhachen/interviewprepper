import { preview, type ChatSpace, type SenderInfo, type StudyController } from "./controller";

/**
 * The slice of a spectrum-ts `Message` the agent reads. Structural, so a real
 * `Message` fits and tests can feed synthetic events through the same path:
 *
 *   { id, direction: "inbound", sender: { id, kind }, content: { type: "text", text } }
 *   { ..., content: { type: "reaction", emoji: "❤️" | "love", target: { id } } }
 *
 * Fields are read defensively (`unknown`): inbound events are untrusted input.
 */
export interface InboundMessage {
  readonly id?: string;
  readonly direction?: string;
  readonly sender?: { readonly id?: string; readonly kind?: string } | null;
  readonly content: {
    readonly type: string;
    readonly text?: unknown;
    readonly emoji?: unknown;
    readonly target?: { readonly id?: unknown } | null;
  };
}

export type IgnoredReason = "outbound" | "agent" | "unsupported" | "malformed";

export interface Dispatched {
  handled: "text" | "reaction" | "ignored";
  reason?: IgnoredReason;
  /** Settles when the controller has finished with the message. Never rejects (errors go to `onError`). */
  done: Promise<void>;
}

export interface DispatchOptions {
  /** Recorded on users created from this chat: "imessage" or "terminal". */
  platform: string;
  log?: (line: string) => void;
  onError?: (what: "text" | "reaction", error: unknown) => void;
}

const IGNORED = (reason: IgnoredReason): Dispatched => ({ handled: "ignored", reason, done: Promise.resolve() });

/**
 * Routes one message from `app.messages` to the study controller: skips the
 * agent's own messages, sends text to `handleText` and tapbacks (emoji plus the
 * id of the message that was reacted to) to `handleReaction`.
 *
 * Returns without waiting for the handler: the controller serializes work per
 * chat, so one slow LLM grade never blocks other users. Await `done` in tests.
 */
export function dispatchSpectrumMessage<S extends ChatSpace>(
  controller: StudyController<S>,
  space: S,
  message: InboundMessage,
  options: DispatchOptions,
): Dispatched {
  const log = options.log ?? (() => undefined);
  if (message.direction === "outbound") return IGNORED("outbound");
  if (message.sender?.kind === "agent") return IGNORED("agent");

  const who = message.sender?.id ?? "unknown";
  const sender: SenderInfo = { handle: message.sender?.id ?? null, platform: options.platform };
  const { content } = message;
  const settle = (what: "text" | "reaction", work: Promise<void>) =>
    work.catch((error: unknown) => {
      if (options.onError) options.onError(what, error);
      else log(`${what} handler failed: ${error instanceof Error ? error.message : String(error)}`);
    });

  if (content.type === "text") {
    if (typeof content.text !== "string") return IGNORED("malformed");
    log(`← ${who}: ${preview(content.text)}`);
    return { handled: "text", done: settle("text", controller.handleText(space, content.text, sender)) };
  }

  if (content.type === "reaction") {
    if (typeof content.emoji !== "string") return IGNORED("malformed");
    const rawTarget = content.target?.id;
    const targetId = typeof rawTarget === "string" && rawTarget ? rawTarget : undefined;
    log(`← ${who} tapped ${content.emoji} on ${targetId ?? "?"}`);
    return {
      handled: "reaction",
      done: settle("reaction", controller.handleReaction(space, content.emoji, targetId, sender)),
    };
  }

  log(`← ${who}: ${content.type} (ignored)`);
  return IGNORED("unsupported");
}
