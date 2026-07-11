import { redirect } from "next/navigation";

/** Entry point redirects to Lead Sources CSV Upload screen. */
export default function Home() {
  redirect("/lead-sources");
}
