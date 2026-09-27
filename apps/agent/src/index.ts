/**
 * Prepr iMessage agent (Photon spectrum-ts).
 *
 *   npm run dev:agent        iMessage via Photon (needs PHOTON_PROJECT_ID / PHOTON_PROJECT_SECRET)
 *   npm run agent:terminal   local tuichat chat window (no iMessage needed)
 *   npm run agent:simulate   scripted demo without Photon (see simulate.ts)
 */
import path from "node:path";
import { Spectrum, type Message, type Space } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { terminal } from "spectrum-ts/providers/terminal";
import { evaluateAnswer, getConfig, llmStatus, openStore, type SynapseConfig, type SynapseStore } from "@synapse/core";
import { agentPolicyFromConfig, preview, StudyController, type SenderInfo } from "./controller";
import { ownerHello } from "./messages";

const TAG = "[prepr-agent]";

function log(line: string): void {
  console.info(`${TAG} ${line}`);
}

function logError(line: string, error?: unknown): void {
  console.error(`${TAG} ${line}`, ...(error === undefined ? [] : [error]));
}

/** `--terminal` (or SYNAPSE_AGENT_PROVIDER=terminal) chats locally through tuichat instead of iMessage. */
function wantsTerminal(): boolean {
  return process.argv.includes("--terminal") || process.env.SYNAPSE_AGENT_PROVIDER?.trim().toLowerCase() === "terminal";
}

function maskHandle(handle: string): string {
  return handle.length <= 4 ? "****" : `${"*".repeat(Math.max(0, handle.length - 4))}${handle.slice(-4)}`;
}

function describeScale(config: SynapseConfig): string {
  return config.demoScale ? `demo scale (1 SRS day = ${Math.round(config.dayMs / 1000)}s, active hours ignored)` : "real time";
}

/** What the agent needs from a connected Spectrum app, independent of the provider. */
interface Connection {
  messages: AsyncIterable<[Space, Message]>;
  stop(): Promise<void>;
  /** Rebuilds a Space from a persisted id for proactive sends (iMessage only). */
  getSpace?: (spaceId: string) => Promise<Space>;
  /** Opens a DM with a phone number or email (iMessage only). */
  openDm?: (handle: string) => Promise<Space>;
}

const TERMINAL_COMMANDS = [
  { name: "more", description: "Next flashcard" },
  { name: "hint", description: "A nudge for the open card" },
  { name: "idk", description: "Reveal the answer" },
  { name: "skip", description: "Skip the open card" },
  { name: "why", description: "Explain the last card" },
  { name: "stats", description: "Your progress" },
  { name: "help", description: "Everything Prepr can do" },
];

async function connect(config: SynapseConfig, useTerminal: boolean): Promise<Connection> {
  const { projectId, projectSecret } = config.photon;
  if (useTerminal) {
    const providers = [terminal.config({ commands: TERMINAL_COMMANDS })];
    const app =
      projectId && projectSecret ? await Spectrum({ projectId, projectSecret, providers }) : await Spectrum({ providers });
    return { messages: app.messages, stop: () => app.stop() };
  }
  if (!projectId || !projectSecret) throw new MissingPhotonCredentials(config.repoRoot);
  const app = await Spectrum({ projectId, projectSecret, providers: [imessage.config()] });
  const platform = imessage(app);
  return {
    messages: app.messages,
    stop: () => app.stop(),
    getSpace: (spaceId) => platform.space.get(spaceId),
    openDm: (handle) => platform.space.create(handle),
  };
}

class MissingPhotonCredentials extends Error {
  constructor(repoRoot: string) {
    super(
      [
        "Missing Photon credentials: set PHOTON_PROJECT_ID and PHOTON_PROJECT_SECRET",
        `  in ${path.join(repoRoot, ".env")} (see .env.example; get them at https://app.photon.codes).`,
        "  No Photon yet? Try `npm run agent:simulate` (scripted demo) or `npm run agent:terminal` (local chat).",
      ].join("\n"),
    );
    this.name = "MissingPhotonCredentials";
  }
}

/**
 * SYNAPSE_OWNER_HANDLE: DM the owner first and bind that chat to the web user,
 * so pushes start without anyone texting "link 1234".
 */
async function bootstrapOwner(
  connection: Connection,
  store: SynapseStore,
  controller: StudyController<Space>,
  config: SynapseConfig,
): Promise<void> {
  const handle = config.ownerHandle;
  if (!handle || !connection.openDm) return;
  const webUser = store.getUser(config.webUserId);
  if (!webUser || webUser.spaceId) return;
  try {
    const space = await connection.openDm(handle);
    const code = store.createOrGetLinkCode(webUser.id);
    const linked = store.linkByCode(code, { spaceId: space.id, handle, platform: "imessage" }, Date.now());
    if (!linked) return;
    controller.rememberSpace(space);
    await space.send(ownerHello(config.webUrl));
    log(`linked owner ${maskHandle(handle)} → ${linked.id} (space ${space.id})`);
  } catch (error) {
    logError(`could not open a DM with the owner ${maskHandle(handle)}`, error);
  }
}

