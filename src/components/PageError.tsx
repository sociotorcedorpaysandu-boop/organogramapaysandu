import { Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * ErrorBoundary visual das páginas internas. Nunca exibe detalhes técnicos.
 */
export function PageError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  console.error(error);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-foreground">
        Não foi possível carregar esta área.
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Ocorreu um problema inesperado ao exibir este conteúdo. Tente novamente ou volte para a
        visão geral.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Tentar novamente
        </Button>
        <Button variant="outline" asChild>
          <Link to="/visao-geral">Voltar para a visão geral</Link>
        </Button>
      </div>
    </div>
  );
}
