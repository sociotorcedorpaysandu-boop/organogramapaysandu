import { GraduationCap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { GuidedTour, isTourDone, markTourDone } from "@/components/help/GuidedTour";
import { PageTips } from "@/components/help/PageTips";
import { Button } from "@/components/ui/button";
import { getPageHelp } from "@/help/pageHelp";

export function PageHelpActions({ pathname }: { pathname: string }) {
  const help = getPageHelp(pathname);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    setTourOpen(false);
    if (!help || isTourDone(help.path)) return;
    const t = window.setTimeout(() => setTourOpen(true), 900);
    return () => window.clearTimeout(t);
  }, [help]);

  const close = useCallback(() => {
    setTourOpen(false);
    if (help) markTourDone(help.path);
  }, [help]);

  if (!help) return null;

  return (
    <div className="no-print flex items-center gap-1">
      <Button variant="ghost" size="sm" onClick={() => setTourOpen(true)} aria-label="Tutorial">
        <GraduationCap className="h-4 w-4" />
        <span className="hidden sm:inline">Tutorial</span>
      </Button>
      <PageTips tips={help.tips} />
      <GuidedTour steps={help.tour} open={tourOpen} onClose={close} />
    </div>
  );
}
