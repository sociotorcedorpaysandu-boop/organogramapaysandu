export interface HelpArticle {
  id: string;
  title: string;
  keywords: string[];
  questions: string[];
  answer: string;
  route?: string;
  actionLabel?: string;
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "cadastrar-cargo",
    title: "Como cadastrar um cargo?",
    keywords: ["novo", "criar", "cargo", "posição", "adicionar"],
    questions: ["adicionar cargo", "criar posição", "novo cargo"],
    answer:
      "Em Pessoas e cargos (ou no Organograma), clique em “Novo cargo”, preencha cargo, área e superior e salve.",
    route: "/pessoas-cargos",
    actionLabel: "Ir para Pessoas e cargos",
  },
  {
    id: "alterar-superior",
    title: "Como alterar o superior?",
    keywords: ["superior", "chefe", "hierarquia", "subordinado", "vínculo"],
    questions: ["mudar chefe", "trocar superior", "mudar hierarquia"],
    answer:
      "Edite o cargo e abra a aba “Hierarquia”. Escolha o novo superior e salve. O sistema bloqueia escolhas que criariam ciclo.",
    route: "/pessoas-cargos",
    actionLabel: "Ir para Pessoas e cargos",
  },
  {
    id: "trocar-ocupante",
    title: "Como trocar o ocupante?",
    keywords: ["ocupante", "pessoa", "substituir", "nome", "colaborador"],
    questions: ["mudar pessoa do cargo", "substituir colaborador"],
    answer:
      "Edite o cargo e altere o nome do ocupante na aba “Informações”. Na substituição, a foto e os tipos anteriores são removidos.",
    route: "/pessoas-cargos",
    actionLabel: "Ir para Pessoas e cargos",
  },
  {
    id: "marcar-pcd",
    title: "Como marcar alguém como PCD?",
    keywords: ["pcd", "deficiência", "tipo", "classificar", "voluntário", "estagiário"],
    questions: ["classificar colaborador", "adicionar tipo ao colaborador"],
    answer:
      "Abra Pessoas e cargos, edite o colaborador, localize “Tipos de colaborador”, marque PCD e salve.",
    route: "/pessoas-cargos",
    actionLabel: "Ir para Pessoas e cargos",
  },
  {
    id: "criar-tipo",
    title: "Como criar um tipo de colaborador?",
    keywords: ["tipo", "categoria", "classificação", "criar", "novo"],
    questions: ["novo tipo", "cadastrar categoria"],
    answer:
      "Em Tipos de colaboradores, clique em “Novo tipo”, informe nome, cor e ícone e salve. Nomes duplicados são bloqueados.",
    route: "/tipos-colaboradores",
    actionLabel: "Ir para Tipos de colaboradores",
  },
  {
    id: "layout-vertical",
    title: "Como alterar o layout para vertical?",
    keywords: ["layout", "vertical", "coluna", "subordinados", "exibição"],
    questions: ["subordinados em coluna", "organizar vertical"],
    answer:
      "Edite o responsável e, em “Layout dos subordinados”, escolha Vertical. No modo Automático, grupos com 5 ou mais subordinados já ficam na vertical.",
    route: "/organograma",
    actionLabel: "Ir para o Organograma",
  },
  {
    id: "layout-horizontal",
    title: "Como alterar para horizontal?",
    keywords: ["layout", "horizontal", "linha", "subordinados", "lado a lado"],
    questions: ["subordinados lado a lado", "organizar horizontal"],
    answer:
      "Edite o responsável e, em “Layout dos subordinados”, escolha Horizontal e salve.",
    route: "/organograma",
    actionLabel: "Ir para o Organograma",
  },
  {
    id: "cor-cargo",
    title: "Como definir a cor de um cargo?",
    keywords: ["cor", "faixa", "destaque", "cargo", "hex"],
    questions: ["mudar cor do cartão", "colorir cargo"],
    answer:
      "Edite o cargo e escolha uma cor da paleta ou digite um código hexadecimal no campo de cor. Ela aparece como faixa no topo do cartão.",
    route: "/pessoas-cargos",
    actionLabel: "Ir para Pessoas e cargos",
  },
  {
    id: "filtrar-tipos",
    title: "Como filtrar PCD ou voluntários?",
    keywords: ["filtro", "pcd", "voluntário", "tipo", "destacar"],
    questions: ["ver só pcd", "mostrar voluntários"],
    answer:
      "No Organograma, use o filtro de tipos e escolha “Destacar” ou “Somente correspondentes”. Pessoas e cargos e Quantitativos também têm filtro por tipo.",
    route: "/organograma",
    actionLabel: "Ir para o Organograma",
  },
  {
    id: "imprimir",
    title: "Como imprimir o organograma?",
    keywords: ["imprimir", "impressão", "pdf", "papel"],
    questions: ["gerar pdf", "imprimir organograma"],
    answer:
      "No Organograma, clique em “Imprimir”. Os menus são ocultados, os níveis expandidos e a página fica em paisagem.",
    route: "/organograma",
    actionLabel: "Ir para o Organograma",
  },
  {
    id: "imprimir-cargos",
    title: "Como imprimir somente os cargos?",
    keywords: ["imprimir", "somente cargo", "sem nomes", "modo"],
    questions: ["imprimir sem nomes", "impressão institucional"],
    answer:
      "No Organograma, troque o modo de visualização para “Somente cargo” e depois clique em “Imprimir”.",
    route: "/organograma",
    actionLabel: "Ir para o Organograma",
  },
  {
    id: "quantitativos",
    title: "Onde vejo os quantitativos?",
    keywords: ["quantitativos", "números", "relatório", "indicadores", "contagem"],
    questions: ["quantos colaboradores", "relatório por área"],
    answer:
      "Na página Quantitativos você vê totais por cargo, tipo e área, com filtros e exportação para Excel, CSV ou impressão.",
    route: "/quantitativos",
    actionLabel: "Ir para Quantitativos",
  },
  {
    id: "foto",
    title: "Como cadastrar uma foto?",
    keywords: ["foto", "imagem", "retrato", "avatar"],
    questions: ["adicionar foto", "colocar imagem"],
    answer:
      "Edite o cargo ocupado e, na aba “Informações”, envie a foto. Ela é reduzida automaticamente antes de salvar.",
    route: "/pessoas-cargos",
    actionLabel: "Ir para Pessoas e cargos",
  },
  {
    id: "qrcode",
    title: "Como gerar ou visualizar o QR Code?",
    keywords: ["qr", "qrcode", "código", "perfil", "link"],
    questions: ["ver qr code", "baixar qr"],
    answer:
      "Edite um cargo existente e abra a aba “QR Code”. Ele leva ao perfil individual do colaborador.",
    route: "/pessoas-cargos",
    actionLabel: "Ir para Pessoas e cargos",
  },
  {
    id: "importar",
    title: "Como importar a planilha?",
    keywords: ["importar", "planilha", "excel", "xlsx", "csv", "carregar"],
    questions: ["subir planilha", "carregar excel"],
    answer:
      "Em Importar e exportar, selecione o arquivo, confira o relatório de validação e confirme. Um backup é criado antes da importação.",
    route: "/importar-exportar",
    actionLabel: "Ir para Importar e exportar",
  },
  {
    id: "exportar",
    title: "Como exportar dados?",
    keywords: ["exportar", "baixar", "excel", "csv", "json", "backup"],
    questions: ["baixar planilha", "fazer backup"],
    answer:
      "Em Importar e exportar, use “Exportar Excel”, “Exportar CSV” ou o backup em JSON.",
    route: "/importar-exportar",
    actionLabel: "Ir para Importar e exportar",
  },
];

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set(["como", "o", "a", "os", "as", "de", "do", "da", "um", "uma", "e", "para", "em", "no", "na", "onde", "eu", "que", "se"]);

export function searchHelp(query: string): HelpArticle[] {
  const terms = normalizeText(query)
    .split(" ")
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  if (terms.length === 0) return HELP_ARTICLES;
  return HELP_ARTICLES.map((article) => {
    const title = normalizeText(article.title);
    const keys = normalizeText(article.keywords.join(" "));
    const qs = normalizeText(article.questions.join(" "));
    const answer = normalizeText(article.answer);
    let score = 0;
    for (const term of terms) {
      if (title.includes(term)) score += 3;
      if (keys.includes(term)) score += 3;
      if (qs.includes(term)) score += 2;
      if (answer.includes(term)) score += 1;
    }
    return { article, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.article);
}
