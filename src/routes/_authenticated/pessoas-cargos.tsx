import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpDown, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageError } from "@/components/PageError";
import { EmptyState, PageSkeleton } from "@/components/PageStates";
import { EditPositionPanel } from "@/components/organization/EditPositionPanel";
import { useOrganization } from "@/components/organization/OrganizationProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
import {
  buildPositionIndex,
  connectionTypeLabel,
  listAreas,
  positionDisplayName,
  safePositions,
  statusLabel,
} from "@/lib/organization";
import { cn } from "@/lib/utils";
import type { OrganizationPosition } from "@/types/organization";

const PAGE_SIZE = 12;

type SortKey = "personName" | "positionTitle" | "area" | "status";

interface PessoasSearch {
  q?: string;
}

export const Route = createFileRoute("/_authenticated/pessoas-cargos")({
  validateSearch: (search: Record<string, unknown>): PessoasSearch => ({
    q: typeof search.q === "string" && search.q ? search.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Pessoas e cargos — Organograma Institucional Paysandu" },
      {
        name: "description",
        content: "Tabela de pessoas e cargos do organograma institucional do Paysandu Sport Club.",
      },
      { property: "og:title", content: "Pessoas e cargos — Organograma Institucional Paysandu" },
      {
        property: "og:description",
        content: "Tabela de pessoas e cargos do organograma institucional do Paysandu Sport Club.",
      },
    ],
  }),
  component: PeoplePositionsPage,
  errorComponent: PageError,
});

function statusBadgeClass(status: OrganizationPosition["status"]): string {
  if (status === "occupied") return "border-success/40 bg-success/10 text-success";
  if (status === "vacant") return "border-warning/40 bg-warning/10 text-warning";
  return "border-border bg-muted text-muted-foreground";
}

function PeoplePositionsPage() {
  const { positions, isLoading, deletePosition } = useOrganization();
  const { q } = Route.useSearch();

  const [search, setSearch] = useState(q ?? "");
  const [areaFilter, setAreaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("positionTitle");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizationPosition | null>(null);
  const [deleting, setDeleting] = useState<OrganizationPosition | null>(null);

  useEffect(() => {
    if (q) setSearch(q);
  }, [q]);

  const list = safePositions(positions);
  const index = useMemo(() => buildPositionIndex(list), [list]);
  const areas = useMemo(() => listAreas(list), [list]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = list.filter((p) => {
      if (areaFilter !== "all" && (p.area ?? "").trim() !== areaFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (query) {
        const superior = p.superiorId ? index.get(p.superiorId) : undefined;
        const haystack = `${p.personName} ${p.positionTitle} ${p.area} ${superior?.positionTitle ?? ""} ${superior?.personName ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
    result = [...result].sort((a, b) => {
      const va = (a[sortKey] ?? "").toString().toLowerCase();
      const vb = (b[sortKey] ?? "").toString().toLowerCase();
      const cmp = va.localeCompare(vb, "pt-BR");
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [list, search, areaFilter, statusFilter, sortKey, sortAsc, index]);

  useEffect(() => {
    setPage(1);
  }, [search, areaFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((prev) => !prev);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function openEdit(position: OrganizationPosition) {
    setEditing(position);
    setPanelOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setPanelOpen(true);
  }

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Pessoas e cargos</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} de {list.length} registro(s) exibidos.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo cargo
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, cargo ou superior…"
            className="w-72 pl-8"
            aria-label="Buscar registros"
          />
        </div>
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-52" aria-label="Filtrar por área">
            <SelectValue placeholder="Todas as áreas" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">Todas as áreas</SelectItem>
            {areas.map((area) => (
              <SelectItem key={area} value={area}>
                {area}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" aria-label="Filtrar por status">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="occupied">Ocupado</SelectItem>
            <SelectItem value="vacant">Vago</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum registro encontrado"
          description="A base está vazia. Importe a planilha ou crie um novo cargo."
          action={<Button onClick={openCreate}>Criar primeiro cargo</Button>}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                {(
                  [
                    ["personName", "Nome"],
                    ["positionTitle", "Cargo"],
                    ["area", "Área"],
                  ] as Array<[SortKey, string]>
                ).map(([key, label]) => (
                  <TableHead key={key}>
                    <button
                      type="button"
                      onClick={() => toggleSort(key)}
                      className="flex items-center gap-1 font-medium hover:text-foreground"
                    >
                      {label}
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </TableHead>
                ))}
                <TableHead>Superior</TableHead>
                <TableHead>Ligação</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => toggleSort("status")}
                    className="flex items-center gap-1 font-medium hover:text-foreground"
                  >
                    Status
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </TableHead>
                <TableHead className="w-28 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum registro corresponde aos filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((position) => {
                  const superior = position.superiorId ? index.get(position.superiorId) : undefined;
                  return (
                    <TableRow key={position.id}>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {position.legacyId}
                      </TableCell>
                      <TableCell className="font-medium">
                        {position.status === "vacant" ? (
                          <span className="text-warning">CARGO VAGO</span>
                        ) : (
                          position.personName || "—"
                        )}
                      </TableCell>
                      <TableCell>{position.positionTitle || "—"}</TableCell>
                      <TableCell>{position.area?.trim() || "—"}</TableCell>
                      <TableCell className="max-w-56 truncate">
                        {superior ? positionDisplayName(superior) : "—"}
                      </TableCell>
                      <TableCell>{connectionTypeLabel(position.connectionType)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-block rounded-full border px-2 py-0.5 text-xs font-medium",
                            statusBadgeClass(position.status),
                          )}
                        >
                          {statusLabel(position.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(position)}
                            aria-label={`Editar ${position.positionTitle}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleting(position)}
                            aria-label={`Excluir ${position.positionTitle}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>
              Página {currentPage} de {pageCount}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      )}

      <EditPositionPanel open={panelOpen} onOpenChange={setPanelOpen} position={editing} />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cargo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{" "}
              <strong>{deleting ? positionDisplayName(deleting) : ""}</strong>? Os subordinados
              diretos ficarão sem superior definido. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) deletePosition(deleting.id);
                setDeleting(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