async function main(): Promise<void> {
  const useTerminal = wantsTerminal();
  const config = getConfig();
  if (!useTerminal && (!config.photon.projectId || !config.photon.projectSecret)) {
    throw new MissingPhotonCredentials(config.repoRoot);
  }
  const store = openStore(config.dbPath, {
    timezone: config.timezone,
    dayMs: config.dayMs,
    morningHour: config.morningHour,
    newPerDay: config.newPerDay,
  });
  store.ensureUser(config.webUserId, Date.now());

  let connection: Connection;
  try {
    connection = await connect(config, useTerminal);
  } catch (error) {
    store.close();
    throw error;
  }

  const controller = new StudyController<Space>({
    store,
    policy: agentPolicyFromConfig(config, useTerminal ? "terminal" : "imessage"),
    evaluate: (input) => evaluateAnswer(input, { timeoutMs: config.llmTimeoutMs }),
    resolveSpace: connection.getSpace ? (spaceId) => connection.getSpace!(spaceId) : undefined,
    log,
  });

  const llm = llmStatus();
  log(
    [
      `listening on ${useTerminal ? "terminal (tuichat)" : "iMessage"}`,
      `db ${path.relative(config.repoRoot, config.dbPath) || config.dbPath}`,
      `grader ${llm.configured ? `${llm.model} (${llm.provider})` : "heuristic (no LLM key)"}`,
      describeScale(config),
      `tz ${config.timezone}`,
      `tick ${Math.round(config.tickMs / 1000)}s`,
    ].join(" · "),
  );

  await bootstrapOwner(connection, store, controller, config);

  let stopping = false;
  let ticking = false;
  const runTick = async () => {
    if (ticking || stopping) return;
    ticking = true;
    try {
      const report = await controller.tick(Date.now());
      for (const result of report.results) {
        if (result.expiredCardId) log(`⌛ expired unanswered ${result.expiredCardId} for ${result.userId}`);
        if (result.action === "sent") log(`⏰ pushed ${result.morning ? "☕ briefing + " : ""}${result.cardId} → ${result.userId}`);
      }
    } catch (error) {
      logError("tick failed", error);
    } finally {
      ticking = false;
    }
  };
  const timer = setInterval(() => void runTick(), config.tickMs);
  const firstTick = setTimeout(() => void runTick(), 3_000);

  const stopTimers = () => {
    clearInterval(timer);
    clearTimeout(firstTick);
  };

  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    log(`${signal} received, shutting down`);
    stopTimers();
    await Promise.race([controller.idle(), new Promise((resolve) => setTimeout(resolve, 5_000))]);
    try {
      await connection.stop();
    } catch (error) {
      logError("error while stopping Spectrum", error);
    }
    store.close();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("unhandledRejection", (error) => logError("unhandled rejection", error));

  for await (const [space, message] of connection.messages) {
    try {
      route(controller, space, message, useTerminal);
    } catch (error) {
      logError("message failed", error);
    }
  }

  if (stopping) return;
  // The Photon stream only ends on disconnect; exit non-zero so a supervisor restarts us.
  logError("message stream ended, exiting for restart");
  stopTimers();
  await Promise.race([controller.idle(), new Promise((resolve) => setTimeout(resolve, 3_000))]);
  store.close();
  process.exit(1);
}

/** Dispatches without awaiting: the controller serializes per chat, so one slow LLM grade never blocks other users. */
function route(controller: StudyController<Space>, space: Space, message: Message, useTerminal: boolean): void {
  if (message.direction === "outbound" || message.sender?.kind === "agent") return;
  const who = message.sender?.id ?? "unknown";
  const sender: SenderInfo = { handle: message.sender?.id ?? null, platform: useTerminal ? "terminal" : "imessage" };
  const content = message.content;

  if (content.type === "text") {
    log(`← ${who}: ${preview(content.text)}`);
    void controller.handleText(space, content.text, sender).catch((error) => logError("text handler failed", error));
    return;
  }
  if (content.type === "reaction") {
    const targetId = content.target?.id;
    log(`← ${who} tapped ${content.emoji} on ${targetId ?? "?"}`);
    void controller
      .handleReaction(space, content.emoji, targetId, sender)
      .catch((error) => logError("reaction handler failed", error));
    return;
  }
  log(`← ${who}: ${content.type} (ignored)`);
}

main().catch((error: unknown) => {
  if (error instanceof MissingPhotonCredentials) {
    logError(error.message);
  } else {
    logError("fatal", error);
  }
  process.exit(1);
});
