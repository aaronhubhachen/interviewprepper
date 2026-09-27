import type { Tag } from "@synapse/core/content";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function LandingPage() {
  return (
    <section className="grid min-h-[calc(100dvh-12rem)] items-center gap-14 py-6 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
      <div className="motion-safe:animate-fade-up">
        <span className="inline-flex rounded-full border border-line bg-ink-900 px-3 py-1 font-mono text-xs text-fg-subtle">
          Spaced repetition for SWE interviews
        </span>
        <h1 className="mt-8 font-bold tracking-tight text-fg">
          <span className="block text-4xl sm:text-5xl">A better way to</span>
          <span className="mt-1 block text-7xl leading-[0.95] tracking-tighter sm:text-8xl xl:text-9xl">
            Prepare
            <span aria-hidden="true" className="ml-1 inline-block h-[0.14em] w-[0.14em] bg-synapse" />
          </span>
        </h1>
        <p className="mt-8 max-w-md text-base leading-relaxed text-fg-muted sm:text-lg">
          Flashcards over iMessage, a coding IDE, and voice mock interviews, all on one review schedule.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/review" size="lg" rightIcon={<span aria-hidden="true">→</span>}>
            Start reviewing
          </ButtonLink>
          <ButtonLink href="/practice" size="lg" variant="secondary">
            Practice
          </ButtonLink>
        </div>
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
  progress: number;
}

const TOPICS: Topic[] = [
  { id: "arrays", label: "Arrays", x: 300, y: 36, progress: 1 },
  { id: "two_pointers", label: "Two Pointers", x: 167, y: 146, progress: 0.8 },
  { id: "stack", label: "Stack", x: 433, y: 146, progress: 0.85 },
  { id: "linked_list", label: "Linked List", x: 100, y: 256, progress: 0.8 },
  { id: "binary_search", label: "Binary Search", x: 300, y: 256, progress: 0.9 },
  { id: "sliding_window", label: "Sliding Window", x: 500, y: 256, progress: 0.65 },
  { id: "tree_traversal", label: "Trees", x: 300, y: 366, progress: 0.85 },
  { id: "trie", label: "Tries", x: 100, y: 476, progress: 0.3 },
  { id: "heap", label: "Heap", x: 300, y: 476, progress: 0.55 },
  { id: "backtracking", label: "Backtracking", x: 500, y: 476, progress: 0.08 },
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

function TopicTree() {
  return (
    <nav aria-label="Practice by topic" className="relative mx-auto aspect-[600/520] w-full max-w-xl">
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
        const done = topic.progress >= 1;
        return (
          <Link
            key={topic.id}
            href={`/practice?tag=${topic.id}`}
            aria-label={`Practice ${topic.label} problems`}
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
              <span className="block h-full rounded-full bg-synapse" style={{ width: `${topic.progress * 100}%` }} />
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
