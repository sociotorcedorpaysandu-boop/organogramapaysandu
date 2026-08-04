/** Paleta e validação da cor opcional de identificação do cargo. */

export interface PositionColorOption {
  label: string;
  value: string; // hex; "" = sem cor personalizada
}

export const POSITION_COLOR_PALETTE: PositionColorOption[] = [
  { label: "Sem cor", value: "" },
  { label: "Azul-celeste", value: "#38bdf8" },
  { label: "Azul médio", value: "#2563eb" },
  { label: "Verde", value: "#16a34a" },
  { label: "Amarelo", value: "#eab308" },
  { label: "Laranja", value: "#f97316" },
  { label: "Roxo", value: "#7c3aed" },
  { label: "Cinza", value: "#64748b" },
];

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(value: string): boolean {
  return HEX_PATTERN.test(value.trim());
}

/** Normaliza a cor informada: vazio ou hex válido em minúsculas; null se inválida. */
export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!isValidHexColor(trimmed)) return null;
  return trimmed.toLowerCase();
}
