"use client";

import { planProgress, STUDY_PLANS, type PlanProgress, type StudyPlanId } from "@synapse/core/plans";
import type { Tag } from "@synapse/core/tags";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { fetchProblems, fetchStats } from "@/lib/api";
import { cn } from "@/lib/cn";

const ROUNDS = [
  { href: "/practice", label: "Coding", icon: "⌨️" },
  { href: "/design", label: "System design", icon: "🏗️" },
  { href: "/behavioral", label: "Behavioral", icon: "🎙️" },
  { href: "/grill", label: "Resume deep-dive", icon: "🔥" },
  { href: "/review", label: "Flashcards over iMessage", icon: "💬" },
] as const;

export function LandingPage() {
  return (
    <section className="grid min-h-[calc(100dvh-12rem)] items-center gap-14 py-6 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
      <div className="motion-safe:animate-fade-up">
        <h1 className="font-bold tracking-tight text-fg">
          <span className="block text-5xl leading-[1.02] tracking-tighter sm:text-6xl xl:text-7xl">
            Prep for every part of the SWE interview
            <span aria-hidden="true" className="ml-1.5 inline-block h-[0.16em] w-[0.16em] bg-synapse" />
          </span>
          <span className="mt-4 block text-2xl font-semibold text-fg-subtle sm:text-3xl">Not just LeetCode.</span>
        </h1>
        <ul className="mt-8 flex max-w-lg flex-wrap gap-2" aria-label="Interview rounds">
          {ROUNDS.map((round) => (
            <li key={round.href}>
              <Link
                href={round.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-ink-850 px-3 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:border-synapse hover:text-fg"
              >
                <span aria-hidden="true">{round.icon}</span>
                {round.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/review" size="lg" rightIcon={<span aria-hidden="true">→</span>}>
            Start reviewing
          </ButtonLink>
          <ButtonLink href="/mock" size="lg" variant="secondary">
            Run a mock onsite
          </ButtonLink>
        </div>
        <PlanStrip />
      </div>

      <TopicTree />
    </section>
  );
}

/* Coordinates share a 600×520 space so the SVG connectors and the positioned nodes line up at any width. */
const W = 600;
const H = 520;
const NODE_W = 172;
const NODE_H = 64;

interface Topic {
  id: Tag;
  label: string;
  x: number;
  y: number;
}

interface TopicProgress {
  /** Share of the topic's cards learned (seen and passed at least once). */
  learned: number;
  cards: number;
  mastered: number;
}

const TOPICS: Topic[] = [
  { id: "arrays", label: "Arrays", x: 300, y: 36 },
  { id: "two_pointers", label: "Two Pointers", x: 167, y: 146 },
  { id: "stack", label: "Stack", x: 433, y: 146 },
  { id: "linked_list", label: "Linked List", x: 100, y: 256 },
  { id: "binary_search", label: "Binary Search", x: 300, y: 256 },
  { id: "sliding_window", label: "Sliding Window", x: 500, y: 256 },
  { id: "tree_traversal", label: "Trees", x: 300, y: 366 },
  { id: "trie", label: "Tries", x: 100, y: 476 },
  { id: "heap", label: "Heap", x: 300, y: 476 },
  { id: "backtracking", label: "Backtracking", x: 500, y: 476 },
];

const EDGES: [Tag, Tag][] = [
  ["arrays", "two_pointers"],
  ["arrays", "stack"],
  ["two_pointers", "linked_list"],
  ["two_pointers", "binary_search"],
  ["two_pointers", "sliding_window"],
  ["linked_list", "tree_traversal"],
  ["binary_search", "tree_traversal"],
  ["tree_traversal", "trie"],
  ["tree_traversal", "heap"],
  ["tree_traversal", "backtracking"],
];

const byId = new Map(TOPICS.map((topic) => [topic.id, topic]));

function edgePath(from: Topic, to: Topic): string {
  const startY = from.y + NODE_H / 2;
  const endY = to.y - NODE_H / 2;
  const midY = (startY + endY) / 2;
  return `M ${from.x} ${startY} V ${midY} H ${to.x} V ${endY}`;
}

const pct = (value: number, total: number) => `${(value / total) * 100}%`;

/** Real per-topic progress from /api/stats; null until loaded (bars stay empty rather than faked). */
function useTopicProgress(): Map<Tag, TopicProgress> | null {
  const [progress, setProgress] = useState<Map<Tag, TopicProgress> | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetchStats({ signal: controller.signal })
      .then((stats) =>
        setProgress(new Map(stats.masteryByTag.map((tag) => [tag.tag, { learned: tag.learned, cards: tag.cards, mastered: tag.mastered }]))),
      )
      .catch(() => {
        if (!controller.signal.aborted) setProgress(new Map());
      });
    return () => controller.abort();
  }, []);
  return progress;
}

function TopicTree() {
  const progress = useTopicProgress();
  return (
    <div className="mx-auto w-full max-w-xl">
      <p className="mb-4 text-center font-mono text-xs uppercase tracking-[0.14em] text-fg-subtle">Coding roadmap</p>
      <nav aria-label="Practice by topic" className="relative aspect-[600/520] w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full text-line-strong" fill="none" aria-hidden="true">
        {EDGES.map(([from, to]) => (
          <path
            key={`${from}-${to}`}
            d={edgePath(byId.get(from)!, byId.get(to)!)}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        ))}
      </svg>

      {TOPICS.map((topic) => {
        const stat = progress?.get(topic.id);
        const ratio = stat && stat.cards > 0 ? stat.learned / stat.cards : 0;
        const done = Boolean(stat && stat.cards > 0 && stat.mastered === stat.cards);
        const detail = stat && stat.cards > 0 ? `${stat.learned} of ${stat.cards} cards learned` : "Not started";
        return (
          <Link
            key={topic.id}
            href={`/practice?tag=${topic.id}`}
            aria-label={`Practice ${topic.label} problems. ${detail}.`}
            title={detail}
            className={cn(
              "absolute flex flex-col justify-center gap-2 rounded-xl border px-2.5 shadow-card transition-[border-color,box-shadow,transform] duration-150 hover:border-synapse hover:shadow-glow motion-safe:hover:-translate-y-0.5 sm:px-3.5",
              done ? "border-synapse bg-ink-800 shadow-glow" : "border-line-strong bg-ink-850",
            )}
            style={{
              left: pct(topic.x - NODE_W / 2, W),
              top: pct(topic.y - NODE_H / 2, H),
              width: pct(NODE_W, W),
              height: pct(NODE_H, H),
            }}
          >
            <span className="truncate text-center text-[0.7rem] font-semibold text-fg sm:text-sm">{topic.label}</span>
            <span className="h-1 overflow-hidden rounded-full bg-ink-600 sm:h-1.5">
              <span className="block h-full rounded-full bg-synapse" style={{ width: `${ratio * 100}%` }} />
            </span>
          </Link>
        );
      })}
      </nav>
    </div>
  );
}

/** Blind 75 / NeetCode 150 progress; bars stay empty until the problem list loads. */
function PlanStrip() {
  const [progress, setProgress] = useState<Map<StudyPlanId, PlanProgress> | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetchProblems({ signal: controller.signal })
      .then(({ problems }) => {
        const catalog = new Set(problems.map((problem) => problem.leetcodeSlug));
        const solved = new Set(problems.filter((problem) => problem.progress.solved).map((problem) => problem.leetcodeSlug));
        setProgress(new Map(STUDY_PLANS.map((plan) => [plan.id, planProgress(plan, catalog, solved)])));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return (
    <div className="mt-10 grid max-w-md grid-cols-2 gap-3">
      {STUDY_PLANS.map((plan) => {
        const stat = progress?.get(plan.id);
        const total = stat?.total ?? plan.categories.reduce((sum, category) => sum + category.slugs.length, 0);
        return (
          <Link
            key={plan.id}
            href={`/practice?plan=${plan.id}`}
            className="rounded-xl border border-line-strong bg-ink-850 px-3.5 py-3 transition-colors hover:border-synapse"
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-fg">{plan.title}</span>
              <span className="font-mono text-xs tabular-nums text-fg-subtle">
                {stat?.solved ?? 0}/{total}
              </span>
            </span>
            <span className="relative mt-2 block h-1.5 overflow-hidden rounded-full bg-ink-600" aria-hidden="true">
              <span className="absolute inset-y-0 left-0 rounded-full bg-synapse/25" style={{ width: `${((stat?.available ?? 0) / total) * 100}%` }} />
              <span className="absolute inset-y-0 left-0 rounded-full bg-synapse" style={{ width: `${((stat?.solved ?? 0) / total) * 100}%` }} />
            </span>
            <span className="mt-1.5 block text-[0.7rem] text-fg-subtle">{stat ? `${stat.available} in Prepr` : "\u00a0"}</span>
          </Link>
        );
      })}
    </div>
  );
}
