/** Classificação do nível hierárquico e cor automática de identificação do cartão. */

function normalize(value: string): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export const HIERARCHY_LEVELS = [
  "Presidência",
  "Vice-presidência",
  "Diretoria",
  "Gerência",
  "Coordenação",
  "Supervisão",
  "Assessoria",
  "Operacional",
  "Outros",
] as const;

export type HierarchyLevel = (typeof HIERARCHY_LEVELS)[number];

const OPERATIONAL = /\b(auxiliar|assistente|analista|tecnico|operador|atendente|recepcionista|motorista|porteiro|vigia|zelador|servicos|estagiario|agente|secretari|massagista|roupeiro|cozinheir|jardineir|eletricista|encarregad|mecanico|aprendiz)/;

export function hierarchyLevelOf(title: string): HierarchyLevel {
  const t = normalize(title);
  if (!t) return "Outros";
  if (/vice[- ]?president/.test(t)) return "Vice-presidência";
  if (/president/.test(t)) return "Presidência";
  if (/diretor|diretoria/.test(t)) return "Diretoria";
  if (/gerente|gerencia/.test(t)) return "Gerência";
  if (/coordenador|coordenacao/.test(t)) return "Coordenação";
  if (/supervisor|supervisao/.test(t)) return "Supervisão";
  if (/assessor|assessoria/.test(t)) return "Assessoria";
  if (OPERATIONAL.test(t)) return "Operacional";
  return "Outros";
}

export const AUTO_COLORS = {
  pcd: "#f97316",
  volunteer: "#16a34a",
  director: "#111111",
} as const;

/**
 * Cor da faixa do cartão: PCD > Voluntário > Diretoria > cor configurada.
 * Retorna "" quando não há cor (padrão atual).
 */
export function cardAccentColor(
  positionTitle: string,
  typeNames: string[],
  configuredColor: string,
): string {
  const names = typeNames.map(normalize);
  if (names.some((n) => n === "pcd" || n.includes("pcd") || n.includes("deficiencia"))) return AUTO_COLORS.pcd;
  if (names.some((n) => n.startsWith("voluntari"))) return AUTO_COLORS.volunteer;
  if (/diretor|diretoria/.test(normalize(positionTitle))) return AUTO_COLORS.director;
  return (configuredColor ?? "").trim();
}
