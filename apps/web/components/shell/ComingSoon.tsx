import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

/** Placeholder used by pages whose feature UI has not landed yet. */
export function ComingSoon({
  eyebrow,
  title,
  description,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <EmptyState
        icon={icon}
        title="Coming soon"
        description="This surface is being wired up. The API is live, so it will light up as soon as the UI lands."
        action={
          <ButtonLink href="/" variant="secondary">
            Back to dashboard
          </ButtonLink>
        }
      />
      {children}
    </>
  );
}
