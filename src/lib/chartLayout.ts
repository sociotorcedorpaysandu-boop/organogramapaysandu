import type { ChildrenLayout, OrganizationPosition } from "@/types/organization";

/**
 * Layout hierárquico do organograma.
 *
 * A profundidade visual de cada cargo vem exclusivamente da cadeia de
 * superiores (nunca da ordem das linhas da planilha). Todos os cargos com
 * o mesmo superior são irmãos e ficam no mesmo nível, distribuídos
 * horizontalmente; quando há muitos subordinados, eles quebram em linhas
 * organizadas sem alterar a hierarquia real.
 *
 * Disposição dos subordinados (por responsável):
 * - horizontal (manual): todos os irmãos lado a lado em uma única linha, sem
 *   quebra automática — o canvas amplia horizontalmente (zoom e rolagem);
 * - horizontal (automático): irmãos lado a lado, com quebra em linhas
 *   organizadas quando a largura supera MAX_ROW_WIDTH;
 * - vertical: irmãos em uma lista vertical contínua, todos ligados diretamente
 *   ao mesmo responsável (nunca um ao outro).
 * A escolha pode ser manual (cargo a cargo) ou automática pela quantidade de
 * subordinados diretos — ver DEFAULT_VERTICAL_THRESHOLD.
 */

const H_GAP = 44; // espaço horizontal entre cartões/subárvores
const V_GAP = 96; // espaço vertical entre níveis
const ROW_GAP = 64; // espaço vertical entre linhas de uma mesma geração
const ROOT_GAP = 80; // espaço entre raízes (árvores distintas)
const MAX_ROW_WIDTH = 1560; // largura máxima de linha (somente modo automático)
const VLIST_INDENT = 48; // deslocamento da lista vertical à direita do tronco do responsável
const VLIST_GAP = 20; // espaço vertical compacto entre itens da lista vertical

/**
 * Quantidade de subordinados diretos a partir da qual o modo automático
 * passa a exibir a lista vertical. Configurável apenas aqui.
 */
export const DEFAULT_VERTICAL_THRESHOLD = 5;

/**
 * Resolve a disposição efetiva dos subordinados de um responsável.
 * A escolha manual (horizontal/vertical) sempre prevalece sobre a automática.
 */
export function resolveChildrenLayout(
  configuredLayout: ChildrenLayout | undefined,
  childrenCount: number,
): "horizontal" | "vertical" {
  if (configuredLayout === "horizontal") return "horizontal";
  if (configuredLayout === "vertical") return "vertical";
  return childrenCount >= DEFAULT_VERTICAL_THRESHOLD ? "vertical" : "horizontal";
}

export function childrenLayoutLabel(layout: ChildrenLayout | undefined): string {
  if (layout === "horizontal") return "Horizontal";
  if (layout === "vertical") return "Vertical";
  return "Automático";
}

interface Block {
  width: number;
  height: number;
}

interface RowInfo {
  kids: OrganizationPosition[];
  width: number;
  height: number;
}

/**
 * Calcula a posição (x, y) de cada cargo visível.
 * `parentOf` deve retornar o pai visual (superior real ou ancestral visível).
 */
