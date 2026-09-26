"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChatBubble } from "@/components/ui/ChatBubble";
import { Pill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { errorMessage, fetchLink, setAgentPaused } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { LinkResponse, StatsResponse } from "@/lib/types";
import { isAbort } from "./api";
import { useVisiblePolling } from "./hooks";

/** While unlinked, check often so the card flips the moment the text lands. */
const UNLINKED_POLL_MS = 4000;

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
            description: `Synapse will text ${response.handle ?? "you"} when cards are due.`,
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
        description: response.paused ? "Synapse won't text you until you resume." : "Synapse will text you when cards are due.",
      });
      onChangeRef.current?.();
    } catch (error) {
      toast({ tone: "danger", title: "Couldn't update", description: errorMessage(error) });
    } finally {
      setSaving(false);
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
              : `Synapse texts ${link.handle ?? "you"} micro-cards at their due times. Answer in plain text, then rate with a tapback.`}
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
          <div className="mt-auto pt-4">
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
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <p className="text-sm text-fg-muted">
            Get micro-cards texted to you at their due times. Text this code to{" "}
            {link.agentHandle ? <span className="font-medium text-fg">{link.agentHandle}</span> : "your Synapse number"}:
          </p>

          {link.code ? (
            <>
              <p className="sr-only">Link code {link.code.split("").join(" ")}</p>
              <div aria-hidden="true" className="mt-4 flex justify-center gap-2 sm:gap-2.5">
                {link.code.split("").map((digit, index) => (
                  <span
                    key={`${index}-${digit}`}
                    className="grid h-14 w-12 place-items-center rounded-xl border border-synapse/40 bg-ink-800 font-mono text-3xl font-semibold text-fg shadow-glow"
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
              </div>
            </>
          ) : (
            <div className="mt-4 flex justify-center gap-2.5">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-14 w-12 rounded-xl" />
              ))}
            </div>
          )}

          <p className="mt-auto flex items-center gap-2 pt-4 text-xs text-fg-subtle" role="status">
            <span aria-hidden="true" className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-axon opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-axon" />
            </span>
            {loaded ? "Waiting for your text… this card updates by itself." : "Checking link status…"}
          </p>
          <p className="mt-1 text-xs text-fg-subtle">Only one person on this Synapse? Texting “start” links too.</p>
        </div>
      )}
    </Card>
  );
}
