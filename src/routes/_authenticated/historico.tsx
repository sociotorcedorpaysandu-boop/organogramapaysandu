import { createFileRoute } from "@tanstack/react-router";
import { History as HistoryIcon, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { PageError } from "@/components/PageError";
import { EmptyState, PageSkeleton } from "@/components/PageStates";
import { useOrganization } from "@/components/organization/OrganizationProvider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/organization";
import { cn } from "@/lib/utils";
import type { ChangeAction } from "@/types/organization";

const ACTION_LABELS: Record<ChangeAction, string> = {
  create: "Criação",
  update: "Atualização",
  delete: "Exclusão",
  import: "Importação",
};

function actionBadgeClass(action: ChangeAction): string {
  if (action === "create") return "border-success/40 bg-success/10 text-success";
  if (action === "delete") return "border-destructive/40 bg-destructive/10 text-destructive";
  if (action === "import") return "border-warning/40 bg-warning/10 text-warning";
  return "border-primary/30 bg-accent text-accent-foreground";
}

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — Organograma Institucional Paysandu" },
      {
        name: "description",
        content: "Histórico de alterações do organograma institucional do Paysandu Sport Club.",
      },
      { property: "og:title", content: "Histórico — Organograma Institucional Paysandu" },
      {
        property: "og:description",
        content: "Histórico de alterações do organograma institucional do Paysandu Sport Club.",
      },
    ],
  }),
  component: HistoryPage,
  errorComponent: PageError,
});

function HistoryPage() {
  const { history, isLoading } = useOrganization();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");

  const filtered = useMemo(() => {
    const list = Array.isArray(history) ? history : [];
    const query = search.trim().toLowerCase();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    return list.filter((entry) => {
      if (actionFilter !== "all" && entry.action !== actionFilter) return false;
      if (periodFilter !== "all") {
        const created = new Date(entry.createdAt).getTime();
        if (Number.isNaN(created)) return false;
        if (periodFilter === "today" && now - created > dayMs) return false;
        if (periodFilter === "7d" && now - created > 7 * dayMs) return false;
        if (periodFilter === "30d" && now - created > 30 * dayMs) return false;
      }
      if (query && !`${entry.description} ${entry.userName}`.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [history, search, actionFilter, periodFilter]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Histórico de alterações
        </h2>
        <p className="text-sm text-muted-foreground">
          {filtered.length} registro(s). O histórico é armazenado localmente neste navegador.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, cargo ou usuário…"
            className="w-72 pl-8"
            aria-label="Buscar no histórico"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-44" aria-label="Filtrar por tipo de ação">
            <SelectValue placeholder="Todas as ações" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            <SelectItem value="create">Criação</SelectItem>
            <SelectItem value="update">Atualização</SelectItem>
            <SelectItem value="delete">Exclusão</SelectItem>
            <SelectItem value="import">Importação</SelectItem>
          </SelectContent>
        </Select>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-44" aria-label="Filtrar por período">
            <SelectValue placeholder="Todo o período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo o período</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="Nenhuma alteração encontrada"
          description="As edições, criações, exclusões e importações realizadas aparecerão aqui."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Data e hora</TableHead>
                <TableHead className="w-52">Usuário</TableHead>
                <TableHead className="w-32">Ação</TableHead>
                <TableHead>Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </TableCell>
                  <TableCell className="max-w-52 truncate">{entry.userName}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-block rounded-full border px-2 py-0.5 text-xs font-medium",
                        actionBadgeClass(entry.action),
                      )}
                    >
                      {ACTION_LABELS[entry.action]}
                    </span>
                  </TableCell>
                  <TableCell>{entry.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
