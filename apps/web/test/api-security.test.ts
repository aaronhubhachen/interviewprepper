import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { allCards, listBehavioral, listProblems, openStore, zonedTimeToEpoch, type SynapseStore } from "@synapse/core";
import { GET as linkGET, POST as linkPOST } from "@/app/api/link/route";
import { POST as attemptPOST } from "@/app/api/practice/attempt/route";
import { POST as reviewEvaluatePOST } from "@/app/api/review/evaluate/route";
import { POST as gradePOST } from "@/app/api/review/grade/route";
import { POST as sparEvaluatePOST } from "@/app/api/spar/evaluate/route";
import { GET as sessionsGET } from "@/app/api/spar/sessions/route";
import { GET as statsGET } from "@/app/api/stats/route";
import { maskHandle } from "@/lib/server/account";
import { readJson } from "@/lib/server/http";
import {
  LlmBudget,
  setLlmBudgetForTests,
  setSparSaveBudgetForTests,
  TokenBucket,
  withLlmBudget,
} from "@/lib/server/llm-budget";
import { setClockForTests, setStoreForTests, setUserForTests, setWebUrlForTests } from "@/lib/server/store";
import type { ApiErrorBody, LinkResponse, ReviewEvaluateResponse, SparEvaluateResponse } from "@/lib/types";

const CHI = "America/Chicago";
const T0 = zonedTimeToEpoch(CHI, 2026, 9, 26, 15);
const NO_CTX = {} as never;

let store: SynapseStore;
let clock = T0;

beforeEach(() => {
  store = openStore(":memory:", { timezone: CHI, dayMs: 86_400_000, morningHour: 9, newPerDay: 3 });
  clock = T0;
  setStoreForTests(store);
  setClockForTests(() => clock);
  setUserForTests("me");
  setWebUrlForTests(null);
  setLlmBudgetForTests(undefined);
  setSparSaveBudgetForTests(undefined);
});

afterEach(() => {
  store.close();
});

afterAll(() => {
  setStoreForTests(undefined);
  setClockForTests(undefined);
  setUserForTests(undefined);
  setWebUrlForTests(undefined);
  setLlmBudgetForTests(undefined);
  setSparSaveBudgetForTests(undefined);
});

const BASE = "http://localhost:3000";

function request(path: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}): Request {
  return new Request(`${BASE}${path}`, { method: init.method ?? "GET", headers: init.headers, body: init.body });
}

const jsonPost = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  request(path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });

async function errorOf(response: Response, status: number): Promise<ApiErrorBody["error"]> {
  const payload = (await response.json()) as ApiErrorBody;
  expect(response.status).toBe(status);
  return payload.error;
}

describe("Host allowlist (DNS rebinding)", () => {
  it("answers loopback hosts and refuses any other Host", async () => {
    for (const host of ["localhost:3000", "127.0.0.1:3000", "[::1]:3000", "LOCALHOST"]) {
      const response = await linkGET(request("/api/link", { headers: { Host: host } }), NO_CTX);
      expect(response.status, host).toBe(200);
    }
    for (const host of ["attacker.example:3000", "192.168.1.20:3000", "0.0.0.0:3000", "localhost.attacker.example"]) {
      const error = await errorOf(await statsGET(request("/api/stats", { headers: { Host: host } }), NO_CTX), 403);
      expect(error.code, host).toBe("forbidden_host");
    }
    // The rebinding page never sees the link code.
    const blocked = await linkGET(request("/api/link", { headers: { Host: "attacker.example:3000" } }), NO_CTX);
    expect(await blocked.text()).not.toMatch(/"code":"\d{4}"/);
  });

  it("also answers the host of SYNAPSE_WEB_URL (opt-in LAN or tunnel access)", async () => {
    setWebUrlForTests("http://synapse.lan:3000");
    const response = await linkGET(request("/api/link", { headers: { Host: "synapse.lan:3000" } }), NO_CTX);
    expect(response.status).toBe(200);
    await errorOf(await linkGET(request("/api/link", { headers: { Host: "other.lan:3000" } }), NO_CTX), 403);
  });
});

describe("linked identity", () => {
  it("masks phone numbers and emails and never returns the space id", async () => {
    expect(maskHandle("+1 (555) 123-4567")).toBe("•••4567");
    expect(maskHandle("ada@example.com")).toBe("a•••@example.com");
    expect(maskHandle("12")).toBe("•••");
    expect(maskHandle(null)).toBeNull();

    const code = store.createOrGetLinkCode(store.ensureUser("me", T0).id);
    store.linkByCode(code, { spaceId: "iMessage;-;ada@example.com", handle: "ada@example.com", platform: "imessage" }, T0);
    const stats = await (await statsGET(request("/api/stats"), NO_CTX)).text();
    const link = await (await linkGET(request("/api/link"), NO_CTX)).text();
    for (const payload of [stats, link]) {
      expect(payload).not.toContain("ada@example.com");
      expect(payload).toContain("a•••@example.com");
    }
  });
});

