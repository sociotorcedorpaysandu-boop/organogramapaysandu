import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowDownUp,
  BarChart3,
  Building2,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Search,
  Tags,
  Users,
} from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";

import escudoAsset from "@/assets/escudo-paysandu.png.asset.json";
import { useOrganization } from "@/components/organization/OrganizationProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { formatDateTime } from "@/lib/organization";
import { clearSession, getSession } from "@/services/organizationStorageService";

const NAV_ITEMS = [
  { to: "/visao-geral", label: "Visão geral", icon: LayoutDashboard },
  { to: "/organograma", label: "Organograma", icon: Network },
  { to: "/pessoas-cargos", label: "Pessoas e cargos", icon: Users },
  { to: "/tipos-colaboradores", label: "Tipos de colaboradores", icon: Tags },
  { to: "/areas", label: "Áreas", icon: Building2 },
  { to: "/quantitativos", label: "Quantitativos", icon: BarChart3 },
  { to: "/importar-exportar", label: "Importar e exportar", icon: ArrowDownUp },
  { to: "/historico", label: "Histórico", icon: History },
] as const;

const PAGE_TITLES: Array<[string, string]> = [
  ["/visao-geral", "Visão geral"],
  ["/organograma", "Organograma"],
  ["/pessoas-cargos", "Pessoas e cargos"],
  ["/tipos-colaboradores", "Tipos de colaboradores"],
  ["/areas", "Áreas"],
  ["/quantitativos", "Quantitativos"],
  ["/importar-exportar", "Importar e exportar dados"],
  ["/historico", "Histórico de alterações"],
];

function pageTitle(pathname: string): string {
  const match = PAGE_TITLES.find(([path]) => pathname.startsWith(path));
  return match ? match[1] : "Organograma Institucional";
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();

  function handleLogout() {
    clearSession();
    onNavigate?.();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <img
          src={escudoAsset.url}
          alt="Escudo do Paysandu Sport Club"
          className="h-11 w-11 object-contain"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-wide">
            Organograma Institucional
          </p>
          <p className="truncate text-xs text-sidebar-foreground/70">Paysandu Sport Club</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            activeProps={{
              className:
                "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border-l-2 border-sidebar-primary",
            }}
            inactiveProps={{
              className:
                "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground border-l-2 border-transparent",
            }}
            activeOptions={{ exact: false }}
            className="flex items-center gap-3 rounded-r-md px-3 py-2.5 text-sm transition-colors"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair
        </button>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { lastUpdated } = useOrganization();
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const session = useMemo(() => getSession(), []);
  const title = pageTitle(pathname);

  function handleGlobalSearch(event: FormEvent) {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    navigate({ to: "/pessoas-cargos", search: { q: query } });
  }

  const initials = (session?.name ?? "A")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar fixa (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 no-print hidden w-64 lg:block">
        <SidebarContent />
      </aside>

      <div className="flex min-h-screen flex-col print:pl-0 lg:pl-64">
        <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SidebarContent onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>

            <div className="ml-auto flex items-center gap-4">
              <form onSubmit={handleGlobalSearch} className="relative hidden md:block">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Busca global: pessoa ou cargo…"
                  className="w-64 pl-8"
                  aria-label="Busca global"
                />
              </form>

              <div className="hidden text-right text-xs text-muted-foreground xl:block">
                <p className="font-medium text-foreground/80">Última atualização</p>
                <p>{formatDateTime(lastUpdated)}</p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                    aria-label="Menu do usuário"
                  >
                    {initials}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="text-sm font-semibold">{session?.name ?? "Administrador"}</p>
                    <p className="text-xs font-normal text-muted-foreground">
                      {session?.email ?? ""}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      clearSession();
                      navigate({ to: "/login", replace: true });
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
