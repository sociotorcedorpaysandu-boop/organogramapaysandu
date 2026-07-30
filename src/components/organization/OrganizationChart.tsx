import {
  Background,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Crosshair,
  Maximize,
  Minimize,
  Plus,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  categorizePositions,
  listAreas,
  safePositions,
} from "@/lib/organization";
import type { OrganizationPosition } from "@/types/organization";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  PositionNode,
  type PositionFlowNode,
} from "@/components/organization/PositionNode";

export const EMPTY_AREA_TOKEN = "__sem_area__";

const nodeTypes = { position: PositionNode };

interface OrganizationChartProps {
  positions: OrganizationPosition[];
  initialArea?: string;
  onEdit: (id: string) => void;
  onCreate: () => void;
  onMarkVacant: (id: string) => void;
  onDeactivate: (id: string) => void;
  onOrphanCountChange?: (count: number) => void;
}

function edgeStyleFor(connectionType: OrganizationPosition["connectionType"]) {
  if (connectionType === "functional") {
    return { stroke: "var(--color-chart-2)", strokeWidth: 1.75, strokeDasharray: "7 5" };
  }
  if (connectionType === "undefined") {
    return { stroke: "var(--color-muted-foreground)", strokeWidth: 1.25, strokeDasharray: "2 5" };
  }
  return { stroke: "var(--color-primary)", strokeWidth: 1.75 };
}

function ChartInner({
  positions,
  initialArea,
  onEdit,
  onCreate,
  onMarkVacant,
  onDeactivate,
  onOrphanCountChange,
}: OrganizationChartProps) {
  const reactFlow = useReactFlow();
  const fullscreenRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState<string>(initialArea ?? "all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const list = safePositions(positions);
  const areas = useMemo(() => listAreas(list), [list]);
  const hasEmptyArea = useMemo(() => list.some((p) => !(p.area ?? "").trim()), [list]);

  const { categorized, matchIds, filtering } = useMemo(() => {
    const categorizedResult = categorizePositions(list);
    const filteringActive = areaFilter !== "all" || statusFilter !== "all";
    const query = search.trim().toLowerCase();
    const matches = new Set<string>();
    if (query) {
      for (const p of list) {
        const haystack = `${p.personName} ${p.positionTitle}`.toLowerCase();
        if (haystack.includes(query)) matches.add(p.id);
      }
    }
    return { categorized: categorizedResult, matchIds: matches, filtering: filteringActive };
  }, [list, areaFilter, statusFilter, search]);

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

  const { nodes, edges, signature } = useMemo(() => {
    const { orphanIds } = categorized;
    const index = new Map(list.map((p) => [p.id, p]));

    const matchesFilter = (p: OrganizationPosition) => {
      if (areaFilter !== "all") {
        if (areaFilter === EMPTY_AREA_TOKEN) {
          if ((p.area ?? "").trim()) return false;
        } else if ((p.area ?? "").trim() !== areaFilter) {
          return false;
        }
      }
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      return true;
    };

    const inTree = list.filter((p) => !orphanIds.has(p.id));
    const visibleSet = new Set(
      (filtering ? inTree.filter(matchesFilter) : inTree).map((p) => p.id),
    );

    // Pai visual: superior real ou, quando filtrado, ancestral visível mais próximo.
    const parentOf = (p: OrganizationPosition): string | null => {
      if (!filtering) return p.superiorId && visibleSet.has(p.superiorId) ? p.superiorId : null;
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

    const searching = matchIds.size > 0 || search.trim().length > 0;

    const flowNodes: PositionFlowNode[] = visible.map((p) => ({
      id: p.id,
      type: "position",
      position: { x: 0, y: 0 },
      data: {
        position: p,
        childrenCount: childCounts.get(p.id) ?? 0,
        collapsed: collapsed.has(p.id),
        highlighted: matchIds.has(p.id),
        dimmed: searching && matchIds.size > 0 && !matchIds.has(p.id),
        onToggle: toggleCollapse,
        onEdit,
        onMarkVacant,
        onDeactivate,
      },
    }));

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

    // Layout com dagre.
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "TB", nodesep: 42, ranksep: 96, marginx: 24, marginy: 24 });
    g.setDefaultEdgeLabel(() => ({}));
    for (const node of flowNodes) g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    for (const edge of flowEdges) g.setEdge(edge.source, edge.target);
    dagre.layout(g);

    for (const node of flowNodes) {
      const laidOut = g.node(node.id);
      node.position = { x: laidOut.x - NODE_WIDTH / 2, y: laidOut.y - NODE_HEIGHT / 2 };
    }

    const sig = `${flowNodes.length}:${flowEdges.length}:${areaFilter}:${statusFilter}:${Array.from(collapsed).join(",")}`;
    return { nodes: flowNodes, edges: flowEdges, signature: sig };
  }, [categorized, list, filtering, areaFilter, statusFilter, collapsed, matchIds, search, toggleCollapse, onEdit, onMarkVacant, onDeactivate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      reactFlow.fitView({ padding: 0.15, duration: 250, maxZoom: 1 });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [signature, reactFlow]);

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

  return (
    <div className="flex flex-col gap-3">
      {/* Barra de ferramentas */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
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
            onClick={() => reactFlow.fitView({ padding: 0.15, duration: 250 })}
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
          <Button size="sm" onClick={onCreate}>
            <Plus className="h-4 w-4" />
            Novo cargo
          </Button>
        </div>
      </div>

      {/* Área do gráfico */}
      <div
        ref={fullscreenRef}
        className="h-[68vh] min-h-[420px] overflow-hidden rounded-lg border bg-card"
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
              <span className="inline-block h-0 w-7 border-t-2 border-dashed border-chart-2" />
              Ligação funcional
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0 w-7 border-t-2 border-dotted border-muted-foreground" />
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
