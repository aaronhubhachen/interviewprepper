/**
 * Synapse iMessage agent (Photon spectrum-ts).
 *
 *   npm run dev:agent        iMessage via Photon (needs PHOTON_PROJECT_ID / PHOTON_PROJECT_SECRET)
 *   npm run agent:terminal   local tuichat chat window (no iMessage needed)
 *   npm run agent:simulate   scripted demo without Photon (see simulate.ts)
 */
import path from "node:path";
import { Spectrum, type Message, type Space } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { terminal } from "spectrum-ts/providers/terminal";
import {
  evaluateAnswer,
  getConfig,
  llmStatus,
  normalizeHandle,
  openStore,
  type StorePolicy,
  type SynapseConfig,
} from "@synapse/core";
import { TERMINAL_COMMANDS } from "./commands";
import { agentPolicyFromConfig, StudyController, type SpaceHints } from "./controller";
import { dispatchSpectrumMessage, type DispatchOptions } from "./dispatch";
import { maskHandle, redact } from "./redact";

const TAG = "[synapse-agent]";

/** Every console line is redacted: DM space ids and handles embed phone numbers, and the console gets screen-shared. */
function log(line: string): void {
  console.info(`${TAG} ${redact(line)}`);
}

function logError(line: string, error?: unknown): void {
  const detail = error === undefined ? "" : `\n${redact(error instanceof Error ? (error.stack ?? error.message) : String(error))}`;
  console.error(`${TAG} ${redact(line)}${detail}`);
}

/** SYNAPSE_VERBOSE=1 also logs message text (answers are otherwise logged as a length only). */
function wantsVerbose(): boolean {
  return ["1", "true", "yes"].includes(process.env.SYNAPSE_VERBOSE?.trim().toLowerCase() ?? "");
}

/**
 * SYNAPSE_AGENT_HANDLE as an E.164 line for `space.create`, so the owner's DM
 * comes from the Synapse number even when the project has several lines.
 */
function agentLine(): string | undefined {
  const raw = process.env.SYNAPSE_AGENT_HANDLE?.trim();
  if (!raw || raw.includes("@")) return undefined;
  const line = normalizeHandle(raw);
  return /^\+\d{7,15}$/.test(line) ? line : undefined;
}

/** `--terminal` (or SYNAPSE_AGENT_PROVIDER=terminal) chats locally through tuichat instead of iMessage. */
function wantsTerminal(): boolean {
  return process.argv.includes("--terminal") || process.env.SYNAPSE_AGENT_PROVIDER?.trim().toLowerCase() === "terminal";
}

function describeScale(config: SynapseConfig): string {
  return config.demoScale ? `demo scale (1 SRS day = ${Math.round(config.dayMs / 1000)}s, active hours ignored)` : "real time";
}

/** What the agent needs from a connected Spectrum app, independent of the provider. */
interface Connection {
  messages: AsyncIterable<[Space, Message]>;
  stop(): Promise<void>;
  /** Rebuilds a Space from a persisted id (and the line it was on) for proactive sends (iMessage only). */
  getSpace?: (spaceId: string, hints: SpaceHints) => Promise<Space>;
  /** Opens a DM with a phone number or email (iMessage only). */
  openDm?: (handle: string) => Promise<Space>;
}

async function connect(config: SynapseConfig, useTerminal: boolean): Promise<Connection> {
  const { projectId, projectSecret } = config.photon;
  if (useTerminal) {
    // tuichat's config schema requires "/"-prefixed command names (see commands.ts).
    const providers = [terminal.config({ commands: TERMINAL_COMMANDS.map((command) => ({ ...command })) })];
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
    // With several dedicated lines, space.get needs the line the chat is on.
    getSpace: (spaceId, hints) => platform.space.get(spaceId, hints.phone ? { phone: hints.phone } : {}),
    openDm: async (handle) => {
      const line = agentLine();
      if (!line) return platform.space.create(handle);
      try {
        return await platform.space.create(handle, { phone: line });
      } catch (error) {
        logError(`could not open the DM from SYNAPSE_AGENT_HANDLE ${maskHandle(line)}, trying any line`, error);
        return platform.space.create(handle);
      }
    },
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
 * so pushes start without anyone texting "link 1234". The controller says
 * hello and delivers the first card under the chat's lock, so the first tick
 * cannot race it.
 */
async function bootstrapOwner(connection: Connection, controller: StudyController<Space>, config: SynapseConfig): Promise<void> {
  const handle = config.ownerHandle;
  if (!handle || !connection.openDm) return;
  const webUser = controller.store.getUser(config.webUserId);
  if (!webUser || webUser.spaceId) return;
  try {
    const space = await connection.openDm(handle);
    await controller.linkOwner(space, handle);
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
  // ownerHandle / activeHours are optional store policy fields (owner-only code-free linking, drills moved out of
  // quiet hours). Passed through a variable so this also compiles against a core without them.
  const policy: Partial<StorePolicy> & Record<string, unknown> = {
    timezone: config.timezone,
    dayMs: config.dayMs,
    morningHour: config.morningHour,
    newPerDay: config.newPerDay,
    ownerHandle: config.ownerHandle ?? null,
    activeHours: config.activeHours,
  };
  const store = openStore(config.dbPath, policy);
  store.ensureUser(config.webUserId, Date.now());

  let connection: Connection;
  try {
    connection = await connect(config, useTerminal);
  } catch (error) {
    store.close();
    throw error;
  }

  const verbose = wantsVerbose();
  const controller = new StudyController<Space>({
    store,
    policy: agentPolicyFromConfig(config, useTerminal ? "terminal" : "imessage"),
    evaluate: (input) => evaluateAnswer(input, { timeoutMs: config.llmTimeoutMs }),
    resolveSpace: connection.getSpace ? (spaceId, _user, hints) => connection.getSpace!(spaceId, hints) : undefined,
    log,
    logText: verbose,
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

  await bootstrapOwner(connection, controller, config);

  let stopping = false;
  let ticking = false;
  const runTick = async () => {
    if (ticking || stopping) return;
    ticking = true;
    try {
      const report = await controller.tick(Date.now());
      for (const result of report.results) {
        if (result.expiredCardId) log(`⌛ expired unanswered ${result.expiredCardId} for ${result.userId}`);
        if (result.gradedCardId) log(`⌛ logged unrated ${result.gradedCardId} for ${result.userId} with my grade`);
        if (result.preemptedCardId) log(`🎯 set aside ${result.preemptedCardId} for ${result.userId}: a drill is due`);
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

  const dispatchOptions: DispatchOptions = {
    platform: useTerminal ? "terminal" : "imessage",
    log,
    logText: verbose,
    onError: (what, error) => logError(`${what} handler failed`, error),
  };
  for await (const [space, message] of connection.messages) {
    try {
      dispatchSpectrumMessage(controller, space, message, dispatchOptions);
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

main().catch((error: unknown) => {
  if (error instanceof MissingPhotonCredentials) {
    logError(error.message);
  } else {
    logError("fatal", error);
  }
  process.exit(1);
});
