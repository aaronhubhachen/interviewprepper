import { json, route } from "@/lib/server/http";
import { reportCardFor } from "@/lib/server/report";
import { currentUserId, getStore, now } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/report-card → ReportCard for the last seven days. */
export const GET = route(() => json(reportCardFor(getStore(), currentUserId(), now())));
