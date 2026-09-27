import { isGroupSpace, preview, type ChatSpace, type SenderInfo, type StudyController } from "./controller";
import { maskHandle, redact } from "./redact";

/**
 * The slice of a spectrum-ts `Message` the agent reads. Structural, so a real
 * `Message` fits and tests can feed synthetic events through the same path:
 *
 *   { id, direction: "inbound", sender: { id, kind }, content: { type: "text", text } }
 *   { ..., content: { type: "reaction", emoji: "❤️" | "love", target: { id } } }
 *   { ..., content: { type: "reply", content: { type: "text", text }, target: { id } } }   (swipe-to-reply)
 *   { ..., content: { type: "group", items: [Message, …] } }                                (text + photo)
 *
 * Fields are read defensively (`unknown`): inbound events are untrusted input.
 */
export interface InboundMessage {
  readonly id?: string;
  readonly direction?: string;
  readonly sender?: { readonly id?: string; readonly kind?: string } | null;
  readonly content: InboundContent;
}

export interface InboundContent {
  readonly type: string;
  readonly text?: unknown;
  readonly emoji?: unknown;
  readonly target?: { readonly id?: unknown } | null;
  /** The wrapped content of a `reply`. */
  readonly content?: unknown;
  /** The messages of a `group` (e.g. a caption sent with a photo). */
  readonly items?: unknown;
}

export type IgnoredReason = "outbound" | "agent" | "group-chat" | "unsupported" | "malformed";

export interface Dispatched {
  handled: "text" | "reaction" | "unsupported" | "ignored";
  reason?: IgnoredReason;
  /** Settles when the controller has finished with the message. Never rejects (errors go to `onError`). */
  done: Promise<void>;
}

export interface DispatchOptions {
  /** Recorded on users created from this chat: "imessage" or "terminal". */
  platform: string;
  log?: (line: string) => void;
  /** Include message text in the log (SYNAPSE_VERBOSE). Off by default: texts are answers and chat content. */
  logText?: boolean;
  onError?: (what: "text" | "reaction" | "unsupported", error: unknown) => void;
}

const IGNORED = (reason: IgnoredReason): Dispatched => ({ handled: "ignored", reason, done: Promise.resolve() });

/** Wrappers around what the user typed: swipe-to-reply, and a bubble sent with an effect ("slam", "gentle"). */
const WRAPPERS = new Set(["reply", "effect"]);

/** Content a person sent that the agent cannot read: it gets a one-line "text only" notice. */
const NON_TEXT = new Set(["attachment", "voice", "contact", "richlink", "app", "poll"]);

/**
 * Unwraps what the user typed: plain text, text sent as a swipe-to-reply
 * (`reply` wrapping `text`) or with an effect, or the text items of a
 * `group` (a caption sent with a photo). Undefined when there is no text.
 */
function textOf(content: InboundContent): string | undefined {
  if (content.type === "text") return typeof content.text === "string" ? content.text : undefined;
  if (WRAPPERS.has(content.type) && isContent(content.content)) return textOf(content.content);
  if (content.type === "group" && Array.isArray(content.items)) {
    const parts = content.items.flatMap((item: unknown) => {
      const inner = isRecord(item) && isContent(item.content) ? item.content : undefined;
      const text = inner?.type === "text" ? textOf(inner) : undefined;
      return text?.trim() ? [text.trim()] : [];
    });
    return parts.length > 0 ? parts.join("\n") : undefined;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isContent(value: unknown): value is InboundContent {
  return isRecord(value) && typeof value.type === "string";
}

/** Only an explicit "outbound" or agent sender is ours; a missing direction (reactions) counts as inbound. */
function isOwnMessage(message: InboundMessage): IgnoredReason | undefined {
  if (message.direction === "outbound") return "outbound";
  if (message.sender?.kind === "agent") return "agent";
  return undefined;
}

/**
 * Routes one message from `app.messages` to the study controller: skips the
 * agent's own messages and every group chat, sends text (including
 * swipe-to-reply answers and photo captions) to `handleText`, tapbacks (emoji
 * plus the id of the message that was reacted to) to `handleReaction`, and
 * voice memos / photos / files to `handleUnsupported`.
 *
 * Returns without waiting for the handler: the controller serializes work per
 * chat, so one slow LLM grade never blocks other users. Await `done` in tests.
 * Log lines are redacted (numbers and emails masked), and message text is only logged with `logText`.
 */
export function dispatchSpectrumMessage<S extends ChatSpace>(
  controller: StudyController<S>,
  space: S,
  message: InboundMessage,
  options: DispatchOptions,
): Dispatched {
  const sink = options.log;
  const log = (line: string) => sink?.(redact(line));
  const own = isOwnMessage(message);
  if (own) return IGNORED(own);
  // Any member of a group could otherwise answer, rate or pause a linked user's cards.
  if (isGroupSpace(space)) return IGNORED("group-chat");

  const handle = typeof message.sender?.id === "string" && message.sender.id ? message.sender.id : null;
  const who = handle ? maskHandle(handle) : "unknown";
  const sender: SenderInfo = { handle, platform: options.platform };
  const { content } = message;
  if (!isContent(content)) return IGNORED("malformed");
  const settle = (what: "text" | "reaction" | "unsupported", work: Promise<void>) =>
    work.catch((error: unknown) => {
      if (options.onError) options.onError(what, error);
      else log(`${what} handler failed: ${error instanceof Error ? error.message : String(error)}`);
    });

  const reaction = content.type === "reply" && isContent(content.content) && content.content.type === "reaction" ? content.content : content;
  if (reaction.type === "reaction") {
    if (typeof reaction.emoji !== "string") return IGNORED("malformed");
    const rawTarget = reaction.target?.id;
    const targetId = typeof rawTarget === "string" && rawTarget ? rawTarget : undefined;
    log(`← ${who} tapped ${reaction.emoji} on ${targetId ?? "?"}`);
    return {
      handled: "reaction",
      done: settle("reaction", controller.handleReaction(space, reaction.emoji, targetId, sender)),
    };
  }

  if (content.type === "text" && typeof content.text !== "string") return IGNORED("malformed");
  const text = textOf(content);
  if (text !== undefined) {
    const shown = options.logText ? `: ${preview(text)}` : ` (${text.length} chars${content.type === "text" ? "" : `, ${content.type}`})`;
    log(`← ${who}${shown}`);
    return { handled: "text", done: settle("text", controller.handleText(space, text, sender)) };
  }

  const inner = WRAPPERS.has(content.type) && isContent(content.content) ? content.content.type : content.type;
  if (NON_TEXT.has(inner) || content.type === "group") {
    log(`← ${who}: ${inner} (text only notice)`);
    return { handled: "unsupported", done: settle("unsupported", controller.handleUnsupported(space)) };
  }

  log(`← ${who}: ${content.type} (ignored)`);
  return IGNORED("unsupported");
}
