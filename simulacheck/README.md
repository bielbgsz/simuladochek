# SimulaCheck

Dashboard simples, moderno e responsivo para correção automática de simulados.

Feito 100% com **HTML5 + CSS3 + JavaScript puro (Vanilla JS)** e **Chart.js** para os gráficos. Sem backend, sem banco de dados, sem login — tudo roda no navegador e os dados ficam salvos no `localStorage`.

## Estrutura do projeto

```text
simulacheck/
│
├── index.html          → estrutura de todas as telas (home, formulário, dashboard)
│
├── css/
│   └── style.css        → todo o visual: cores, layout, responsividade, modo claro/escuro
│
├── js/
│   ├── app.js            → navegação, formulário, filtros, tema, dados de exemplo
│   ├── dashboard.js       → cálculo da correção e renderização dos gráficos/resultados
│   └── storage.js         → leitura e escrita no localStorage
│
└── README.md
```

## Como usar localmente

Como o projeto não usa build tools nem Node.js, basta abrir o `index.html` diretamente no navegador **ou** rodar um servidor local simples (recomendado, para evitar bloqueios de `file://` em alguns navegadores):

```bash
# dentro da pasta simulacheck/
python3 -m http.server 8080
# depois acesse http://localhost:8080
```

## Fluxo de uso

1. Na tela inicial, clique em **"+ Novo Simulado"** (ou **"Carregar exemplo"** para testar rapidamente com dados fictícios).
2. Preencha as questões: número, sua resposta, gabarito, matéria e assunto.
3. Use **"+ Adicionar questão"** para incluir mais linhas.
4. Clique em **"Corrigir Simulado"**.
5. O dashboard mostra automaticamente: total de questões, acertos, erros, aproveitamento, gráfico de desempenho geral, desempenho por matéria, assuntos com mais erros e a lista de questões (com filtros).
6. O simulado fica salvo no **Histórico**, na tela inicial, junto com o gráfico de **evolução do aproveitamento** ao longo dos simulados.
7. É possível excluir um simulado a qualquer momento (com confirmação) dentro do próprio dashboard.

## Modo claro / escuro

O botão no canto superior direito do cabeçalho (🌙 / ☀️) alterna entre os modos. A preferência é salva no `localStorage` e mantida entre acessos.

## Publicando na Vercel

1. Crie um repositório no GitHub e envie a pasta `simulacheck/` (com `index.html` na raiz do repositório, ou ajuste o "Root Directory" no passo 3).
2. Acesse [vercel.com](https://vercel.com) e clique em **"Add New" → "Project"**.
3. Selecione o repositório importado. Como é um projeto estático (sem framework), a Vercel detecta automaticamente — não é necessário configurar comando de build nem output directory.
4. Clique em **Deploy**. Em poucos segundos o site estará no ar em uma URL `*.vercel.app`.

Alternativamente, também é possível arrastar a pasta do projeto direto na área de upload do painel da Vercel, sem precisar do GitHub.

## Observações técnicas

- Todos os dados (simulados, questões, resultados e histórico) ficam salvos **apenas no navegador do usuário** (`localStorage`), então cada visitante tem seu próprio histórico local — não há sincronização entre dispositivos.
- O Chart.js é carregado via CDN (`cdnjs`), sem necessidade de instalação.
- O projeto não possui dependências, `package.json` ou etapa de build — é puramente estático.
