import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, CircleHelp, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { searchHelp } from "@/help/helpArticles";

export function HelpCenter() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const results = useMemo(() => searchHelp(query), [query]);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="no-print fixed bottom-4 right-4 z-40 rounded-full shadow-md"
        size="sm"
        aria-label="Abrir central de ajuda"
      >
        <CircleHelp className="h-4 w-4" />
        Ajuda
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Central de Ajuda</SheetTitle>
          </SheetHeader>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="O que você deseja saber?"
              className="pl-8"
              aria-label="O que você deseja saber?"
            />
          </div>
          <div className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1 pb-4">
            {results.length === 0 ? (
              <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhum resultado. Tente outras palavras, como “imprimir” ou “PCD”.
              </p>
            ) : (
              results.map((article) => {
                const isOpen = expanded === article.id || (query.trim() !== "" && results[0]?.id === article.id && expanded === null);
                return (
                  <div key={article.id} className="rounded-md border bg-card">
                    <button
                      type="button"
                      className="w-full px-4 py-3 text-left text-sm font-medium text-foreground"
                      onClick={() => setExpanded(expanded === article.id ? "" : article.id)}
                    >
                      {article.title}
                    </button>
                    {isOpen ? (
                      <div className="space-y-3 px-4 pb-4">
                        <p className="text-sm text-muted-foreground">{article.answer}</p>
                        {article.route ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setOpen(false);
                              navigate({ to: article.route as "/" });
                            }}
                          >
                            {article.actionLabel ?? "Ir para esta tela"}
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
