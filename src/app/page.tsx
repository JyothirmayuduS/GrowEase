import { redirect } from "next/navigation";

import { HomeClient } from "./home-client";

export const metadata = {
  title: "Import Leads — GrowEasy",
  description: "Upload and map your CSV leads instantly.",
};

export default function Home() {
  return <HomeClient isFirstVisit={true} />;
}
