/* ============================================================
   app.js
   Ponto de entrada da aplicação. Responsável por:
   - navegação entre telas
   - formulário de cadastro de questões
   - filtros da tela de resultado
   - carregar dados de exemplo
   - alternância de tema claro/escuro
   ============================================================ */

const App = {

  simuladoAtualId: null,   // id do simulado sendo visualizado no dashboard
  filtroStatus: 'todas',
  filtroMateria: 'todas',
  filtroAssunto: 'todas',

  init() {
    this.aplicarTemaSalvo();
    this.bindEventos();
    this.renderHome();
  },

  /* ---------------------------------------------------------
     NAVEGAÇÃO
     --------------------------------------------------------- */

  mostrarTela(idTela) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(idTela).classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  bindEventos() {
    document.getElementById('theme-toggle').addEventListener('click', () => this.alternarTema());

    document.getElementById('btn-new-simulado').addEventListener('click', () => this.abrirFormularioNovo());
    document.getElementById('btn-load-example').addEventListener('click', () => this.carregarExemplo());

    document.querySelectorAll('.btn-back').forEach(btn => {
      btn.addEventListener('click', () => {
        this.renderHome();
        this.mostrarTela(btn.dataset.target);
      });
    });

    document.getElementById('btn-add-questao').addEventListener('click', () => this.adicionarLinhaQuestao());
    document.getElementById('btn-corrigir').addEventListener('click', () => this.corrigirEExibir());

    document.getElementById('btn-excluir-simulado').addEventListener('click', () => this.excluirSimuladoAtual());

    document.querySelectorAll('.filtro-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filtroStatus = btn.dataset.filtroStatus;
        this.aplicarFiltros();
      });
    });

    document.getElementById('filtro-materia').addEventListener('change', (e) => {
      this.filtroMateria = e.target.value;
      this.aplicarFiltros();
    });

    document.getElementById('filtro-assunto').addEventListener('change', (e) => {
      this.filtroAssunto = e.target.value;
      this.aplicarFiltros();
    });
  },

  /* ---------------------------------------------------------
     TEMA CLARO / ESCURO
     --------------------------------------------------------- */

  aplicarTemaSalvo() {
    const tema = Storage.getTheme();
    document.body.setAttribute('data-theme', tema);
    document.getElementById('theme-toggle').textContent = tema === 'dark' ? '☀️' : '🌙';
  },

  alternarTema() {
    const atual = document.body.getAttribute('data-theme') || 'light';
    const novo = atual === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', novo);
    Storage.setTheme(novo);
    document.getElementById('theme-toggle').textContent = novo === 'dark' ? '☀️' : '🌙';

    // Redesenha gráficos visíveis para atualizar as cores dos textos/eixos
    if (!document.getElementById('screen-dashboard').classList.contains('hidden') && this.simuladoAtualId) {
      const simulado = Storage.getSimuladoById(this.simuladoAtualId);
      if (simulado) Dashboard.renderDashboard(simulado);
    }
    if (!document.getElementById('screen-home').classList.contains('hidden')) {
      Dashboard.renderGraficoEvolucao(Storage.getSimulados());
    }
  },

  /* ---------------------------------------------------------
     TELA HOME
     --------------------------------------------------------- */

  renderHome() {
    const simulados = Storage.getSimulados();
    const container = document.getElementById('lista-historico');
    container.innerHTML = '';

    if (simulados.length === 0) {
      container.innerHTML = '<p class="empty-state">Nenhum simulado cadastrado ainda. Clique em "+ Novo Simulado" ou "Carregar exemplo".</p>';
    } else {
      simulados.forEach(s => {
        const div = document.createElement('div');
        div.className = 'historico-item';
        const dataFormatada = new Date(s.dataISO).toLocaleDateString('pt-BR');
        div.innerHTML = `
          <div class="historico-info">
            <h3>${Dashboard.escapeHtml(s.nome)}</h3>
            <p class="historico-meta">${s.totalQuestoes} questões · ${s.acertos} acertos · ${dataFormatada}</p>
          </div>
          <span class="historico-percent">${s.aproveitamento}%</span>
        `;
        div.addEventListener('click', () => this.abrirDashboard(s.id));
        container.appendChild(div);
      });
    }

    Dashboard.renderGraficoEvolucao(simulados);
  },

  /* ---------------------------------------------------------
     FORMULÁRIO DE CADASTRO
     --------------------------------------------------------- */

  abrirFormularioNovo() {
    document.getElementById('input-nome-simulado').value = '';
    document.getElementById('lista-questoes-form').innerHTML = '';
    // Começa com 5 linhas em branco para facilitar o preenchimento
    for (let i = 0; i < 5; i++) this.adicionarLinhaQuestao();
    this.mostrarTela('screen-form');
  },

  adicionarLinhaQuestao() {
    const template = document.getElementById('template-questao-form');
    const clone = template.content.cloneNode(true);
    const item = clone.querySelector('.questao-form-item');

    const numeroAtual = document.querySelectorAll('#lista-questoes-form .questao-form-item').length + 1;
    item.querySelector('.q-numero').value = String(numeroAtual).padStart(2, '0');

    item.querySelector('.btn-remove-questao').addEventListener('click', () => item.remove());

    document.getElementById('lista-questoes-form').appendChild(clone);
  },

  /**
   * Lê todas as linhas do formulário, valida e monta o objeto simulado.
   */
  coletarQuestoesDoFormulario() {
    const linhas = document.querySelectorAll('#lista-questoes-form .questao-form-item');
    const questoes = [];

    linhas.forEach(linha => {
      const numero = linha.querySelector('.q-numero').value.trim();
      const resposta = linha.querySelector('.q-resposta').value.trim();
      const gabarito = linha.querySelector('.q-gabarito').value.trim();
      const materia = linha.querySelector('.q-materia').value.trim();
      const assunto = linha.querySelector('.q-assunto').value.trim();

      // Ignora linhas completamente vazias
      if (!numero && !resposta && !gabarito && !materia && !assunto) return;

      questoes.push({ numero, resposta, gabarito, materia, assunto });
    });

    return questoes;
  },

  corrigirEExibir() {
    const nome = document.getElementById('input-nome-simulado').value.trim() || 'Simulado sem nome';
    const questoes = this.coletarQuestoesDoFormulario();

    if (questoes.length === 0) {
      alert('Adicione pelo menos uma questão antes de corrigir o simulado.');
      return;
    }

    const incompletas = questoes.some(q => !q.numero || !q.resposta || !q.gabarito || !q.materia || !q.assunto);
    if (incompletas) {
      const continuar = confirm('Algumas questões estão com campos incompletos. Deseja corrigir mesmo assim?');
      if (!continuar) return;
    }

    let simulado = {
      id: Storage.generateId(),
      nome,
      dataISO: new Date().toISOString(),
      questoes
    };

    simulado = Dashboard.corrigirSimulado(simulado);
    Storage.saveSimulado(simulado);

    this.abrirDashboard(simulado.id);
  },

  /* ---------------------------------------------------------
     DASHBOARD DE RESULTADO
     --------------------------------------------------------- */

  abrirDashboard(id) {
    const simulado = Storage.getSimuladoById(id);
    if (!simulado) return;

    this.simuladoAtualId = id;
    this.filtroStatus = 'todas';
    this.filtroMateria = 'todas';
    this.filtroAssunto = 'todas';

    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.filtro-btn[data-filtro-status="todas"]').classList.add('active');

    Dashboard.renderDashboard(simulado);
    this.popularSelectsFiltro(simulado);
    this.renderQuestoes(simulado);

    this.mostrarTela('screen-dashboard');
  },

  excluirSimuladoAtual() {
    if (!this.simuladoAtualId) return;
    const confirmar = confirm('Tem certeza que deseja excluir este simulado? Essa ação não pode ser desfeita.');
    if (!confirmar) return;

    Storage.deleteSimulado(this.simuladoAtualId);
    this.simuladoAtualId = null;
    this.renderHome();
    this.mostrarTela('screen-home');
  },

  /* ---------------------------------------------------------
     FILTROS
     --------------------------------------------------------- */

  popularSelectsFiltro(simulado) {
    const selectMateria = document.getElementById('filtro-materia');
    const selectAssunto = document.getElementById('filtro-assunto');

    const materias = [...new Set(simulado.questoes.map(q => q.materia || 'Sem matéria'))].sort();
    const assuntos = [...new Set(simulado.questoes.map(q => q.assunto || 'Sem assunto'))].sort();

    selectMateria.innerHTML = '<option value="todas">Todas as matérias</option>' +
      materias.map(m => `<option value="${Dashboard.escapeHtml(m)}">${Dashboard.escapeHtml(m)}</option>`).join('');

    selectAssunto.innerHTML = '<option value="todas">Todos os assuntos</option>' +
      assuntos.map(a => `<option value="${Dashboard.escapeHtml(a)}">${Dashboard.escapeHtml(a)}</option>`).join('');
  },

  aplicarFiltros() {
    const simulado = Storage.getSimuladoById(this.simuladoAtualId);
    if (!simulado) return;
    this.renderQuestoes(simulado);
  },

  renderQuestoes(simulado) {
    const container = document.getElementById('lista-questoes-resultado');
    container.innerHTML = '';

    const questoesFiltradas = simulado.questoes.filter(q => {
      if (this.filtroStatus === 'certas' && !q.correta) return false;
      if (this.filtroStatus === 'erradas' && q.correta) return false;
      if (this.filtroMateria !== 'todas' && (q.materia || 'Sem matéria') !== this.filtroMateria) return false;
      if (this.filtroAssunto !== 'todas' && (q.assunto || 'Sem assunto') !== this.filtroAssunto) return false;
      return true;
    });

    if (questoesFiltradas.length === 0) {
      container.innerHTML = '<p class="empty-state">Nenhuma questão encontrada para os filtros selecionados.</p>';
      return;
    }

    questoesFiltradas.forEach(q => {
      const div = document.createElement('div');
      div.className = 'questao-card ' + (q.correta ? 'correta' : 'errada');
      div.innerHTML = `
        <div class="questao-card-top">
          <h3>Questão ${Dashboard.escapeHtml(q.numero)}</h3>
          <span class="status-badge ${q.correta ? 'correta' : 'errada'}">${q.correta ? '✅ Correta' : '❌ Errada'}</span>
        </div>
        <div class="questao-card-row"><strong>Matéria:</strong> ${Dashboard.escapeHtml(q.materia || '—')}</div>
        <div class="questao-card-row"><strong>Assunto:</strong> ${Dashboard.escapeHtml(q.assunto || '—')}</div>
        <div class="questao-card-row"><strong>Sua resposta:</strong> ${Dashboard.escapeHtml(q.resposta || '—')}</div>
        <div class="questao-card-row"><strong>Gabarito:</strong> ${Dashboard.escapeHtml(q.gabarito || '—')}</div>
      `;
      container.appendChild(div);
    });
  },

  /* ---------------------------------------------------------
     DADOS DE EXEMPLO
     --------------------------------------------------------- */

  carregarExemplo() {
    const bancoQuestoes = [
      { materia: 'Matemática', assunto: 'Função do 2º grau', gabarito: 'B' },
      { materia: 'Matemática', assunto: 'Função do 2º grau', gabarito: 'C' },
      { materia: 'Matemática', assunto: 'Probabilidade', gabarito: 'A' },
      { materia: 'Matemática', assunto: 'Probabilidade', gabarito: 'D' },
      { materia: 'Matemática', assunto: 'Geometria plana', gabarito: 'E' },
      { materia: 'Português', assunto: 'Interpretação de texto', gabarito: 'A' },
      { materia: 'Português', assunto: 'Interpretação de texto', gabarito: 'C' },
      { materia: 'Português', assunto: 'Interpretação de texto', gabarito: 'B' },
      { materia: 'Português', assunto: 'Gramática', gabarito: 'D' },
      { materia: 'Biologia', assunto: 'Genética', gabarito: 'B' },
      { materia: 'Biologia', assunto: 'Genética', gabarito: 'A' },
      { materia: 'Biologia', assunto: 'Ecologia', gabarito: 'C' },
      { materia: 'Biologia', assunto: 'Citologia', gabarito: 'E' },
      { materia: 'História', assunto: 'Brasil Colônia', gabarito: 'D' },
      { materia: 'História', assunto: 'Segunda Guerra Mundial', gabarito: 'A' },
      { materia: 'História', assunto: 'Segunda Guerra Mundial', gabarito: 'B' },
      { materia: 'Física', assunto: 'Cinemática', gabarito: 'C' },
      { materia: 'Física', assunto: 'Cinemática', gabarito: 'E' },
      { materia: 'Física', assunto: 'Eletricidade', gabarito: 'A' },
      { materia: 'Física', assunto: 'Óptica', gabarito: 'D' }
    ];

    const opcoes = ['A', 'B', 'C', 'D', 'E'];
    const questoes = bancoQuestoes.map((q, index) => {
      // Simula um desempenho realista: cerca de 65% de acerto
      const acertou = Math.random() < 0.65;
      const resposta = acertou ? q.gabarito : opcoes.filter(o => o !== q.gabarito)[Math.floor(Math.random() * 4)];
      return {
        numero: String(index + 1).padStart(2, '0'),
        resposta,
        gabarito: q.gabarito,
        materia: q.materia,
        assunto: q.assunto
      };
    });

    let simulado = {
      id: Storage.generateId(),
      nome: 'Simulado de exemplo',
      dataISO: new Date().toISOString(),
      questoes
    };

    simulado = Dashboard.corrigirSimulado(simulado);
    Storage.saveSimulado(simulado);

    this.abrirDashboard(simulado.id);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
