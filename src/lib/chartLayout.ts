import type { OrganizationPosition } from "@/types/organization";

/**
 * Layout hierárquico do organograma.
 *
 * A profundidade visual de cada cargo vem exclusivamente da cadeia de
 * superiores (nunca da ordem das linhas da planilha). Todos os cargos com
 * o mesmo superior são irmãos e ficam no mesmo nível, distribuídos
 * horizontalmente; quando há muitos subordinados, eles quebram em linhas
 * organizadas sem alterar a hierarquia real.
 */

const H_GAP = 44; // espaço horizontal entre cartões/subárvores
const V_GAP = 96; // espaço vertical entre níveis
const ROW_GAP = 64; // espaço vertical entre linhas de uma mesma geração
const ROOT_GAP = 80; // espaço entre raízes (árvores distintas)
const MAX_ROW_WIDTH = 1560; // largura máxima de uma linha de subordinados

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

  function rowsOf(id: string): RowInfo[] {
    const cached = rowsCache.get(id);
    if (cached) return cached;

    const kids = children.get(id) ?? [];
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
    let rowTop = top + nodeHeight + V_GAP;
    for (const row of rowsOf(id)) {
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
