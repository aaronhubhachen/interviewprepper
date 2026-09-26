import type { Metadata } from "next";
import { StyleguideDemo } from "@/components/shell/StyleguideDemo";
import {
  Banner,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  Kbd,
  PageHeader,
  Pill,
  ProgressBar,
  Skeleton,
  Spinner,
  StatTile,
  TagPill,
} from "@/components/ui";

export const metadata: Metadata = { title: "Styleguide", robots: { index: false } };

/** Living reference for the shared UI kit (not linked from the nav). */
export default function StyleguidePage() {
  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Design system"
        title="Synapse UI kit"
        description="Shared components in components/ui. Tokens live in app/globals.css (@theme)."
        actions={<ButtonLink href="/">Dashboard</ButtonLink>}
      />

      <section className="space-y-4" aria-labelledby="sg-buttons">
        <h2 id="sg-buttons" className="text-xl font-semibold">
          Buttons
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="success">Success</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Grading</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg" rightIcon={<span aria-hidden="true">→</span>}>
            Start review
          </Button>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="sg-stats">
        <h2 id="sg-stats" className="text-xl font-semibold">
          Stat tiles, pills, progress
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Due now" value="7" icon="🃏" tone="cyan" hint="2 drills from the IDE" />
          <StatTile label="Retention" value="87%" icon="🧠" tone="violet" trend={{ direction: "up", label: "+4%" }} />
          <StatTile label="Streak" value="12d" icon="🔥" tone="warning" />
          <StatTile label="Learned" value="42" icon="✅" tone="success" hint="of 120 cards" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill>neutral</Pill>
          <Pill tone="violet">violet</Pill>
          <Pill tone="cyan" icon="⚡">demo time</Pill>
          <Pill tone="success">accepted</Pill>
          <Pill tone="warning">hesitant</Pill>
          <Pill tone="danger">wrong answer</Pill>
          <Pill tone="love">❤️ effortless</Pill>
          <TagPill tag="sliding_window" />
          <TagPill tag="dp_state_compression" weak href="/review?tag=dp_state_compression" />
          <Kbd>1</Kbd>
          <Kbd>Ctrl Enter</Kbd>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ProgressBar value={0.72} label="Sliding Window mastery" showLabel />
          <ProgressBar value={3} max={8} label="New cards today" showLabel valueText="3 / 8" tone="cyan" />
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="sg-interactive">
        <h2 id="sg-interactive" className="text-xl font-semibold">
          Tapbacks, chat, toasts
        </h2>
        <StyleguideDemo />
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-labelledby="sg-cards">
        <h2 id="sg-cards" className="sr-only">
          Cards and states
        </h2>
        <Card glow>
          <CardHeader
            eyebrow="Stage 1 · Invariant"
            title="Longest Substring Without Repeating Characters"
            description="What invariant does the window maintain?"
            actions={<Pill tone="warning">medium</Pill>}
          />
          <div className="space-y-3">
            <Banner tone="info" title="Hint">
              Think about what must be true of every character inside the window.
            </Banner>
            <Banner tone="warning">LLM unavailable: graded with the offline heuristic.</Banner>
            <Banner tone="danger" title="Runtime error">
              TypeError: s.charAt is not a function
            </Banner>
            <div className="flex items-center gap-3 text-sm text-fg-muted">
              <Spinner size="sm" label="" /> Evaluating your answer…
            </div>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </Card>
        <EmptyState
          icon="🎉"
          title="All caught up"
          description="Nothing is due. Next card in 3 min (demo time)."
          action={<Button variant="secondary">Practice a weak spot</Button>}
        />
      </section>
    </div>
  );
}
