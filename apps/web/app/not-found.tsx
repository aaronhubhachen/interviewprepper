import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <EmptyState
      icon="🕳️"
      level={1}
      title="No synapse here"
      description="That page does not exist. Maybe it was pruned for lack of spaced repetition."
      action={<ButtonLink href="/">Back to dashboard</ButtonLink>}
    />
  );
}
