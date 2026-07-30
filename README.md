# Paysandu Org Flow

DESENVOLVIMENTO DE SISTEMA DE ORGANOGRAMA — PAYSANDU SPORT CLUB

Crie do zero uma aplicação web funcional para gerenciamento do organograma institucional do Paysandu Sport Club.

O sistema deve possuir uma interface administrativa moderna, limpa, clara e institucional.

O projeto anterior apresentou problemas graves de navegação, com páginas não carregando e rotas retornando erro 404. Portanto, nesta geração, a prioridade absoluta deve ser:

Navegação funcional.
Rotas corretamente registradas.
Dados da planilha carregados.
Organograma visual funcionando.
Edição rápida de pessoas e cargos.
Ausência de links, botões ou páginas falsas.

Não criar funcionalidades apenas visuais. Todo item exibido deve funcionar.

1. ESCOPO DESTA PRIMEIRA VERSÃO

Criar somente as seguintes páginas:

Login.
Visão geral.
Organograma.
Pessoas e cargos.
Áreas.
Importar e exportar dados.
Histórico de alterações.

Não criar nesta primeira versão:

Gestão de usuários.
Comparação avançada entre versões.
Recuperação de senha real.
Integração com banco de dados.
Integração com backend.
Notificações reais.
Configurações complexas.
Funcionalidades apenas demonstrativas.

Não exibir no menu nenhuma página que não esteja completamente implementada.

2. REQUISITO CRÍTICO DE NAVEGAÇÃO

Utilizar:

React.
TypeScript.
Vite.
React Router.
Tailwind CSS.
shadcn/ui.
Lucide Icons.

Registrar explicitamente todas as rotas da aplicação.

Utilizar uma estrutura semelhante a:

<Routes>
  <Route path="/login" element={<LoginPage />} />

  <Route element={<ProtectedLayout />}>
    <Route path="/" element={<Navigate to="/visao-geral" replace />} />
    <Route path="/visao-geral" element={<DashboardPage />} />
    <Route path="/organograma" element={<OrganizationChartPage />} />
    <Route path="/pessoas-cargos" element={<PeoplePositionsPage />} />
    <Route path="/areas" element={<AreasPage />} />
    <Route path="/importar-exportar" element={<ImportExportPage />} />
    <Route path="/historico" element={<HistoryPage />} />
  </Route>

  <Route path="*" element={<Navigate to="/visao-geral" replace />} />
</Routes>

Todos os itens do menu lateral devem utilizar:

<Link to="/rota">

ou:

navigate("/rota")

Não utilizar:

<a href="/rota">

Não utilizar:

window.location.href

Não provocar recarregamento completo do navegador ao trocar de página.

Não criar rotas com nomes diferentes entre o menu e o arquivo de rotas.

Exemplo incorreto:

Menu: /pessoas
Rota criada: /pessoas-cargos

O endereço utilizado no menu deve ser exatamente igual ao endereço registrado no React Router.

Ao atualizar manualmente qualquer página, a aplicação não pode retornar erro 404.

3. TRATAMENTO DE ERROS

Criar um ErrorBoundary global.

Caso uma página apresente erro de renderização, exibir dentro do layout:

Não foi possível carregar esta área.

Tentar novamente
Voltar para a visão geral

Não deixar o usuário visualizar uma tela totalmente branca.

Não mostrar mensagens técnicas como:

Stack trace.
Undefined is not a function.
Cannot read property.
Page didn’t load.

Tratar listas vazias com segurança.

Antes de utilizar métodos como:

map
filter
find
reduce

garantir que o valor seja um array válido.

Exemplo:

const safePositions = Array.isArray(positions) ? positions : [];

Utilizar valores padrão durante a inicialização do estado.

4. DADOS INICIAIS

Utilizar como fonte inicial o arquivo anexado:

ORGANOGRAMA PAYSANDU 2026 (4).xlsx

A aba principal deve ser:

BASE (2)

Ela contém aproximadamente 196 registros.

Mapear as seguintes colunas:

ID
Nome
Cargo
SuperiorID
TipoLigação
Tooltip
Área
Obs

Regras de importação:

ID identifica o registro.
Nome identifica a pessoa.
Cargo identifica a posição organizacional.
SuperiorID informa o superior hierárquico.
TipoLigação informa se a ligação é direta ou funcional.
Tooltip contém explicações adicionais.
Área identifica o setor.
Obs contém observações.

A importação inicial deve acontecer somente quando não houver dados no localStorage.

