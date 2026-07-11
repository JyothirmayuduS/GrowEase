import { HomeClient } from "@/app/home-client";

export const metadata = {
  title: "Lead Sources — GrowEasy CRM",
  description: "Import CSV leads into GrowEasy CRM with AI field mapping.",
};

export default function LeadSourcesRoute() {
  return <HomeClient isFirstVisit={false} />;
}
