import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { collaboratorTypeIcon } from "@/lib/typeIcons";
import type { CollaboratorType } from "@/types/organization";

const FALLBACK_COLOR = "#64748b";

interface CollaboratorTypeBadgesProps {
  types: CollaboratorType[];
  typeIds: string[];
  /** compact = somente ícone (usado em tabelas); o nome fica no tooltip. */
  compact?: boolean;
}

/** Badges dos tipos de colaborador com tooltip (nome e descrição). */
export function CollaboratorTypeBadges({ types, typeIds, compact = false }: CollaboratorTypeBadgesProps) {
  const selected = typeIds
    .map((id) => types.find((type) => type.id === id))
    .filter((type): type is CollaboratorType => Boolean(type));
  if (selected.length === 0) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-wrap items-center gap-1">
        {selected.map((type) => {
          const Icon = collaboratorTypeIcon(type.icon);
          const color = type.color || FALLBACK_COLOR;
          const tooltipText = compact
            ? type.description
              ? `${type.name} — ${type.description}`
              : type.name
            : type.description || type.name;
          return (
            <Tooltip key={type.id}>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex cursor-default items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    borderColor: `${color}59`,
                    backgroundColor: `${color}14`,
                    color,
                  }}
                >
                  <Icon className="h-3 w-3" aria-hidden />
                  {compact ? <span className="sr-only">{type.name}</span> : type.name}
                </span>
              </TooltipTrigger>
              <TooltipContent>{tooltipText}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
