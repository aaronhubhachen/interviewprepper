"use client";

import { useRouter } from "next/navigation";
import { useId } from "react";
import { TAG_IDS, tagLabel, type Tag } from "@synapse/core/tags";
import { TAPBACK_EMOJI } from "@synapse/core/tapback";
import { Card, CardHeader } from "@/components/ui/Card";
import { Kbd } from "@/components/ui/Kbd";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatPercent, plural } from "@/lib/format";
import type { QueueCounts } from "@/lib/types";
import type { Turn } from "./session";

export interface SessionSidebarProps {
  tag?: Tag;
  tally: { love: number; like: number; dislike: number };
  queue: QueueCounts | null;
  current: Turn | undefined;
  mode: "due" | "bonus";
  /** Patterns offered in the picker (tags that have cards; computed on the server). */
  tagOptions?: readonly Tag[];
}

export function SessionSidebar({ tag, tally, queue, current, mode, tagOptions = TAG_IDS }: SessionSidebarProps) {
  const router = useRouter();
  const selectId = useId();
  const reviewed = tally.love + tally.like + tally.dislike;
  const recalled = tally.love + tally.like;

  return (
    <aside aria-label="Session details" className="flex flex-col gap-4 sm:gap-6">
      <Card>
        <CardHeader title="This session" className="mb-3" />
        <p className="font-display text-3xl font-semibold text-fg">
          {reviewed}
          <span className="ml-1.5 text-base font-medium text-fg-muted">{reviewed === 1 ? "card" : "cards"} reviewed</span>
        </p>
        <ul className="mt-3 grid grid-cols-3 gap-2 text-center" aria-label="Tapbacks this session">
          {(["love", "like", "dislike"] as const).map((rating) => (
            <li key={rating} className="rounded-xl border border-line bg-ink-800/60 py-2">
              <span aria-hidden="true" className="block text-lg leading-6">
                {TAPBACK_EMOJI[rating]}
              </span>
              <span className="text-sm font-semibold text-fg tabular-nums">{tally[rating]}</span>
              <span className="sr-only"> {rating === "love" ? "Effortless" : rating === "like" ? "Hesitant" : "Guessed"}</span>
            </li>
          ))}
        </ul>
        {reviewed > 0 ? (
          <ProgressBar
            className="mt-3"
            value={recalled / reviewed}
            label="Recalled this session"
            showLabel
            valueText={formatPercent(recalled / reviewed)}
            tone="success"
            size="xs"
          />
        ) : null}
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-line bg-ink-800/60 px-3 py-2">
            <dt className="text-xs text-fg-subtle">Due now</dt>
            <dd className="font-semibold text-fg tabular-nums">{queue ? queue.dueNow : "–"}</dd>
          </div>
          <div className="rounded-xl border border-line bg-ink-800/60 px-3 py-2">
            <dt className="text-xs text-fg-subtle">New left today</dt>
            <dd className="font-semibold text-fg tabular-nums">{queue ? `${queue.newRemaining}/${queue.newPerDay}` : "–"}</dd>
          </div>
        </dl>
        {mode === "bonus" ? <p className="mt-3 text-xs text-fg-subtle">➕ Bonus mode: new cards past today&apos;s cap.</p> : null}
      </Card>

      {current ? <CardStateCard turn={current} /> : null}

      <Card>
        <CardHeader title="Drill a pattern" level={2} className="mb-3" />
        <label htmlFor={selectId} className="sr-only">
          Pattern to drill
        </label>
        <select
          id={selectId}
          value={tag ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            router.push(value ? `/review?tag=${encodeURIComponent(value)}` : "/review");
          }}
          className="h-10 w-full rounded-xl border border-line-strong bg-ink-800 px-3 text-sm text-fg focus:border-synapse/70"
        >
          <option value="">All due cards</option>
          {tagOptions.map((entry) => (
            <option key={entry} value={entry}>
              {tagLabel(entry)}
            </option>
          ))}
        </select>

        <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">Keyboard</h3>
        <ul className="mt-2 space-y-1.5 text-sm text-fg-muted">
          <li className="flex items-center justify-between gap-2">
            Send answer <Kbd>Enter</Kbd>
          </li>
          <li className="flex items-center justify-between gap-2">
            New line
            <span className="flex items-center gap-1">
              <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd>
            </span>
          </li>
          {(
            [
              ["❤️", "Effortless", "3"],
              ["👍", "Hesitant", "2"],
              ["👎", "Guessed", "1"],
            ] as const
          ).map(([emoji, name, key]) => (
            <li key={key} className="flex items-center justify-between gap-2">
              <span>
                <span aria-hidden="true">{emoji} </span>
                {name}
              </span>
              <Kbd>{key}</Kbd>
            </li>
          ))}
        </ul>
      </Card>
    </aside>
  );
}

function CardStateCard({ turn }: { turn: Turn }) {
  const { state, preview, card } = turn.next;
  const lastReviewed = state.lastReviewedAt;
  return (
    <Card>
      <CardHeader title="Card memory" description={card.title} className="mb-3" />
      <dl className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-xl border border-line bg-ink-800/60 px-2 py-2">
          <dt className="text-xs text-fg-subtle">Interval</dt>
          <dd className="font-semibold text-fg tabular-nums">
            {state.intervalDays > 0 ? `${Math.round(state.intervalDays)}d` : "–"}
          </dd>
        </div>
        <div className="rounded-xl border border-line bg-ink-800/60 px-2 py-2">
          <dt className="text-xs text-fg-subtle">Ease</dt>
          <dd className="font-semibold text-fg tabular-nums">{state.easeFactor.toFixed(2)}</dd>
        </div>
        <div className="rounded-xl border border-line bg-ink-800/60 px-2 py-2">
          <dt className="text-xs text-fg-subtle">Lapses</dt>
          <dd className="font-semibold text-fg tabular-nums">{state.lapses}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-fg-subtle">Next review if you tap back:</p>
      <ul className="mt-1.5 grid grid-cols-3 gap-2 text-center text-sm" aria-label="Projected next interval per tapback">
        {(["love", "like", "dislike"] as const).map((rating) => (
          <li key={rating} className="rounded-xl bg-ink-800/60 py-1.5">
            <span aria-hidden="true">{TAPBACK_EMOJI[rating]} </span>
            <span className="sr-only">{rating === "love" ? "Effortless" : rating === "like" ? "Hesitant" : "Guessed"}: </span>
            <span className="font-medium text-fg tabular-nums">{preview[rating].label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-fg-subtle">
        {lastReviewed ? `${plural(state.repetition, "successful rep")} in a row` : "Never reviewed: first impressions count."}
      </p>
    </Card>
  );
}
