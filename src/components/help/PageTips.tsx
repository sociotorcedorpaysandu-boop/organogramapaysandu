import { Lightbulb } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function PageTips({ tips }: { tips: string[] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Dicas desta tela">
          <Lightbulb className="h-4 w-4" />
          <span className="hidden sm:inline">Dicas desta tela</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="text-sm font-semibold">Dicas desta tela</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
