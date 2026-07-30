import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Rota curinga: qualquer endereço desconhecido volta para a visão geral
 * (o layout autenticado redireciona para /login quando não há sessão).
 */
export const Route = createFileRoute("/$")({
  beforeLoad: () => {
    throw redirect({ to: "/visao-geral", replace: true });
  },
  component: () => null,
});
