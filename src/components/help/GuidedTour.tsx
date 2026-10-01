import { useEffect, useLayoutEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { TourStep } from "@/help/pageHelp";

const TOUR_KEY = "paysandu_help_tours_done_v1";

export function isTourDone(path: string): boolean {
  try {
    const done = JSON.parse(window.localStorage.getItem(TOUR_KEY) ?? "[]");
    return Array.isArray(done) && done.includes(path);
  } catch {
    return false;
  }
}

export function markTourDone(path: string) {
  try {
    const done = JSON.parse(window.localStorage.getItem(TOUR_KEY) ?? "[]");
    const list = Array.isArray(done) ? done : [];
    if (!list.includes(path)) list.push(path);
    window.localStorage.setItem(TOUR_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function findTarget(target: string): HTMLElement | null {
  for (const part of target.split(",").map((s) => s.trim())) {
    if (part.startsWith("text:")) {
      const text = part.slice(5).toLowerCase();
      const el = Array.from(document.querySelectorAll<HTMLElement>("main button, main a")).find(
        (b) => b.offsetParent !== null && (b.textContent ?? "").toLowerCase().includes(text),
      );
      if (el) return el;
    } else {
      const el = Array.from(document.querySelectorAll<HTMLElement>(part)).find(
        (e) => e.getClientRects().length > 0,
      );
      if (el) return el;
    }
  }
  return null;
}

export function GuidedTour({
  steps,
  open,
  onClose,
}: {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
}) {
  const [available, setAvailable] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!open) return;
    setAvailable(steps.filter((s) => findTarget(s.target)));
    setIndex(0);
  }, [open, steps]);

  const step = available[index];

  useLayoutEffect(() => {
    if (!open || !step) return;
    const el = findTarget(step.target);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const update = () => setRect(el.getBoundingClientRect());
    const t = window.setTimeout(update, 300);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !step || !rect) return null;

  const pad = 6;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = Math.min(320, vw - 24);
  const below = rect.bottom + 180 < vh;
  const top = below ? rect.bottom + pad + 10 : Math.max(12, rect.top - pad - 170);
  const left = Math.min(Math.max(12, rect.left), vw - cardW - 12);
  const isLast = index === available.length - 1;

  return (
    <div className="no-print fixed inset-0 z-[60]" role="dialog" aria-label="Tutorial da tela">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className="pointer-events-none absolute rounded-md ring-2 ring-primary transition-all"
        style={{
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          boxShadow: "0 0 0 9999px color-mix(in oklab, var(--foreground) 45%, transparent)",
        }}
      />
      <div
        className="absolute rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg"
        style={{ top, left, width: cardW }}
      >
        <p className="text-xs text-muted-foreground">
          {index + 1} de {available.length}
        </p>
        <p className="mt-1 text-sm font-semibold">{step.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{step.content}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Pular
          </Button>
          <div className="flex gap-2">
            {index > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setIndex(index - 1)}>
                Voltar
              </Button>
            ) : null}
            <Button size="sm" onClick={() => (isLast ? onClose() : setIndex(index + 1))}>
              {isLast ? "Concluir" : "Próximo"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
