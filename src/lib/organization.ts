import type { ConnectionType, OrganizationPosition, PositionStatus } from "@/types/organization";

export const MAX_HIERARCHY_DEPTH = 1000;

export function safePositions(value: unknown): OrganizationPosition[] {
  return Array.isArray(value) ? (value as OrganizationPosition[]) : [];
}

export function buildPositionIndex(
  positions: OrganizationPosition[],
): Map<string, OrganizationPosition> {
  const index = new Map<string, OrganizationPosition>();
  for (const position of safePositions(positions)) {
    if (position && typeof position.id === "string") index.set(position.id, position);
  }
  return index;
}

/**
 * Retorna true se definir `candidateSuperiorId` como superior de `positionId`
 * criaria um ciclo na hierarquia (inclui selecionar a si mesmo ou um subordinado).
 */
export function hasCycle(
  positionId: string,
  candidateSuperiorId: string | null,
  positions: OrganizationPosition[],
): boolean {
  if (!candidateSuperiorId) return false;
  if (candidateSuperiorId === positionId) return true;
  const index = buildPositionIndex(positions);
  const seen = new Set<string>();
  let current: string | null = candidateSuperiorId;
  let steps = 0;
  while (current && steps < MAX_HIERARCHY_DEPTH) {
    if (current === positionId) return true;
    if (seen.has(current)) return false; // ciclo pré-existente em outra cadeia; interrompe
    seen.add(current);
    current = index.get(current)?.superiorId ?? null;
    steps += 1;
  }
  return false;
}

export function getDescendantIds(
  positionId: string,
  positions: OrganizationPosition[],
): Set<string> {
  const children = new Map<string, string[]>();
  for (const position of safePositions(positions)) {
    if (!position.superiorId) continue;
    const list = children.get(position.superiorId) ?? [];
    list.push(position.id);
    children.set(position.superiorId, list);
  }
  const descendants = new Set<string>();
  const queue = [positionId];
  let steps = 0;
  while (queue.length > 0 && steps < MAX_HIERARCHY_DEPTH * 4) {
    const current = queue.shift()!;
    steps += 1;
    for (const child of children.get(current) ?? []) {
      if (descendants.has(child)) continue;
      descendants.add(child);
      queue.push(child);
    }
  }
  return descendants;
}

export interface CategorizedPositions {
  /** Registros válidos que participam da árvore (raízes = sem superior). */
  roots: OrganizationPosition[];
  /** Registros cujo superior aponta para ID inexistente ou cuja cadeia contém ciclo. */
  orphans: OrganizationPosition[];
  orphanIds: Set<string>;
}

export function categorizePositions(positions: OrganizationPosition[]): CategorizedPositions {
  const list = safePositions(positions);
  const index = buildPositionIndex(list);
  const roots: OrganizationPosition[] = [];
  const orphans: OrganizationPosition[] = [];
  const orphanIds = new Set<string>();

  for (const position of list) {
    if (!position.superiorId) {
      roots.push(position);
      continue;
    }
    if (!index.has(position.superiorId)) {
      orphans.push(position);
      orphanIds.add(position.id);
      continue;
    }
    // Detecta cadeia cíclica já existente nos dados
    const seen = new Set<string>([position.id]);
    let current: string | null = position.superiorId;
    let steps = 0;
    let cyclic = false;
    while (current && steps < MAX_HIERARCHY_DEPTH) {
      if (seen.has(current)) {
        cyclic = true;
        break;
      }
      seen.add(current);
      current = index.get(current)?.superiorId ?? null;
      steps += 1;
    }
    if (cyclic) {
      orphans.push(position);
      orphanIds.add(position.id);
    }
  }

  roots.sort((a, b) => a.displayOrder - b.displayOrder);
  orphans.sort((a, b) => a.displayOrder - b.displayOrder);
  return { roots, orphans, orphanIds };
}

export interface OrganizationStats {
  total: number;
  occupied: number;
  vacant: number;
  inactive: number;
  areas: number;
  withoutSuperior: number;
  functional: number;
  direct: number;
  undefinedConnection: number;
  inconsistencies: number;
  orphans: number;
}

export function computeStats(positions: OrganizationPosition[]): OrganizationStats {
  const list = safePositions(positions);
  const areas = new Set<string>();
  let occupied = 0;
  let vacant = 0;
  let inactive = 0;
  let withoutSuperior = 0;
  let functional = 0;
  let direct = 0;
  let undefinedConnection = 0;
  let inconsistencies = 0;

  for (const position of list) {
    if (position.status === "occupied") occupied += 1;
    else if (position.status === "vacant") vacant += 1;
    else if (position.status === "inactive") inactive += 1;

    const area = (position.area ?? "").trim();
    if (area) areas.add(area.toUpperCase());

    if (!position.superiorId) withoutSuperior += 1;
    if (position.connectionType === "functional") functional += 1;
    else if (position.connectionType === "direct") direct += 1;
    else undefinedConnection += 1;

    if (!(position.positionTitle ?? "").trim() || !area) inconsistencies += 1;
  }

  const { orphans } = categorizePositions(list);

  return {
    total: list.length,
    occupied,
    vacant,
    inactive,
    areas: areas.size,
    withoutSuperior,
    functional,
    direct,
    undefinedConnection,
    inconsistencies,
    orphans: orphans.length,
  };
}

export function listAreas(positions: OrganizationPosition[]): string[] {
  const areas = new Set<string>();
  for (const position of safePositions(positions)) {
    const area = (position.area ?? "").trim();
    if (area) areas.add(area);
  }
  return Array.from(areas).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function connectionTypeLabel(type: ConnectionType): string {
  if (type === "direct") return "Direta";
  if (type === "functional") return "Funcional";
  return "Indefinida";
}

export function statusLabel(status: PositionStatus): string {
  if (status === "occupied") return "Ocupado";
  if (status === "vacant") return "Vago";
  return "Inativo";
}

export function positionDisplayName(position: OrganizationPosition): string {
  const title = (position.positionTitle ?? "").trim() || "Cargo não definido";
  const person = (position.personName ?? "").trim();
  return person ? `${title} — ${person}` : title;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function newPositionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `pos-${crypto.randomUUID()}`;
  }
  return `pos-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export function newChangeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `log-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}
