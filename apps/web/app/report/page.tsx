import { formatReportCardText } from "@synapse/core";
import type { Metadata } from "next";
import { ReportCardView } from "@/components/report/ReportCardView";
import { PageHeader } from "@/components/ui";
import { reportCardFor } from "@/lib/server/report";
import { currentUserId, getStore, now } from "@/lib/server/store";

export const metadata: Metadata = { title: "Weekly report card", description: "Your streak, weak spots, and AI-use trend for the week, as a shareable card." };
export const dynamic = "force-dynamic";

export default function ReportPage() {
  const card = reportCardFor(getStore(), currentUserId(), now());
  return (
    <>
      <PageHeader eyebrow="Weekly report card" title={`This week: ${card.grade}`} description={card.headline} />
      <ReportCardView card={card} text={formatReportCardText(card)} />
    </>
  );
}