Fluxo:

if (!localStorage.getItem("paysandu_organization_data")) {
  carregarDadosIniciais();
}

Não sobrescrever as alterações do usuário em cada atualização da página.

5. TRATAMENTO DO SUPERIORID

Alguns valores da coluna SuperiorID podem vir como números, textos ou fórmulas do Excel.

Exemplos:

2
"2"
=A93
='BASE (2)'!A2

Converter todos para o ID numérico correspondente.

Quando o valor for uma referência de célula, resolver o conteúdo daquela célula antes de montar a hierarquia.

Não salvar fórmulas como valor do superior.

O resultado esperado deve ser:

superiorId: 2

e não:

superiorId: "='BASE (2)'!A2"

Quando não for possível identificar o superior:

Manter o registro.
Definir superiorId como null.
Sinalizar como “Superior não definido”.
Não quebrar a página do organograma.
6. MODELO DE DADOS SIMPLIFICADO

Utilizar inicialmente uma entidade única e estável para evitar complexidade excessiva.

interface OrganizationPosition {
  id: string;
  legacyId: number;
  personName: string;
  positionTitle: string;
  superiorId: string | null;
  connectionType: "direct" | "functional" | "undefined";
  area: string;
  tooltip: string;
  notes: string;
  status: "occupied" | "vacant" | "inactive";
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

Nesta primeira versão, não separar pessoa e cargo em estruturas complexas.

A separação poderá ser realizada posteriormente no backend.

A prioridade agora é garantir estabilidade, edição rápida e correta montagem da hierarquia.

7. CARGOS VAGOS

Quando o campo Nome possuir valores como:

EM ABERTO
ABERTO
VAGO
CARGO VAGO

definir:

status: "vacant"

No cartão, exibir:

CARGO VAGO

Não criar uma pessoa fictícia chamada “Em aberto”.

Usar borda tracejada no cartão, sem utilizar vermelho intenso.

8. LOGIN

Criar uma tela de login com o mesmo conceito visual do projeto anterior:

Área institucional azul escura à esquerda.
Formulário limpo à direita.
Símbolo do Paysandu ou espaço reservado para a marca.
Nome “Organograma Institucional”.
Campo de e-mail.
Campo de senha.
Botão “Entrar”.

Credenciais demonstrativas:

admin@paysandu.com.br
123456

Ao efetuar login:

navigate("/visao-geral");

Não redirecionar para uma rota inexistente.

Persistir uma sessão simulada no localStorage.

Caso o usuário já esteja autenticado, abrir diretamente a visão geral.

9. LAYOUT ADMINISTRATIVO

Criar um layout fixo para todas as páginas internas.

Menu lateral

Exibir somente:

Visão geral.
Organograma.
Pessoas e cargos.
Áreas.
Importar e exportar.
Histórico.
Sair.

Cada item deve apontar para uma rota implementada.

Destacar corretamente a página atual.

O menu deve permanecer visível durante a navegação.

Cabeçalho

Exibir:

Nome da página.
Busca global.
Data da última atualização.
Usuário conectado.

Não criar botão de notificação sem função.

Não criar seletor de versões nesta primeira versão.

10. VISÃO GERAL

Manter o estilo visual do dashboard anterior, pois ele ficou adequado.

Exibir indicadores calculados a partir dos dados reais:

Total de posições.
Pessoas ou cargos ocupados.
Total de áreas.
Cargos vagos.
Registros sem superior.
Ligações funcionais.
Última atualização.

Não escrever números manualmente.

Calcular os valores:

const totalPositions = positions.length;
const occupiedPositions = positions.filter(
  item => item.status === "occupied"
).length;
const vacantPositions = positions.filter(
  item => item.status === "vacant"
).length;

Criar a seção “Situação do organograma” com:

Cargos vagos.
Superiores não definidos.
Ligações funcionais.
Possíveis inconsistências.

Criar a seção “Alterações recentes” utilizando o histórico local.

O botão “Abrir organograma” deve navegar para:

/organograma
11. ORGANOGRAMA

Esta é a funcionalidade principal.

Utilizar React Flow, D3 Hierarchy ou outra biblioteca estável.

A página deve funcionar mesmo que existam registros inconsistentes.

Nunca permitir que um registro inválido interrompa a renderização de todos os demais.

Hierarquia

Montar a árvore utilizando:

id
superiorId

Registros sem superior devem ser exibidos em uma seção separada chamada:

Sem vínculo hierárquico definido

Não tentar inserir registros órfãos forçadamente dentro da árvore.

Evitar loops infinitos ao montar a estrutura.

Implementar uma proteção contra ciclos hierárquicos.

Exemplo:

function hasCycle(positionId, superiorId, positions) {
  // Percorrer a cadeia de superiores com limite de segurança.
}

Definir um limite máximo de iterações.

Ferramentas

Adicionar:

Busca por nome.
Busca por cargo.
Filtro por área.
Filtro por status.
Expandir tudo.
Recolher tudo.
Centralizar.
Zoom.
Tela cheia.
Novo cargo.

Cada botão precisa funcionar.

Não incluir botão de exportação visual nesta primeira geração caso não seja possível implementá-lo corretamente.

12. CARTÕES DO ORGANOGRAMA

Cada cartão deve exibir:

Cargo em destaque.
Nome da pessoa.
Área.
Indicador de ligação.
Menu de ações.

Para ligação direta:

Linha contínua.

Para ligação funcional:

Linha tracejada.

Para vínculo indefinido:

Linha neutra ou aviso discreto.

Adicionar legenda.

Ao clicar em um cartão, abrir um painel lateral de edição.

13. PAINEL DE EDIÇÃO

O painel lateral deve permitir alterar:

Nome.
Cargo.
Área.
Superior.
Tipo de ligação.
Tooltip.
Observação.
Status.

Botões:

Salvar.
Cancelar.
Marcar como cargo vago.
Desativar.

Ao salvar:

Validar os campos.
Atualizar o estado.
Salvar no localStorage.
Registrar no histórico.
Atualizar imediatamente o organograma.
Exibir mensagem de sucesso.
Fechar ou manter o painel conforme a ação.

Não recarregar toda a página.

14. ALTERAÇÃO DE SUPERIOR

Nesta primeira versão, realizar a troca de superior pelo formulário.

Não implementar drag and drop hierárquico nesta geração.

O drag and drop aumenta o risco de erros e poderá ser adicionado posteriormente.

Ao selecionar um novo superior:

Não permitir selecionar o próprio cargo.
Não permitir selecionar um subordinado direto ou indireto.
Não permitir criar ciclo.
Exibir uma mensagem clara quando a alteração for inválida.

Mensagem:

Não é possível realizar esta alteração porque ela criaria um ciclo na hierarquia.
15. PESSOAS E CARGOS

Criar uma tabela funcional com:

ID.
Nome.
Cargo.
Área.
Superior.
Tipo de ligação.
Status.
Ações.

Permitir:

Busca.
Filtro por área.
Filtro por status.
Ordenação.
Paginação.
Edição.
Inclusão de novo cargo.
Exclusão somente após confirmação.

Ao clicar em “Editar”, abrir o mesmo painel lateral utilizado no organograma.

Não criar edição em lote nesta primeira versão.

16. ÁREAS

Criar uma página simples e funcional.

Agrupar os registros pelo campo Área.

Exibir:

Nome da área.
Quantidade total de posições.
Quantidade ocupada.
Quantidade de cargos vagos.
Responsável principal, quando identificável.

Ao clicar em uma área:

Abrir o organograma filtrado por aquela área.
Ou navegar para /organograma?area=NomeDaArea.

Garantir que o parâmetro seja lido e aplicado corretamente.

17. IMPORTAÇÃO E EXPORTAÇÃO

Criar uma única página para importação e exportação.

Importação

Permitir upload de:

.xlsx
.xls
.csv

Utilizar a aba BASE (2) como padrão quando existir.

Antes de substituir os dados, exibir:

Quantidade de registros encontrados.
Registros válidos.
Registros sem superior.
IDs duplicados.
Campos obrigatórios vazios.
Possíveis ciclos.

Permitir:

Substituir a base.
Cancelar.

Não implementar mesclagem complexa nesta versão.

Antes de substituir, criar automaticamente um backup JSON da base atual.

Exportação

Permitir exportar:

Excel.
CSV.
JSON de backup.

Não implementar PDF e PNG do organograma nesta primeira versão caso isso comprometa a estabilidade.

18. HISTÓRICO

Registrar localmente:

interface ChangeLog {
  id: string;
  action: "create" | "update" | "delete" | "import";
  positionId?: string;
  description: string;
  previousData?: unknown;
  newData?: unknown;
  createdAt: string;
  userName: string;
}

Exibir:

Data e hora.
Usuário.
Ação.
Pessoa ou cargo afetado.
Descrição.

Permitir filtrar por:

Período.
Tipo de ação.
Nome ou cargo.
19. PERSISTÊNCIA

Criar um serviço centralizado.

src/services/organizationStorageService.ts

Esse serviço deve possuir:

getPositions()
savePositions()
getHistory()
saveHistory()
importPositions()
exportBackup()
restoreBackup()
clearData()

Nenhum componente deve acessar o localStorage diretamente.

Utilizar chaves versionadas:

paysandu_organogram_positions_v1
paysandu_organogram_history_v1
paysandu_organogram_session_v1

Tratar erros de JSON inválido.

Exemplo:

try {
  return JSON.parse(value);
} catch {
  return [];
}
20. ESTADO DE CARREGAMENTO

Todas as páginas devem possuir:

Estado de carregamento.
Estado vazio.
Estado de erro.

Fluxo esperado:

if (isLoading) {
  return <PageSkeleton />;
}

if (error) {
  return <PageError />;
}

return <PageContent />;

Não tentar renderizar componentes dependentes dos dados antes do carregamento terminar.

21. IDENTIDADE VISUAL

Manter o conceito visual aprovado:

Azul institucional escuro.
Azul-celeste.
Branco.
Cinza muito claro.
Interface administrativa limpa.
Menu lateral azul escuro.
Cartões claros.
Poucas sombras.
Tipografia legível.
Bordas discretas.
Ícones simples.

Evitar:

Gradientes exagerados.
Glassmorphism.
Elementos flutuantes.
Gráficos decorativos.
Palavras soltas.
Ilustrações genéricas.
Visual com aparência de template de inteligência artificial.

A interface deve parecer um sistema corporativo real.

22. RESPONSIVIDADE

Priorizar desktop.

Em telas menores:

Recolher o menu lateral.
Transformar o painel lateral em modal de tela cheia.
Permitir rolagem horizontal controlada no organograma.
Não reduzir os cartões a ponto de ficarem ilegíveis.
23. TESTES OBRIGATÓRIOS ANTES DE FINALIZAR

Antes de considerar a aplicação concluída, testar manualmente:

Login
Login válido.
Login inválido.
Redirecionamento.
Logout.
Atualização da página autenticada.
Navegação

Acessar cada rota:

/login
/visao-geral
/organograma
/pessoas-cargos
/areas
/importar-exportar
/historico

Confirmar que nenhuma apresenta:

Página branca.
“This page didn’t load”.
Erro 404.
Console error bloqueando a renderização.
Dados
Recarregar a página.
Confirmar que os dados permanecem.
Editar um cargo.
Confirmar que o dashboard atualiza.
Confirmar que o organograma atualiza.
Confirmar que o histórico registra.
Organograma
Buscar uma pessoa.
Filtrar por área.
Abrir um cartão.
Alterar o superior.
Bloquear um ciclo.
Criar um cargo.
Marcar um cargo como vago.
Importação
Importar a planilha.
Validar registros.
Cancelar a importação.
Substituir a base.
Recarregar a aplicação.
24. CRITÉRIOS DE ACEITAÇÃO

O projeto somente pode ser considerado concluído quando:

Todas as opções do menu abrirem páginas reais.
Nenhuma rota retornar erro 404.
Nenhuma opção visível estiver sem função.
Os dados da planilha estiverem disponíveis.
O dashboard utilizar números calculados.
O organograma carregar sem quebrar.
Registros órfãos forem tratados.
Ciclos forem bloqueados.
A edição funcionar.
As alterações permanecerem após atualizar a página.
A tabela funcionar.
A importação funcionar.
A exportação funcionar.
O histórico funcionar.
O logout funcionar.
A aplicação possuir tratamento de erros.
25. ORIENTAÇÃO FINAL

Não tente adicionar novas funcionalidades além das descritas.

É preferível entregar sete páginas totalmente funcionais do que criar muitas páginas incompletas.

Não criar links provisórios.

Não criar páginas falsas.

Não adicionar texto “em breve”.

Não criar botão sem ação.

Não inventar dados aleatórios quando a planilha estiver disponível.

Primeiro implemente e teste as rotas. Depois carregue os dados. Em seguida implemente o organograma e a edição. Por último finalize o acabamento visual.

A estabilidade da aplicação tem prioridade sobre funcionalidades avançadas.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://organogramapaysandu.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cc6226fd-b80d-4824-8fe5-41d4fd1b3806).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
