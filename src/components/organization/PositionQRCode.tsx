import { Check, Copy, Download, Printer } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { OrganizationPosition } from "@/types/organization";

/** URL absoluta da ficha individual do colaborador (usada no QR Code). */
export function profileUrl(positionId: string): string {
  return `${window.location.origin}/colaborador/${positionId}`;
}

interface PositionQRCodeProps {
  position: OrganizationPosition;
  size?: number;
}

/**
 * QR Code que aponta para a página individual do colaborador.
 * Não incorpora a foto — apenas a URL da ficha.
 */
export function PositionQRCode({ position, size = 168 }: PositionQRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const url = profileUrl(position.id);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, {
      width: 512,
      margin: 1,
      color: { dark: "#1f2937", light: "#ffffff" },
    })
      .then((output) => {
        if (active) setDataUrl(output);
      })
      .catch(() => {
        if (active) setDataUrl(null);
      });
    return () => {
      active = false;
    };
  }, [url]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  function downloadPng() {
    if (!dataUrl) return;
    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = `qrcode-${position.legacyId || position.id}.png`;
    anchor.click();
  }

  function printQr() {
    if (!dataUrl) return;
    const win = window.open("", "_blank", "width=420,height=600");
    if (!win) {
      toast.error("O navegador bloqueou a janela de impressão. Permita pop-ups e tente novamente.");
      return;
    }
    const name = position.personName?.trim() || position.positionTitle || "Colaborador";
    win.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>QR Code — ${name}</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 32px; color: #111827; }
    img { width: 240px; height: 240px; }
    h1 { font-size: 18px; margin: 16px 0 4px; }
    p { font-size: 13px; color: #6b7280; margin: 2px 0; word-break: break-all; }
  </style>
</head>
<body>
  <img src="${dataUrl}" alt="QR Code" />
  <h1>${name}</h1>
  <p>${position.positionTitle || ""}</p>
  <p>${url}</p>
</body>
</html>`);
    win.document.close();
    win.focus();
    win.setTimeout(() => win.print(), 250);
  }

  if (!dataUrl) {
    return (
      <div
        className="flex items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground"
        style={{ width: size, height: size }}
      >
        Gerando QR Code…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="inline-block rounded-lg border bg-card p-2">
        <img
          src={dataUrl}
          alt={`QR Code do perfil de ${position.personName || position.positionTitle}`}
          style={{ width: size, height: size }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={copyLink}>
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado" : "Copiar link"}
        </Button>
        <Button variant="outline" size="sm" onClick={printQr}>
          <Printer className="h-4 w-4" />
          Imprimir QR Code
        </Button>
        <Button variant="outline" size="sm" onClick={downloadPng}>
          <Download className="h-4 w-4" />
          Baixar PNG
        </Button>
      </div>
    </div>
  );
}
