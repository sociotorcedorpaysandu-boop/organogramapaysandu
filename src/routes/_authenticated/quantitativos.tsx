import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

import { PageError } from "@/components/PageError";
import { PageSkeleton } from "@/components/PageStates";
import { CollaboratorTypeBadges } from "@/components/organization/CollaboratorTypeBadges";
import { useOrganization } from "@/components/organization/OrganizationProvider";
import { TypeMultiFilter } from "@/components/organization/TypeMultiFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  collaboratorTypeIdsOf,
  computeAreaQuantities,
  computePositionQuantities,
  computeStats,
  computeTypeCounts,
  listAreas,
  safePositions,
} from "@/lib/organization";

export const Route = createFileRoute("/_authenticated/quantitativos")({
  head: () => ({
    meta: [
      { title: "Quantitativos — Organograma Institucional Paysandu" },
      {
        name: "description",
        content:
          "Indicadores e quantitativos por cargo, área e tipo de colaborador do organograma do Paysandu Sport Club.",
      },
      { property: "og:title", content: "Quantitativos — Organograma Institucional Paysandu" },
      {
        property: "og:description",
        content:
          "Indicadores e quantitativos por cargo, área e tipo de colaborador do organograma do Paysandu Sport Club.",
      },
    ],
  }),
  component: QuantitativosPage,
  errorComponent: PageError,
});

function formatPercent(value: number): string {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10).replaceAll("-", "");
}

