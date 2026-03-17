import { PageName } from "@/types";
import { PageSettingsCard } from "@/components/PageSettingsCard";

export default function AppCredits() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">App Credits</h1>
          <p className="text-muted-foreground mt-1">
            Manage the page title and subtitle for App Credits.
          </p>
        </div>
      </div>

      <PageSettingsCard pageName={PageName.PricingDeal} shouldAcceptCtaText />
    </div>
  );
}
