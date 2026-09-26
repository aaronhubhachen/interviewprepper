"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

// Error boundaries must be Client Components. Next 16.2 passes unstable_retry (re-fetch + re-render).
export default function RouteError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon="⚡"
      level={1}
      title="A synapse misfired"
      description="Something went wrong while rendering this page. Your progress is saved."
      action={
        <>
          <Button onClick={() => unstable_retry()}>Try again</Button>
          <ButtonLink href="/" variant="secondary">
            Dashboard
          </ButtonLink>
        </>
      }
    />
  );
}
