import {
  Background,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Crosshair,
  Maximize,
  Minimize,
  Plus,
  Printer,
  Search,
  Tags,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { layoutHierarchy } from "@/lib/chartLayout";
import {
  categorizePositions,
  collaboratorTypeIdsOf,
  displayModeLabel,
  formatDateTime,
  listAreas,
  safePositions,
} from "@/lib/organization";
import { cn } from "@/lib/utils";
import { HIERARCHY_LEVELS, hierarchyLevelOf } from "@/lib/hierarchyLevel";
import { getDisplayMode, saveDisplayMode } from "@/services/organizationStorageService";
import type { DisplayMode, OrganizationPosition } from "@/types/organization";
import { useOrganization } from "@/components/organization/OrganizationProvider";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  PositionNode,
  type PositionFlowNode,
  type TypeBadge,
} from "@/components/organization/PositionNode";

export const EMPTY_AREA_TOKEN = "__sem_area__";

const nodeTypes = { position: PositionNode };

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

interface OrganizationChartProps {
  positions: OrganizationPosition[];
  initialArea?: string;
  onEdit: (id: string) => void;
  onCreate: () => void;
  onOpenProfile: (id: string) => void;
  onMarkVacant: (id: string) => void;
  onDeactivate: (id: string) => void;
  onOrphanCountChange?: (count: number) => void;
}

/**
 * Todas as conexões do organograma são linhas contínuas.
 * A diferenciação do vínculo (direta/funcional/indefinida) é feita por cor
 * sutil e pelo badge no cartão — nunca por linhas tracejadas.
 */
function edgeStyleFor(connectionType: OrganizationPosition["connectionType"]) {
  if (connectionType === "functional") {
    return { stroke: "var(--color-chart-2)", strokeWidth: 1.75 };
  }
  if (connectionType === "undefined") {
    return { stroke: "var(--color-muted-foreground)", strokeWidth: 1.5 };
  }
  return { stroke: "var(--color-primary)", strokeWidth: 1.75 };
}

type TypeFilterMode = "highlight" | "only";

