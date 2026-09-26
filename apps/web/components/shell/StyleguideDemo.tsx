"use client";

import { useState } from "react";
import type { Rating } from "@synapse/core/sm2";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ChatBubble, ChatThread } from "@/components/ui/ChatBubble";
import { TapbackButtons } from "@/components/ui/TapbackButtons";
import { useToast } from "@/components/ui/Toast";

const PREVIEW = { love: { label: "4d" }, like: { label: "1d" }, dislike: { label: "10m" } } as const;

/** Interactive half of /styleguide (tapbacks, toasts, chat). */
export function StyleguideDemo() {
  const { toast } = useToast();
  const [picked, setPicked] = useState<Rating | undefined>();
  const [loading, setLoading] = useState<Rating | false>(false);
  const [banner, setBanner] = useState(true);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">TapbackButtons (press 3 / 2 / 1)</p>
        <TapbackButtons
          preview={PREVIEW}
          suggested="like"
          selected={picked}
          loading={loading}
          onRate={(grade, rating) => {
            setLoading(rating);
            setTimeout(() => {
              setLoading(false);
              setPicked(rating);
              toast({ title: `Rated ${rating} (grade ${grade})`, description: `Next review in ${PREVIEW[rating].label}.`, tone: "synapse" });
            }, 600);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setPicked(undefined)}>
            Reset rating
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toast({ title: "Saved", tone: "success" })}>
            Success toast
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toast({ title: "Server unreachable", description: "Retrying…", tone: "danger" })}>
            Error toast
          </Button>
        </div>
        {banner ? (
          <Banner tone="synapse" title="Drill queued" onDismiss={() => setBanner(false)}>
            Synapse will text you a Bitmask DP micro-card tomorrow at 9:00 AM.
          </Banner>
        ) : null}
      </div>
      <div className="rounded-card border border-line bg-ink-900/70 p-4">
        <ChatThread label="Example iMessage thread" className="max-h-96">
          <ChatBubble from="agent" name="Synapse" tail={false}>
            ☕ Morning Synapse: 3 cards due. Weak spot: Bitmask DP.
          </ChatBubble>
          <ChatBubble from="agent" tapback="👍">
            🧠 Sliding window: when exactly do you shrink the left pointer in Longest Substring Without Repeating Characters?
          </ChatBubble>
          <ChatBubble from="you" meta="Delivered">
            when the char at right is already in the window, move left past its last index
          </ChatBubble>
          <ChatBubble from="agent" meta="❤️ 4d · 👍 1d · 👎 10m">
            ✅ Nailed it. Jump left to max(left, last[c] + 1) so it never moves backwards.
          </ChatBubble>
          <ChatBubble from="agent" typing />
        </ChatThread>
      </div>
    </div>
  );
}