function QuantitativosPage() {
  const { positions, collaboratorTypes, isLoading } = useOrganization();

  const [areaFilter, setAreaFilter] = useState("all");
  const [cargoFilter, setCargoFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);

  const list = safePositions(positions);
  const areas = useMemo(() => listAreas(list), [list]);
  const cargoOptions = useMemo(() => {
    const titles = new Set<string>();
    for (const position of list) {
      const title = (position.positionTitle ?? "").trim();
      if (title) titles.add(title);
    }
    return Array.from(titles).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [list]);

  const filtered = useMemo(() => {
    return list.filter((position) => {
      if (areaFilter !== "all" && (position.area ?? "").trim() !== areaFilter) return false;
      if (cargoFilter !== "all" && (position.positionTitle ?? "").trim() !== cargoFilter)
        return false;
      if (statusFilter !== "all" && position.status !== statusFilter) return false;
      if (typeFilter.length > 0) {
        const ids = collaboratorTypeIdsOf(position);
        if (!ids.some((id) => typeFilter.includes(id))) return false;
      }
      return true;
    });
  }, [list, areaFilter, cargoFilter, statusFilter, typeFilter]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);
  const collaborators = useMemo(
    () =>
      filtered.filter(
        (position) => position.status === "occupied" && (position.personName ?? "").trim(),
      ).length,
    [filtered],
  );
  const activeTypes = useMemo(
    () => collaboratorTypes.filter((type) => type.isActive).length,
    [collaboratorTypes],
  );
  const typeCounts = useMemo(() => computeTypeCounts(filtered), [filtered]);
  // Colaboradores com pelo menos um tipo (cada pessoa conta uma única vez).
  const collaboratorsWithType = useMemo(
    () =>
      filtered.filter(
        (position) =>
          position.status === "occupied" &&
          (position.personName ?? "").trim() &&
          collaboratorTypeIdsOf(position).length > 0,
      ).length,
    [filtered],
  );
  // Soma total das associações (uma pessoa com vários tipos conta em cada um).
  const typeAssociationsTotal = useMemo(
    () => Array.from(typeCounts.values()).reduce((sum, count) => sum + count, 0),
    [typeCounts],
  );
  // Tipos que possuem pelo menos um colaborador no recorte filtrado.
  const typesInScope = useMemo(
    () => Array.from(typeCounts.values()).filter((count) => count > 0).length,
    [typeCounts],
  );
  const byPosition = useMemo(() => computePositionQuantities(filtered), [filtered]);
  const byArea = useMemo(() => computeAreaQuantities(filtered), [filtered]);
  const byType = useMemo(
    () =>
      collaboratorTypes
        .filter((type) => type.isActive || (typeCounts.get(type.id) ?? 0) > 0)
        .map((type) => ({ type, count: typeCounts.get(type.id) ?? 0 }))
        .sort((a, b) => b.count - a.count || a.type.name.localeCompare(b.type.name, "pt-BR")),
    [collaboratorTypes, typeCounts],
  );

  if (isLoading) return <PageSkeleton />;

  const hasFilters =
    areaFilter !== "all" || cargoFilter !== "all" || statusFilter !== "all" || typeFilter.length > 0;

  const indicators = [
    { label: "Total de cargos", value: stats.total, scope: "recorte" },
    { label: "Posições ocupadas", value: stats.occupied, scope: "recorte" },
    { label: "Cargos vagos", value: stats.vacant, scope: "recorte" },
    { label: "Colaboradores", value: collaborators, scope: "recorte" },
    { label: "Áreas", value: stats.areas, scope: "recorte" },
    { label: "Tipos ativos cadastrados", value: activeTypes, scope: "global" },
    { label: "Tipos encontrados no recorte", value: typesInScope, scope: "recorte" },
    { label: "Colaboradores com tipo", value: collaboratorsWithType, scope: "recorte" },
    { label: "Associações com tipos", value: typeAssociationsTotal, scope: "recorte" },
    { label: "Registros sem superior", value: stats.withoutSuperior, scope: "recorte" },
  ];

  function indicatorRows(): unknown[][] {
    return [["Indicador", "Valor"], ...indicators.map((item) => [item.label, item.value])];
  }

  function positionRows(): unknown[][] {
    return [
      ["Cargo", "Posições totais", "Ocupadas", "Vagas"],
      ...byPosition.map((row) => [row.title, row.total, row.occupied, row.vacant]),
    ];
  }

  function areaRows(): unknown[][] {
    return [
      ["Área", "Cargos", "Colaboradores", "Vagas"],
      ...byArea.map((row) => [row.area, row.total, row.occupied, row.vacant]),
    ];
  }

  function typeRows(): unknown[][] {
    return [
      ["Tipo", "Colaboradores associados", "% sobre o total de colaboradores"],
      ...byType.map((row) => [
        row.type.name,
        row.count,
        collaborators > 0 ? formatPercent((row.count / collaborators) * 100) : "0,0%",
      ]),
    ];
  }

  function exportExcel() {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(indicatorRows()), "Indicadores");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(positionRows()), "Por cargo");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(areaRows()), "Por área");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(typeRows()), "Por tipo");
    XLSX.writeFile(workbook, `quantitativos-paysandu-${todayStamp()}.xlsx`);
  }

  function exportCsv() {
    const sections: Array<[string, unknown[][]]> = [
      ["INDICADORES", indicatorRows()],
      ["QUANTITATIVOS POR CARGO", positionRows()],
      ["QUANTITATIVOS POR ÁREA", areaRows()],
      ["QUANTITATIVOS POR TIPO", typeRows()],
    ];
    const aoa: unknown[][] = [];
    for (const [title, rows] of sections) {
      aoa.push([title]);
      aoa.push(...rows);
      aoa.push([]);
    }
    const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(aoa));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `quantitativos-paysandu-${todayStamp()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Quantitativos</h2>
          <p className="text-sm text-muted-foreground">
            Indicadores calculados em tempo real sobre a base atual
            {hasFilters ? " (filtros aplicados)" : ""}.
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportExcel} disabled={filtered.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <FileText className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      <div className="no-print flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
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
        <Select value={cargoFilter} onValueChange={setCargoFilter}>
          <SelectTrigger className="w-56" aria-label="Filtrar por cargo">
            <SelectValue placeholder="Todos os cargos" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">Todos os cargos</SelectItem>
            {cargoOptions.map((title) => (
              <SelectItem key={title} value={title}>
                {title}
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
        <TypeMultiFilter types={collaboratorTypes} selected={typeFilter} onChange={setTypeFilter} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {indicators.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-2xl font-extrabold tabular-nums text-foreground">{item.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                {item.scope === "global" ? "Base completa" : "Respeita os filtros"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quantitativos por cargo</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="w-28 text-right">Posições</TableHead>
                  <TableHead className="w-24 text-right">Ocupadas</TableHead>
                  <TableHead className="w-20 text-right">Vagas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byPosition.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum registro corresponde aos filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  byPosition.map((row) => (
                    <TableRow key={row.title}>
                      <TableCell className="font-medium">{row.title}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.total}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.occupied}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.vacant}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quantitativos por área</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Área</TableHead>
                  <TableHead className="w-24 text-right">Cargos</TableHead>
                  <TableHead className="w-32 text-right">Colaboradores</TableHead>
                  <TableHead className="w-20 text-right">Vagas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byArea.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum registro corresponde aos filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  byArea.map((row) => (
                    <TableRow key={row.area}>
                      <TableCell className="font-medium">{row.area}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.total}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.occupied}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.vacant}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quantitativos por tipo de colaborador</CardTitle>
          <p className="text-xs text-muted-foreground">
            Como uma pessoa pode possuir vários tipos, a soma por tipo pode superar o total de
            colaboradores.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead className="w-48 text-right">Colaboradores associados</TableHead>
                <TableHead className="w-48 text-right">% sobre o total de colaboradores</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byType.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum tipo ativo ou associado no recorte atual.
                  </TableCell>
                </TableRow>
              ) : (
                byType.map((row) => (
                  <TableRow key={row.type.id}>
                    <TableCell>
                      <CollaboratorTypeBadges types={collaboratorTypes} typeIds={[row.type.id]} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {collaborators > 0 ? formatPercent((row.count / collaborators) * 100) : "0,0%"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
