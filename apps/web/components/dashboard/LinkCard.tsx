"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChatBubble } from "@/components/ui/ChatBubble";
import { Pill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { errorMessage, fetchLink, isAbort, setAgentPaused, unlinkAgent } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { LinkResponse, StatsResponse } from "@/lib/types";
import { useVisiblePolling } from "./hooks";

/** While unlinked, check often so the card flips the moment the text lands (and an expired code is replaced). */
const UNLINKED_POLL_MS = 4000;
/** Digits in a link code (core's LINK_CODE_LENGTH), for the loading skeleton. */
const CODE_LENGTH = 6;

export interface LinkCardProps {
  /** Link status from /api/stats (first paint, before /api/link answers). */
  initial: StatsResponse["link"];
  /** Called once the dashboard should refresh (just linked, paused/resumed). */
  onChange?: () => void;
  className?: string;
}

function fromStats(link: StatsResponse["link"]): LinkResponse {
  return {
    linked: link.linked,
    handle: link.handle,
    platform: link.platform,
    code: link.linkCode,
    paused: link.paused,
    agentHandle: null,
    instructions: "",
  };
}

function smsHref(handle: string, code: string): string {
  return `sms:${encodeURIComponent(handle)}?&body=${encodeURIComponent(`link ${code}`)}`;
}

export function LinkCard({ initial, onChange, className }: LinkCardProps) {
  const { toast } = useToast();
  const [link, setLink] = useState<LinkResponse>(() => fromStats(initial));
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingUnlink, setConfirmingUnlink] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const wasLinked = useRef(initial.linked);
  const controller = useRef<AbortController | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const refresh = useCallback(() => {
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    fetchLink({ signal: next.signal })
      .then((response) => {
        setLink(response);
        setLoaded(true);
        if (response.linked && !wasLinked.current) {
          toast({
            tone: "success",
            icon: "📱",
            title: "iMessage linked",
            description: `Prepr will text ${response.handle ?? "you"} when cards are due.`,
          });
          onChangeRef.current?.();
        }
        wasLinked.current = response.linked;
      })
      .catch((error: unknown) => {
        if (!isAbort(error)) setLoaded(true); // keep the stats snapshot
      });
  }, [toast]);

  useEffect(() => {
    refresh();
    return () => controller.current?.abort();
  }, [refresh]);

  // Dashboard polling may notice a change made elsewhere first (linked, or
  // paused/resumed over iMessage): re-sync when its snapshot disagrees.
  const linkRef = useRef(link);
  useEffect(() => {
    linkRef.current = link;
  }, [link]);
  useEffect(() => {
    if (initial.linked !== linkRef.current.linked || initial.paused !== linkRef.current.paused) refresh();
  }, [initial.linked, initial.paused, refresh]);

  useVisiblePolling(refresh, link.linked ? null : UNLINKED_POLL_MS);

  const togglePaused = async () => {
    setSaving(true);
    try {
      const response = await setAgentPaused(!link.paused);
      setLink(response);
      toast({
        tone: response.paused ? "info" : "success",
        icon: response.paused ? "⏸️" : "▶️",
        title: response.paused ? "Texts paused" : "Texts resumed",
        description: response.paused ? "Prepr won't text you until you resume." : "Prepr will text you when cards are due.",
      });
      onChangeRef.current?.();
    } catch (error) {
      toast({ tone: "danger", title: "Couldn't update", description: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  /** Unlink (while linked) or replace the code (while unlinked); the response carries the fresh code. */
  const unlink = async () => {
    const wasLinkedNow = link.linked;
    setUnlinking(true);
    try {
      const response = await unlinkAgent();
      wasLinked.current = response.linked;
      setLink(response);
      setConfirmingUnlink(false);
      toast(
        wasLinkedNow
          ? { tone: "info", icon: "🔌", title: "iMessage unlinked", description: "That chat gets no more cards. Text the new code from your own phone." }
          : { tone: "success", icon: "🔄", title: "New code", description: "The old code no longer works." },
      );
      if (wasLinkedNow) onChangeRef.current?.();
    } catch (error) {
      toast({ tone: "danger", title: wasLinkedNow ? "Couldn't unlink" : "Couldn't get a new code", description: errorMessage(error) });
    } finally {
      setUnlinking(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(`link ${code}`);
      toast({ tone: "success", icon: "📋", title: "Copied", description: `Paste “link ${code}” into Messages.` });
    } catch {
      toast({ tone: "warning", title: "Couldn't copy", description: `Type “link ${code}” in Messages instead.` });
    }
  };

  const status = link.linked ? (
    link.paused ? (
      <Pill tone="warning" icon="⏸️">
        Paused
      </Pill>
    ) : (
      <Pill tone="success" icon="✓">
        Linked
      </Pill>
    )
  ) : (
    <Pill tone="neutral" icon="○">
      Not linked
    </Pill>
  );

  return (
    <Card glow={!link.linked} className={cn("flex flex-col", className)} aria-labelledby="link-title">
      <CardHeader eyebrow="Ambient mode" title={<span id="link-title">iMessage link</span>} actions={status} />

      {link.linked ? (
        <div className="flex flex-1 flex-col">
          <p className="text-sm text-fg-muted">
            {link.paused
              ? "Proactive texts are paused. Your schedule keeps running, so due cards will be waiting."
              : `Prepr texts ${link.handle ?? "you"} micro-cards at their due times. Answer in plain text, then rate with a tapback.`}
          </p>
          <ol className="mt-4 space-y-2 text-sm">
            {[
              ["📲", "A micro-card arrives when it's due"],
              ["✍️", "Reply with your answer for Socratic feedback"],
              ["❤️", "Tapback ❤️ 👍 👎 to schedule the next rep"],
            ].map(([icon, text]) => (
              <li key={text} className="flex items-center gap-2.5 text-fg-muted">
                <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-800 text-sm">
                  {icon}
                </span>
                {text}
              </li>
            ))}
          </ol>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-line bg-ink-800/60 px-3 py-2">
              <dt className="text-xs text-fg-subtle">Handle</dt>
              <dd className="truncate font-medium text-fg">{link.handle ?? "Linked space"}</dd>
            </div>
            <div className="rounded-xl border border-line bg-ink-800/60 px-3 py-2">
              <dt className="text-xs text-fg-subtle">Texts</dt>
              <dd className="font-medium text-fg">{link.paused ? "Paused" : "Active"}</dd>
            </div>
          </dl>
          <div className="mt-auto space-y-2 pt-4">
            <Button
              variant="secondary"
              fullWidth
              loading={saving}
              loadingLabel="Saving…"
              onClick={togglePaused}
              leftIcon={<span aria-hidden="true">{link.paused ? "▶️" : "⏸️"}</span>}
            >
              {link.paused ? "Resume texts" : "Pause texts"}
            </Button>
            {confirmingUnlink ? (
              <div role="group" aria-labelledby="unlink-confirm" className="rounded-xl border border-danger/40 bg-danger/10 p-3">
                <p id="unlink-confirm" className="text-sm text-fg">
                  Unlink {link.handle ?? "this chat"}? It stops getting cards, and the dashboard shows a new code.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button variant="danger" size="sm" loading={unlinking} loadingLabel="Unlinking…" onClick={unlink}>
                    Unlink
                  </Button>
                  <Button variant="ghost" size="sm" disabled={unlinking} onClick={() => setConfirmingUnlink(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" size="sm" fullWidth onClick={() => setConfirmingUnlink(true)} leftIcon={<span aria-hidden="true">🔌</span>}>
                Wrong chat? Unlink
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <p className="text-sm text-fg-muted">
            Text this code to{" "}
            {link.agentHandle ? <span className="font-medium text-fg">{link.agentHandle}</span> : "your Prepr number"}:
          </p>

          {link.code ? (
            <>
              <p className="sr-only">Link code {link.code.split("").join(" ")}</p>
              <div aria-hidden="true" className="mt-4 flex justify-center gap-1.5 sm:gap-2">
                {link.code.split("").map((digit, index) => (
                  <span
                    key={`${index}-${digit}`}
                    className="grid h-12 w-9 place-items-center rounded-xl border border-synapse/40 bg-ink-800 font-mono text-2xl font-semibold text-fg shadow-glow sm:h-14 sm:w-11 sm:text-3xl"
                  >
                    {digit}
                  </span>
                ))}
              </div>
              <div className="mt-4" aria-hidden="true">
                <ChatBubble from="you" meta="iMessage">
                  link {link.code}
                </ChatBubble>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyCode(link.code!)}
                  leftIcon={<span aria-hidden="true">📋</span>}
                >
                  Copy “link {link.code}”
                </Button>
                {link.agentHandle ? (
                  <a
                    href={smsHref(link.agentHandle, link.code)}
                    className="inline-flex h-8 items-center gap-2 rounded-xl border border-line-strong px-3 text-sm font-semibold text-fg transition-colors hover:border-synapse hover:text-synapse-soft"
                  >
                    <span aria-hidden="true">💬</span> Open Messages
                  </a>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  loading={unlinking}
                  loadingLabel="Replacing…"
                  onClick={unlink}
                  leftIcon={<span aria-hidden="true">🔄</span>}
                >
                  New code
                </Button>
              </div>
              <p className="mt-2 text-xs text-fg-subtle">Expires in 10 minutes.</p>
            </>
          ) : (
            <div className="mt-4 flex justify-center gap-1.5 sm:gap-2">
              {Array.from({ length: CODE_LENGTH }, (_, index) => (
                <Skeleton key={index} className="h-12 w-9 rounded-xl sm:h-14 sm:w-11" />
              ))}
            </div>
          )}

          <p className="mt-auto flex items-center gap-2 pt-4 text-xs text-fg-subtle" role="status">
            <span aria-hidden="true" className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-axon opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-axon" />
            </span>
            {loaded ? "Waiting for your text…" : "Checking link status…"}
          </p>
        </div>
      )}
    </Card>
  );
}