function ChartInner({
  positions,
  initialArea,
  onEdit,
  onCreate,
  onOpenProfile,
  onMarkVacant,
  onDeactivate,
  onOrphanCountChange,
}: OrganizationChartProps) {
  const reactFlow = useReactFlow();
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const { collaboratorTypes } = useOrganization();

  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState<string>(initialArea ?? "all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [titleFilter, setTitleFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [typeFilterMode, setTypeFilterMode] = useState<TypeFilterMode>("highlight");
  const [showTypeBadges, setShowTypeBadges] = useState(true);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => getDisplayMode());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (initialArea) setAreaFilter(initialArea);
  }, [initialArea]);

  useEffect(() => {
    function onChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    function afterPrint() {
      setIsPrinting(false);
    }
    window.addEventListener("afterprint", afterPrint);
    return () => window.removeEventListener("afterprint", afterPrint);
  }, []);

  const list = safePositions(positions);
  const areas = useMemo(() => listAreas(list), [list]);
  const titles = useMemo(
    () =>
      Array.from(new Set(list.map((p) => (p.positionTitle ?? "").trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [list],
  );
  const hasEmptyArea = useMemo(() => list.some((p) => !(p.area ?? "").trim()), [list]);

  const typeIndex = useMemo(() => {
    const map = new Map(collaboratorTypes.map((type) => [type.id, type]));
    return map;
  }, [collaboratorTypes]);

  const activeTypes = useMemo(
    () => collaboratorTypes.filter((type) => type.isActive),
    [collaboratorTypes],
  );

  const badgesOf = useCallback(
    (position: OrganizationPosition): TypeBadge[] => {
      const badges: TypeBadge[] = [];
      for (const typeId of collaboratorTypeIdsOf(position)) {
        const type = typeIndex.get(typeId);
        if (!type || !type.isActive) continue;
        badges.push({
          id: type.id,
          name: type.name,
          color: type.color ?? "",
          icon: type.icon ?? "",
          description: type.description ?? "",
        });
      }
      return badges;
    },
    [typeIndex],
  );

  const { categorized, matchIds } = useMemo(() => {
    const categorizedResult = categorizePositions(list);
    const query = search.trim().toLowerCase();
    const matches = new Set<string>();
    if (query) {
      for (const p of list) {
        const haystack = `${p.personName} ${p.positionTitle}`.toLowerCase();
        if (haystack.includes(query)) matches.add(p.id);
      }
    }
    return { categorized: categorizedResult, matchIds: matches };
  }, [list, search]);

  useEffect(() => {
    onOrphanCountChange?.(categorized.orphans.length);
  }, [categorized.orphans.length, onOrphanCountChange]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  function changeDisplayMode(mode: DisplayMode) {
    setDisplayMode(mode);
    saveDisplayMode(mode);
  }

  function toggleTypeFilter(typeId: string) {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(typeId)) next.delete(typeId);
      else next.add(typeId);
      return next;
    });
  }

  const { nodes, edges, signature } = useMemo(() => {
    const { orphanIds } = categorized;
    const index = new Map(list.map((p) => [p.id, p]));
    const filtering =
      areaFilter !== "all" || statusFilter !== "all" || titleFilter !== "all" || levelFilter !== "all";
    const typeFiltering = typeFilter.size > 0;

    const matchesFilter = (p: OrganizationPosition) => {
      if (areaFilter !== "all") {
        if (areaFilter === EMPTY_AREA_TOKEN) {
          if ((p.area ?? "").trim()) return false;
        } else if ((p.area ?? "").trim() !== areaFilter) {
          return false;
        }
      }
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (titleFilter !== "all" && (p.positionTitle ?? "").trim() !== titleFilter) return false;
      if (levelFilter !== "all" && hierarchyLevelOf(p.positionTitle ?? "") !== levelFilter) return false;
      return true;
    };

    // Corresponde a qualquer tipo selecionado (lógica OU).
    const matchesType = (p: OrganizationPosition) => {
      if (!typeFiltering) return false;
      return collaboratorTypeIdsOf(p).some((typeId) => typeFilter.has(typeId));
    };

    const inTree = list.filter((p) => !orphanIds.has(p.id));
    const visibleSet = new Set(
      (filtering ? inTree.filter(matchesFilter) : inTree).map((p) => p.id),
    );

    // Modo "somente correspondentes": mantém os superiores dos correspondentes
    // para preservar o contexto hierárquico (nenhum cargo fica desconectado).
    if (typeFiltering && typeFilterMode === "only") {
      const keep = new Set<string>();
      for (const p of inTree) {
        if (!visibleSet.has(p.id) || !matchesType(p)) continue;
        keep.add(p.id);
        let current = p.superiorId;
        let steps = 0;
        while (current && steps < 1000) {
          keep.add(current);
          current = index.get(current)?.superiorId ?? null;
          steps += 1;
        }
      }
      for (const id of Array.from(visibleSet)) {
        if (!keep.has(id)) visibleSet.delete(id);
      }
    }

    // Pai visual: superior real ou, quando filtrado, ancestral visível mais próximo.
    const parentOf = (p: OrganizationPosition): string | null => {
      let current = p.superiorId;
      let steps = 0;
      while (current && steps < 1000) {
        if (visibleSet.has(current)) return current;
        current = index.get(current)?.superiorId ?? null;
        steps += 1;
      }
      return null;
    };

    // Oculta descendentes de nós recolhidos.
    const hiddenByCollapse = (p: OrganizationPosition): boolean => {
      let current = parentOf(p);
      let steps = 0;
      while (current && steps < 1000) {
        if (collapsed.has(current)) return true;
        const parent = index.get(current);
        if (!parent) return false;
        current = parentOf(parent);
        steps += 1;
      }
      return false;
    };

    const visible = Array.from(visibleSet)
      .map((id) => index.get(id)!)
      .filter(Boolean)
      .filter((p) => !hiddenByCollapse(p));

    const visibleIds = new Set(visible.map((p) => p.id));

    // Contagem de filhos (na árvore completa) para o botão de recolher.
    const childCounts = new Map<string, number>();
    for (const p of inTree) {
      if (!p.superiorId) continue;
      childCounts.set(p.superiorId, (childCounts.get(p.superiorId) ?? 0) + 1);
    }

    const searching = search.trim().length > 0;
    const typeHighlight = typeFiltering && typeFilterMode === "highlight";

    const flowNodes: PositionFlowNode[] = visible.map((p) => {
      const typeMatched = matchesType(p);
      return {
        id: p.id,
        type: "position",
        position: { x: 0, y: 0 },
        data: {
          position: p,
          childrenCount: childCounts.get(p.id) ?? 0,
          collapsed: collapsed.has(p.id),
          highlighted: matchIds.has(p.id) || (typeHighlight && typeMatched),
          dimmed:
            (searching && matchIds.size > 0 && !matchIds.has(p.id)) ||
            (typeHighlight && !typeMatched),
          displayMode,
          typeBadges: badgesOf(p),
          showTypeBadges,
          onToggle: toggleCollapse,
          onEdit,
          onOpenProfile,
          onMarkVacant,
          onDeactivate,
        },
      };
    });

    const flowEdges: Edge[] = [];
    for (const p of visible) {
      const parent = parentOf(p);
      if (!parent || !visibleIds.has(parent)) continue;
      flowEdges.push({
        id: `edge-${parent}-${p.id}`,
        source: parent,
        target: p.id,
        type: "smoothstep",
        style: edgeStyleFor(p.connectionType),
      });
    }

    // Layout hierárquico: profundidade pela cadeia de superiores; irmãos no
    // mesmo nível, na horizontal ou em lista vertical conforme o responsável.
    const layout = layoutHierarchy(visible, parentOf, NODE_WIDTH, NODE_HEIGHT);
    for (const node of flowNodes) {
      const laidOut = layout.get(node.id);
      if (laidOut) node.position = laidOut;
    }

    const sig = `${flowNodes.length}:${flowEdges.length}:${areaFilter}:${statusFilter}:${titleFilter}:${levelFilter}:${displayMode}:${typeFilterMode}:${Array.from(typeFilter).sort().join("|")}:${showTypeBadges}:${Array.from(collapsed).join(",")}`;
    return { nodes: flowNodes, edges: flowEdges, signature: sig };
  }, [categorized, list, areaFilter, statusFilter, titleFilter, levelFilter, typeFilter, typeFilterMode, showTypeBadges, displayMode, collapsed, matchIds, search, badgesOf, toggleCollapse, onEdit, onOpenProfile, onMarkVacant, onDeactivate]);

  // Enquadramento inicial: limita o zoom mínimo para que os cartões continuem
  // legíveis; o restante pode ser navegado arrastando o canvas.
  const fitChart = useCallback(
    (duration = 250) => {
      reactFlow.fitView({ padding: 0.08, duration, maxZoom: 1, minZoom: 0.45 });
    },
    [reactFlow],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => fitChart(), 50);
    return () => window.clearTimeout(timer);
  }, [signature, fitChart]);

  function expandAll() {
    setCollapsed(new Set());
  }

  function collapseAll() {
    const withChildren = new Set<string>();
    for (const p of list) {
      if (p.superiorId) {
        const parent = list.find((candidate) => candidate.id === p.superiorId);
        if (parent) withChildren.add(parent.id);
      }
    }
    setCollapsed(withChildren);
  }

  function toggleFullscreen() {
    const element = fullscreenRef.current;
    if (!element) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void element.requestFullscreen();
    }
  }

  /**
   * Prepara o organograma para impressão: expande todos os níveis, ajusta a
   * moldura ao tamanho da página (paisagem), aguarda o enquadramento e só
   * então abre a caixa de impressão.
   */
  async function handlePrint() {
    setCollapsed(new Set());
    setIsPrinting(true);
    await wait(450); // novo layout renderizado
    reactFlow.fitView({ padding: 0.06, maxZoom: 1 });
    await wait(200); // enquadramento aplicado
    window.print();
  }

  const printAreaLabel =
    areaFilter === "all"
      ? "Todas as áreas"
      : areaFilter === EMPTY_AREA_TOKEN
        ? "Sem área definida"
        : areaFilter;

  const printTypeLabel =
    typeFilter.size === 0
      ? "Todos os tipos"
      : activeTypes
          .filter((type) => typeFilter.has(type.id))
          .map((type) => type.name)
          .join(", ") || "Todos os tipos";

  return (
    <div className="flex flex-col gap-3">
      {/* Cabeçalho exibido apenas na impressão */}
      <div className="print-only mb-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Organograma Institucional — Paysandu Sport Club
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Modo de visualização: {displayModeLabel(displayMode)} • Área: {printAreaLabel} • Tipos:{" "}
          {printTypeLabel} • Impresso em {formatDateTime(new Date().toISOString())}
        </p>
      </div>

      {/* Barra de ferramentas */}
      <div className="no-print flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome ou cargo…"
            className="w-60 pl-8"
            aria-label="Buscar no organograma"
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
            {hasEmptyArea ? <SelectItem value={EMPTY_AREA_TOKEN}>Sem área definida</SelectItem> : null}
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

        <Select value={titleFilter} onValueChange={setTitleFilter}>
          <SelectTrigger className="w-52" aria-label="Filtrar por cargo">
            <SelectValue placeholder="Todos os cargos" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">Todos os cargos</SelectItem>
            {titles.map((title) => (
              <SelectItem key={title} value={title}>
                {title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-48" aria-label="Filtrar por nível hierárquico">
            <SelectValue placeholder="Todos os níveis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os níveis</SelectItem>
            {HIERARCHY_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>


        {/* Filtro por tipo de colaborador (qualquer tipo selecionado) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" aria-label="Filtrar por tipo de colaborador">
              <Tags className="h-4 w-4" />
              Tipos
              {typeFilter.size > 0 ? (
                <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-bold text-primary-foreground">
                  {typeFilter.size}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel>Filtrar por tipo</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {activeTypes.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">
                Nenhum tipo ativo cadastrado.
              </p>
            ) : (
              activeTypes.map((type) => (
                <DropdownMenuCheckboxItem
                  key={type.id}
                  checked={typeFilter.has(type.id)}
                  onCheckedChange={() => toggleTypeFilter(type.id)}
                  onSelect={(event) => event.preventDefault()}
                >
                  <span
                    aria-hidden
                    className="mr-1 inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: type.color || "var(--color-muted-foreground)" }}
                  />
                  {type.name}
                </DropdownMenuCheckboxItem>
              ))
            )}
            {typeFilter.size > 0 ? (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setTypeFilter(new Set())}
                  >
                    Limpar filtro de tipos
                  </Button>
                </div>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        {typeFilter.size > 0 ? (
          <Select
            value={typeFilterMode}
            onValueChange={(value) => setTypeFilterMode(value as TypeFilterMode)}
          >
            <SelectTrigger className="w-56" aria-label="Comportamento do filtro de tipos">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="highlight">Destacar no organograma</SelectItem>
              <SelectItem value="only">Mostrar somente correspondentes</SelectItem>
            </SelectContent>
          </Select>
        ) : null}

        <Select value={displayMode} onValueChange={(value) => changeDisplayMode(value as DisplayMode)}>
          <SelectTrigger className="w-44" aria-label="Modo de visualização dos cartões">
            <SelectValue placeholder="Modo de visualização" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="title-name">Cargo + Nome</SelectItem>
            <SelectItem value="title">Somente cargo</SelectItem>
            <SelectItem value="name">Somente nome</SelectItem>
          </SelectContent>
        </Select>

        <label className="flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-xs font-medium text-muted-foreground">
          <Checkbox
            checked={showTypeBadges}
            onCheckedChange={(checked) => setShowTypeBadges(checked === true)}
            aria-label="Exibir tipos de colaboradores nos cartões e na impressão"
          />
          Exibir tipos
        </label>

        <div className="ml-auto flex flex-wrap items-center gap-1">
          <Button variant="outline" size="sm" onClick={expandAll}>
            <ChevronsUpDown className="h-4 w-4" />
            Expandir tudo
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            <ChevronsDownUp className="h-4 w-4" />
            Recolher tudo
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fitChart()}
            aria-label="Centralizar organograma"
          >
            <Crosshair className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => reactFlow.zoomIn({ duration: 200 })}
            aria-label="Aumentar zoom"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => reactFlow.zoomOut({ duration: 200 })}
            aria-label="Reduzir zoom"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            aria-label="Alternar tela cheia"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handlePrint()}
            disabled={isPrinting}
            aria-label="Imprimir organograma"
          >
            <Printer className="h-4 w-4" />
            {isPrinting ? "Preparando…" : "Imprimir"}
          </Button>
          <Button size="sm" onClick={onCreate}>
            <Plus className="h-4 w-4" />
            Novo cargo
          </Button>
        </div>
      </div>

      {/* Área do gráfico */}
      <div
        ref={fullscreenRef}
        className={cn(
          "overflow-hidden rounded-lg border bg-card",
          isPrinting ? "h-[700px] w-[1040px] max-w-full" : "h-[80vh] min-h-[520px]",
        )}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => onEdit(node.id)}
          nodesConnectable={false}
          nodesDraggable={false}
          elementsSelectable={false}
          minZoom={0.05}
          maxZoom={1.6}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="var(--color-border)" />
          <Panel
            position="bottom-left"
            className="!m-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border bg-card px-3 py-2 text-[11px] text-muted-foreground shadow-sm"
          >
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0 w-7 border-t-2 border-primary" />
              Ligação direta
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0 w-7 border-t-2 border-chart-2" />
              Ligação funcional
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0 w-7 border-t-2 border-muted-foreground" />
              Indefinida
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-5 rounded-sm border border-dashed border-muted-foreground/60 bg-muted/40" />
              Cargo vago
            </span>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}

export function OrganizationChart(props: OrganizationChartProps) {
  return (
    <ReactFlowProvider>
      <ChartInner {...props} />
    </ReactFlowProvider>
  );
}
