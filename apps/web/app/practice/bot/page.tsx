import { redirect } from "next/navigation";

/** Prepr Bot now lives inside each problem's code stage (Show AI / ⌘L). */
export default function PreprBotPage() {
  redirect("/practice");
}