describe("cross-site requests (CSRF)", () => {
  it("refuses text/plain and form bodies with 415 before touching state", async () => {
    const card = allCards()[0]!;
    const problem = listProblems()[0]!;
    const simple = { "Content-Type": "text/plain;charset=UTF-8" };

    const pause = await linkPOST(request("/api/link", { method: "POST", headers: simple, body: '{"paused":true}' }), NO_CTX);
    expect((await errorOf(pause, 415)).code).toBe("unsupported_media_type");
    const form = await linkPOST(
      request("/api/link", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: '{"paused":true,"x":"="}',
      }),
      NO_CTX,
    );
    await errorOf(form, 415);
    const grade = await gradePOST(
      request("/api/review/grade", { method: "POST", headers: simple, body: JSON.stringify({ cardId: card.id, grade: 1 }) }),
      NO_CTX,
    );
    await errorOf(grade, 415);
    const attempt = await attemptPOST(
      request("/api/practice/attempt", {
        method: "POST",
        headers: simple,
        body: JSON.stringify({ problemId: problem.id, stage: "code" }),
      }),
      NO_CTX,
    );
    await errorOf(attempt, 415);
    const noType = await linkPOST(request("/api/link", { method: "POST", body: '{"paused":true}' }), NO_CTX);
    await errorOf(noType, 415);

    expect(store.getUser("me")?.paused ?? false).toBe(false);
    expect(store.listProgress("me")).toHaveLength(0);
    expect(store.listIdeAttempts("me", undefined, 10)).toHaveLength(0);
  });

  it("refuses requests another site sent, even as application/json", async () => {
    const cases: Record<string, string>[] = [
      { Origin: "https://attacker.example" },
      { Origin: "null" },
      { Origin: "http://localhost:3001" },
      { "Sec-Fetch-Site": "cross-site" },
      { "Sec-Fetch-Site": "same-site" },
    ];
    for (const headers of cases) {
      const response = await linkPOST(jsonPost("/api/link", { paused: true }, { Host: "localhost:3000", ...headers }), NO_CTX);
      expect((await errorOf(response, 403)).code, JSON.stringify(headers)).toBe("cross_site");
    }
    const read = await statsGET(request("/api/stats", { headers: { "Sec-Fetch-Site": "cross-site" } }), NO_CTX);
    await errorOf(read, 403);
    expect(store.getUser("me")?.paused ?? false).toBe(false);
  });

  it("accepts the app's own same-origin requests", async () => {
    const own = { Host: "localhost:3000", Origin: "http://localhost:3000", "Sec-Fetch-Site": "same-origin" };
    const response = await linkPOST(jsonPost("/api/link", { paused: true }, own), NO_CTX);
    expect(response.status).toBe(200);
    expect(((await response.json()) as LinkResponse).paused).toBe(true);
    const typed = await statsGET(request("/api/stats", { headers: { Host: "localhost:3000", "Sec-Fetch-Site": "none" } }), NO_CTX);
    expect(typed.status).toBe(200);
    const charset = await linkPOST(
      jsonPost("/api/link", { paused: false }, { "Content-Type": "application/json; charset=utf-8" }),
      NO_CTX,
    );
    expect(charset.status).toBe(200);
  });

  it("accepts the SYNAPSE_WEB_URL origin behind a host-rewriting tunnel", async () => {
    setWebUrlForTests("https://synapse.example.dev");
    const response = await linkPOST(
      jsonPost("/api/link", { paused: true }, { Host: "localhost:3000", Origin: "https://synapse.example.dev" }),
      NO_CTX,
    );
    expect(response.status).toBe(200);
  });
});

