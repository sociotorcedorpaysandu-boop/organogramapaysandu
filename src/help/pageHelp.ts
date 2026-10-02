export interface TourStep {
  /** CSS selector, or button text via `text:` prefix. */
  target: string;
  title: string;
  content: string;
}

export interface PageHelp {
  path: string;
  tips: string[];
  tour: TourStep[];
}

export const PAGE_HELP: PageHelp[] = [
  {
    path: "/visao-geral",
    tips: [
      "Os indicadores são calculados a partir da base atual.",
      "“Situação do organograma” mostra vagas e inconsistências.",
      "Use “Ver histórico completo” para auditar alterações.",
      "A busca global no topo leva a Pessoas e cargos.",
    ],
    tour: [
      { target: "main .grid", title: "Indicadores", content: "Resumo de posições, vagas, áreas e tipos." },
      { target: "text:Abrir organograma", title: "Organograma", content: "Abre a estrutura visual." },
      { target: "text:Ver quantitativos", title: "Quantitativos", content: "Números detalhados por tipo, cargo e área." },
      { target: 'input[aria-label="Busca global"]', title: "Busca global", content: "Procure uma pessoa ou cargo de qualquer tela." },
    ],
  },
  {
    path: "/organograma",
    tips: [
      "Clique em um cartão para editar.",
      "Combine filtros de área, cargo, nível hierárquico e tipos.",
      "Cores: laranja = PCD, verde = Voluntário, preto = Diretoria.",
      "Horizontal: subordinados lado a lado. Vertical: em coluna.",
      "Automático: vertical a partir de 5 subordinados.",
      "O modo Somente cargo é útil para impressão institucional.",
    ],
    tour: [
      { target: 'input[aria-label="Buscar no organograma"]', title: "Busca", content: "Encontre pessoas ou cargos." },
      { target: '[aria-label="Filtrar por área"]', title: "Filtro por área", content: "Mostre apenas uma área." },
      { target: '[aria-label="Filtrar por cargo"]', title: "Filtro por cargo", content: "Mostre apenas um cargo específico." },
      { target: '[aria-label="Filtrar por nível hierárquico"]', title: "Nível hierárquico", content: "Presidência, Diretoria, Gerência, Coordenação e outros." },
      { target: '[aria-label="Filtrar por tipo de colaborador"]', title: "Tipos", content: "Destaque ou filtre PCD, voluntários e outros." },
      { target: '[aria-label="Modo de visualização dos cartões"]', title: "Modo de exibição", content: "Cargo + Nome, Somente cargo ou Somente nome." },
      { target: ".react-flow__node", title: "Cartões", content: "Clique para editar. Faixa laranja = PCD, verde = Voluntário, preto = Diretoria. O layout Automático/Horizontal/Vertical é definido na edição do responsável." },
      { target: '[aria-label="Imprimir organograma"]', title: "Imprimir", content: "Gera a versão para impressão em paisagem." },
    ],
  },
  {
    path: "/pessoas-cargos",
    tips: [
      "Use a busca para encontrar nome, cargo ou superior.",
      "Combine filtros de área, status e tipo.",
      "Na edição, marque os tipos do colaborador (ex.: PCD).",
      "Antes de excluir um cargo com subordinados, escolha o destino deles.",
    ],
    tour: [
      { target: 'input[aria-label="Buscar registros"]', title: "Busca", content: "Procure por nome, cargo ou superior." },
      { target: '[aria-label="Filtrar por área"]', title: "Filtros", content: "Refine por área, status e tipo." },
      { target: "text:Novo cargo", title: "Novo cargo", content: "Cadastre uma nova posição." },
      { target: "main table", title: "Tabela", content: "Use as ações da linha para editar, vagar ou excluir." },
    ],
  },
  {
    path: "/tipos-colaboradores",
    tips: [
      "Os tipos classificam o ocupante atual do cargo.",
      "Cada tipo tem nome, cor e ícone próprios.",
      "Nomes repetidos são bloqueados.",
      "Tipos inativos deixam de aparecer nos cadastros.",
    ],
    tour: [
      { target: "text:Novo tipo", title: "Novo tipo", content: "Crie um tipo com nome, cor e ícone." },
      { target: "main table", title: "Lista de tipos", content: "Edite, ative ou desative tipos existentes." },
    ],
  },
  {
    path: "/quantitativos",
    tips: [
      "Indicadores “Base completa” ignoram os filtros.",
      "Os demais respeitam o recorte filtrado.",
      "Exporte para Excel ou CSV, ou imprima.",
    ],
    tour: [
      { target: '[aria-label="Filtrar por área"]', title: "Filtros", content: "Defina o recorte por área, cargo, status e tipo." },
      { target: "text:Excel", title: "Exportar", content: "Baixe os números em Excel ou CSV." },
      { target: "text:Imprimir", title: "Imprimir", content: "Imprima o relatório atual." },
    ],
  },
  {
    path: "/importar-exportar",
    tips: [
      "Confira o relatório de validação antes de confirmar.",
      "Um backup é criado antes de cada importação.",
      "Exporte em Excel, CSV ou JSON.",
    ],
    tour: [
      { target: 'main input[type="file"], text:Selecionar', title: "Importar", content: "Selecione a planilha para validar." },
      { target: "text:Exportar Excel", title: "Exportar", content: "Baixe a base em Excel, CSV ou JSON." },
    ],
  },
];

export function getPageHelp(pathname: string): PageHelp | undefined {
  return PAGE_HELP.find((p) => pathname.startsWith(p.path));
}