export function layoutHierarchy(
  visible: OrganizationPosition[],
  parentOf: (position: OrganizationPosition) => string | null,
  nodeWidth: number,
  nodeHeight: number,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const visibleIds = new Set(visible.map((p) => p.id));
  const byId = new Map(visible.map((p) => [p.id, p]));

  const children = new Map<string, OrganizationPosition[]>();
  const roots: OrganizationPosition[] = [];
  for (const position of visible) {
    const parent = parentOf(position);
    if (parent && visibleIds.has(parent)) {
      const list = children.get(parent) ?? [];
      list.push(position);
      children.set(parent, list);
    } else {
      roots.push(position);
    }
  }
  for (const list of children.values()) {
    list.sort((a, b) => a.displayOrder - b.displayOrder);
  }
  roots.sort((a, b) => a.displayOrder - b.displayOrder);

  const blockCache = new Map<string, Block>();
  const rowsCache = new Map<string, RowInfo[]>();
  const verticalCache = new Map<string, boolean>();

  /** O responsável exibe seus subordinados em lista vertical? */
  function isVertical(id: string): boolean {
    const cached = verticalCache.get(id);
    if (cached !== undefined) return cached;
    const kids = children.get(id) ?? [];
    const result =
      kids.length > 0 &&
      resolveChildrenLayout(byId.get(id)?.childrenLayout, kids.length) === "vertical";
    verticalCache.set(id, result);
    return result;
  }

  function rowsOf(id: string): RowInfo[] {
    const cached = rowsCache.get(id);
    if (cached) return cached;

    const kids = children.get(id) ?? [];

    // Lista vertical: cada subordinado ocupa sua própria linha (coluna única).
    if (isVertical(id)) {
      const rows = kids.map((kid) => {
        const block = blockOf(kid.id);
        return { kids: [kid], width: block.width, height: block.height };
      });
      rowsCache.set(id, rows);
      return rows;
    }

    // Horizontal manual: linha única com todos os subordinados, sem quebra
    // por largura — o canvas amplia horizontalmente.
    if (byId.get(id)?.childrenLayout === "horizontal") {
      if (kids.length === 0) {
        rowsCache.set(id, []);
        return [];
      }
      const width =
        kids.reduce((sum, kid) => sum + blockOf(kid.id).width, 0) + H_GAP * (kids.length - 1);
      const height = Math.max(...kids.map((kid) => blockOf(kid.id).height));
      const rows = [{ kids, width, height }];
      rowsCache.set(id, rows);
      return rows;
    }

    const rows: RowInfo[] = [];
    let current: OrganizationPosition[] = [];
    let currentWidth = 0;
    let currentHeight = 0;

    const flush = () => {
      if (current.length === 0) return;
      rows.push({ kids: current, width: currentWidth, height: currentHeight });
      current = [];
      currentWidth = 0;
      currentHeight = 0;
    };

    for (const kid of kids) {
      const block = blockOf(kid.id);
      const added = current.length === 0 ? block.width : currentWidth + H_GAP + block.width;
      if (current.length > 0 && added > MAX_ROW_WIDTH) flush();
      current.push(kid);
      currentWidth = current.length === 1 ? block.width : currentWidth + H_GAP + block.width;
      currentHeight = Math.max(currentHeight, block.height);
    }
    flush();

    rowsCache.set(id, rows);
    return rows;
  }

  function blockOf(id: string): Block {
    const cached = blockCache.get(id);
    if (cached) return cached;

    const rows = rowsOf(id);
    let block: Block;
    if (rows.length === 0) {
      block = { width: nodeWidth, height: nodeHeight };
    } else if (isVertical(id)) {
      // Coluna única à direita do tronco: largura = meio cartão + recuo + maior filho.
      const childMaxWidth = Math.max(...rows.map((row) => row.width));
      const childrenHeight =
        rows.reduce((sum, row) => sum + row.height, 0) + VLIST_GAP * (rows.length - 1);
      block = {
        width: Math.max(nodeWidth, nodeWidth / 2 + VLIST_INDENT + childMaxWidth),
        height: nodeHeight + V_GAP + childrenHeight,
      };
    } else {
      const childrenWidth = Math.max(...rows.map((row) => row.width));
      const childrenHeight =
        rows.reduce((sum, row) => sum + row.height, 0) + ROW_GAP * (rows.length - 1);
      block = {
        width: Math.max(nodeWidth, childrenWidth),
        height: nodeHeight + V_GAP + childrenHeight,
      };
    }
    blockCache.set(id, block);
    return block;
  }

  function assign(id: string, centerX: number, top: number): void {
    positions.set(id, { x: centerX - nodeWidth / 2, y: top });
    const rows = rowsOf(id);
    if (rows.length === 0) return;

    if (isVertical(id)) {
      // Tronco vertical contínuo sob o responsável; a coluna de subordinados
      // fica recuada à direita para que cada derivação saia do mesmo tronco.
      let rowTop = top + nodeHeight + V_GAP;
      for (const row of rows) {
        const kid = row.kids[0];
        const block = blockOf(kid.id);
        assign(kid.id, centerX + VLIST_INDENT + block.width / 2, rowTop);
        rowTop += row.height + VLIST_GAP;
      }
      return;
    }

    let rowTop = top + nodeHeight + V_GAP;
    for (const row of rows) {
      let cursor = centerX - row.width / 2;
      for (const kid of row.kids) {
        const block = blockOf(kid.id);
        assign(kid.id, cursor + block.width / 2, rowTop);
        cursor += block.width + H_GAP;
      }
      rowTop += row.height + ROW_GAP;
    }
  }

  let rootCursor = 0;
  for (const root of roots) {
    const block = blockOf(root.id);
    assign(root.id, rootCursor + block.width / 2, 0);
    rootCursor += block.width + ROOT_GAP;
  }

  return positions;
}