describe("readJson body limits", () => {
  it("stops reading a chunked body as soon as it passes the limit", async () => {
    let pulled = 0;
    let cancelled = false;
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;
        controller.enqueue(new TextEncoder().encode(`{"pad":"${"x".repeat(1000)}`));
      },
      cancel() {
        cancelled = true;
      },
    });
    const chunked = new Request(`${BASE}/api/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: endless,
      duplex: "half",
    } as RequestInit);
    expect(chunked.headers.get("content-length")).toBeNull();
    await expect(readJson(chunked, 10_000)).rejects.toMatchObject({ status: 413, code: "payload_too_large" });
    expect(cancelled).toBe(true);
    expect(pulled).toBeLessThan(20);
  });

  it("counts bytes, not characters, and rejects a malformed Content-Length", async () => {
    const wide = JSON.stringify({ note: "é".repeat(40) }); // 40 chars of payload, 80 bytes
    const make = (headers: Record<string, string> = {}) =>
      new Request(`${BASE}/x`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: wide });
    await expect(readJson(make(), wide.length + 10)).rejects.toMatchObject({ status: 413 });
    await expect(readJson(make(), 200)).resolves.toEqual({ note: "é".repeat(40) });
    await expect(readJson(make({ "Content-Length": "12abc" }), 200)).rejects.toMatchObject({ status: 400 });
  });

  it("route handlers turn an oversized chunked body into a JSON 413", async () => {
    const big = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(16_384).fill(0x20));
      },
    });
    const response = await linkPOST(
      new Request(`${BASE}/api/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: big,
        duplex: "half",
      } as RequestInit),
      NO_CTX,
    );
    expect((await errorOf(response, 413)).code).toBe("payload_too_large");
  });
});

describe("LLM budget", () => {
  it("token bucket allows a burst, then refills per minute", () => {
    const bucket = new TokenBucket(2, 6);
    expect([bucket.take(T0), bucket.take(T0), bucket.take(T0)]).toEqual([true, true, false]);
    expect(bucket.take(T0 + 5_000)).toBe(false); // half a token
    expect(bucket.take(T0 + 10_000)).toBe(true); // 6/min = one token per 10 s
    expect(bucket.take(T0 - 60_000)).toBe(false); // a clock going backwards refills nothing
  });

  it("falls back to the heuristic past the rate or the in-flight cap", async () => {
    setLlmBudgetForTests(new LlmBudget({ burst: 3, perMinute: 1, maxInFlight: 1 }));
    let finish: () => void = () => undefined;
    const slow = withLlmBudget(T0, (useLlm) => new Promise<boolean>((resolve) => (finish = () => resolve(useLlm))));
    // One call in flight: the next one runs without the model.
    expect(await withLlmBudget(T0, async (useLlm) => useLlm)).toBe(false);
    finish();
    expect(await slow).toBe(true);
    expect(await withLlmBudget(T0, async (useLlm) => useLlm)).toBe(true);
    expect(await withLlmBudget(T0, async (useLlm) => useLlm)).toBe(true);
    // Burst of 3 spent (the in-flight refusal cost nothing).
    expect(await withLlmBudget(T0, async (useLlm) => useLlm)).toBe(false);
    // A throwing call still releases its slot.
    setLlmBudgetForTests(new LlmBudget({ burst: 5, perMinute: 1, maxInFlight: 1 }));
    await expect(withLlmBudget(T0, async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    expect(await withLlmBudget(T0, async (useLlm) => useLlm)).toBe(true);
  });

  it("an exhausted budget still grades answers (heuristic)", async () => {
    setLlmBudgetForTests(new LlmBudget({ burst: 0, perMinute: 0, maxInFlight: 0 }));
    const card = allCards()[0]!;
    const response = await reviewEvaluatePOST(jsonPost("/api/review/evaluate", { cardId: card.id, answer: card.answerKey }), NO_CTX);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as ReviewEvaluateResponse;
    expect(payload.evaluation).toMatchObject({ verdict: "correct", source: "heuristic" });
  });

  it("caps how fast spar sessions are saved", async () => {
    setSparSaveBudgetForTests(new TokenBucket(1, 1));
    const questionId = listBehavioral()[0]!.id;
    const transcript =
      "I owned the checkout latency fix. I profiled the endpoint, found an N plus one query, added batching and a cache, " +
      "and p99 latency fell from 2 seconds to 300 milliseconds.";
    const first = await sparEvaluatePOST(jsonPost("/api/spar/evaluate", { questionId, transcript, durationMs: 30_000 }), NO_CTX);
    expect(first.status).toBe(200);
    expect(((await first.json()) as SparEvaluateResponse).sessionId).toBeGreaterThan(0);
    const second = await sparEvaluatePOST(jsonPost("/api/spar/evaluate", { questionId, transcript, durationMs: 30_000 }), NO_CTX);
    expect((await errorOf(second, 429)).code).toBe("rate_limited");
    const sessions = (await (await sessionsGET(request("/api/spar/sessions"), NO_CTX)).json()) as { sessions: unknown[] };
    expect(sessions.sessions).toHaveLength(1);
    clock += 60_000;
    const later = await sparEvaluatePOST(jsonPost("/api/spar/evaluate", { questionId, transcript, durationMs: 30_000 }), NO_CTX);
    expect(later.status).toBe(200);
  });
});
