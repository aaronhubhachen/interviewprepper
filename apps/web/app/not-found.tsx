import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <EmptyState
      icon="🕳️"
      level={1}
      title="Page not found"
      description="That page doesn't exist."
      action={<ButtonLink href="/">Back to dashboard</ButtonLink>}
    />
  );
}
