/**
 * Tratamento de foto do colaborador para armazenamento local (MVP).
 * Redimensiona e comprime a imagem antes de salvar como data URL no
 * localStorage, evitando estourar a cota do navegador.
 */

export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_INPUT_BYTES = 8 * 1024 * 1024; // 8 MB de entrada
const MAX_OUTPUT_CHARS = 420 * 1024; // ~315 KB em Base64 (~420 mil chars)
const MAX_DIMENSION = 320;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Arquivo de imagem inválido."));
    image.src = src;
  });
}

/**
 * Converte o arquivo selecionado em uma data URL JPEG comprimida.
 * Lança Error com mensagem amigável quando o arquivo não pode ser usado.
 */
export async function fileToPhotoDataUrl(file: File): Promise<string> {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
    throw new Error("Formato não suportado. Utilize uma imagem JPG, PNG ou WebP.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("A imagem é muito grande. Selecione um arquivo de até 8 MB.");
  }

  const original = await readAsDataUrl(file);
  const image = await loadImage(original);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível processar a imagem neste navegador.");
  // Fundo branco para fotos PNG/WebP com transparência.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let quality = 0.85;
  let output = canvas.toDataURL("image/jpeg", quality);
  while (output.length > MAX_OUTPUT_CHARS && quality > 0.35) {
    quality -= 0.15;
    output = canvas.toDataURL("image/jpeg", quality);
  }
  if (output.length > MAX_OUTPUT_CHARS) {
    throw new Error("Não foi possível comprimir a imagem o suficiente. Tente uma foto menor.");
  }
  return output;
}

/** Iniciais para o avatar quando não há foto (ex.: "Maria Silva" → "MS"). */
export function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
