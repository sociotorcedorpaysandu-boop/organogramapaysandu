import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, LockKeyhole } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import escudoAsset from "@/assets/escudo-paysandu.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSession, saveSession } from "@/services/organizationStorageService";

const DEMO_EMAIL = "admin@paysandu.com.br";
const DEMO_PASSWORD = "123456";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Organograma Institucional Paysandu" },
      {
        name: "description",
        content: "Acesso ao sistema de gestão do organograma institucional do Paysandu Sport Club.",
      },
      { property: "og:title", content: "Entrar — Organograma Institucional Paysandu" },
      {
        property: "og:description",
        content: "Acesso ao sistema de gestão do organograma institucional do Paysandu Sport Club.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (getSession()) {
      navigate({ to: "/visao-geral", replace: true });
    }
  }, [navigate]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const valid = email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;
    window.setTimeout(() => {
      setIsSubmitting(false);
      if (!valid) {
        setError("E-mail ou senha inválidos. Verifique as credenciais e tente novamente.");
        return;
      }
      saveSession({
        email: DEMO_EMAIL,
        name: "Administrador",
        loggedAt: new Date().toISOString(),
      });
      navigate({ to: "/visao-geral" });
    }, 350);
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Painel institucional */}
      <aside className="hidden w-1/2 flex-col justify-between bg-sidebar px-12 py-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <img
            src={escudoAsset.url}
            alt="Escudo do Paysandu Sport Club"
            className="h-14 w-14 object-contain"
          />
          <div>
            <p className="text-lg font-bold tracking-wide">Paysandu Sport Club</p>
            <p className="text-sm text-sidebar-foreground/70">Desde 1914</p>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight">
            Organograma Institucional
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-sidebar-foreground/75">
            Gestão da estrutura hierárquica do clube: pessoas, cargos, áreas e vínculos
            administrativos em um único painel.
          </p>
        </div>

        <p className="text-xs text-sidebar-foreground/50">
          Uso interno • Administração Paysandu Sport Club
        </p>
      </aside>

      {/* Formulário */}
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <img
              src={escudoAsset.url}
              alt="Escudo do Paysandu Sport Club"
              className="h-16 w-16 object-contain"
            />
            <p className="mt-3 text-base font-bold text-foreground">Paysandu Sport Club</p>
          </div>

          <div className="rounded-xl border bg-card p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Organograma Institucional
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Entre com suas credenciais para acessar o painel.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email">E-mail</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="seu.email@paysandu.com.br"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="login-password">Senha</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••"
                  required
                />
              </div>

              {error ? (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </p>
              ) : null}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LockKeyhole className="h-4 w-4" />
                )}
                Entrar
              </Button>
            </form>

            <div className="mt-6 rounded-md border border-dashed bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground/80">Credenciais demonstrativas</p>
              <p className="mt-1">E-mail: {DEMO_EMAIL}</p>
              <p>Senha: {DEMO_PASSWORD}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
