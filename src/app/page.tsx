import { redirect } from "next/navigation";

/** Enterprise entry: Dashboard. CSV import lives under /lead-sources. */
export default function Home() {
  redirect("/dashboard");
}
