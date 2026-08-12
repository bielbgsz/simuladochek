/* ============================================================
   dashboard.js
   Responsável por:
   - calcular os resultados de um simulado (correção automática)
   - renderizar o dashboard (cards, gráficos, listas)
   Não lida com localStorage diretamente (isso é papel do storage.js)
   nem com navegação entre telas (isso é papel do app.js).
   ============================================================ */

const Dashboard = {

  // Instâncias de gráficos ativas, para poder destruir antes de recriar
  charts: {
    geral: null,
    materias: null,
    evolucao: null
  },

  /**
   * Corrige um simulado: compara resposta x gabarito para cada questão
   * e calcula todas as estatísticas derivadas.
   * Recebe um objeto simulado (com .questoes) e devolve o mesmo objeto
   * já enriquecido com os resultados calculados.
   */
  corrigirSimulado(simulado) {
    let acertos = 0;
    let erros = 0;

    simulado.questoes.forEach(q => {
      q.correta = this.normaliza(q.resposta) === this.normaliza(q.gabarito) &&
                  this.normaliza(q.resposta) !== '';
      if (q.correta) acertos++; else erros++;
    });

    const total = simulado.questoes.length;
    const aproveitamento = total > 0 ? Math.round((acertos / total) * 100) : 0;

    simulado.totalQuestoes = total;
    simulado.acertos = acertos;
    simulado.erros = erros;
    simulado.aproveitamento = aproveitamento;
    simulado.desempenhoPorMateria = this.calcularDesempenhoPorMateria(simulado.questoes);
    simulado.assuntosComErro = this.calcularAssuntosComErro(simulado.questoes);

    return simulado;
  },

  normaliza(valor) {
    return (valor || '').toString().trim().toUpperCase();
  },

  /**
   * Agrupa as questões por matéria e calcula acertos/erros/% para cada uma.
   */
  calcularDesempenhoPorMateria(questoes) {
    const mapa = {};
    questoes.forEach(q => {
      const materia = q.materia || 'Sem matéria';
      if (!mapa[materia]) {
        mapa[materia] = { materia, total: 0, acertos: 0, erros: 0 };
      }
      mapa[materia].total++;
      if (q.correta) mapa[materia].acertos++; else mapa[materia].erros++;
    });

    return Object.values(mapa)
      .map(m => ({ ...m, aproveitamento: Math.round((m.acertos / m.total) * 100) }))
      .sort((a, b) => b.total - a.total);
  },

  /**
   * Agrupa os assuntos das questões erradas e ordena do maior para o
   * menor número de erros.
   */
  calcularAssuntosComErro(questoes) {
    const mapa = {};
    questoes.filter(q => !q.correta).forEach(q => {
      const assunto = q.assunto || 'Sem assunto';
      const materia = q.materia || 'Sem matéria';
      const chave = assunto + '||' + materia;
      if (!mapa[chave]) {
        mapa[chave] = { assunto, materia, erros: 0 };
      }
      mapa[chave].erros++;
    });

    return Object.values(mapa).sort((a, b) => b.erros - a.erros);
  },

  /**
   * Renderiza todo o dashboard de um simulado já corrigido.
   */
  renderDashboard(simulado) {
    document.getElementById('dashboard-nome-simulado').textContent = simulado.nome;

    document.getElementById('stat-total').textContent = simulado.totalQuestoes;
    document.getElementById('stat-acertos').textContent = simulado.acertos;
    document.getElementById('stat-erros').textContent = simulado.erros;
    document.getElementById('stat-aproveitamento').textContent = simulado.aproveitamento + '%';

    this.renderGraficoGeral(simulado);
    this.renderGraficoMaterias(simulado);
    this.renderListaMaterias(simulado);
    this.renderListaAssuntos(simulado);
  },

  renderGraficoGeral(simulado) {
    const ctx = document.getElementById('chart-desempenho-geral');
    if (this.charts.geral) this.charts.geral.destroy();

    const corTexto = getComputedStyle(document.body).getPropertyValue('--text-primary').trim();

    this.charts.geral = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Acertos', 'Erros'],
        datasets: [{
          data: [simulado.acertos, simulado.erros],
          backgroundColor: ['#22b57a', '#f0533d'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: corTexto, font: { size: 13 } }
          }
        },
        cutout: '65%'
      }
    });
  },

  renderGraficoMaterias(simulado) {
    const ctx = document.getElementById('chart-materias');
    if (this.charts.materias) this.charts.materias.destroy();

    const corTexto = getComputedStyle(document.body).getPropertyValue('--text-primary').trim();
    const corGrid = getComputedStyle(document.body).getPropertyValue('--border-color').trim();

    const dados = simulado.desempenhoPorMateria;

    this.charts.materias = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dados.map(m => m.materia),
        datasets: [{
          label: 'Aproveitamento (%)',
          data: dados.map(m => m.aproveitamento),
          backgroundColor: '#4f6df5',
          borderRadius: 6,
          maxBarThickness: 42
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { color: corTexto, callback: v => v + '%' },
            grid: { color: corGrid }
          },
          x: {
            ticks: { color: corTexto },
            grid: { display: false }
          }
        }
      }
    });
  },

  renderListaMaterias(simulado) {
    const container = document.getElementById('lista-materias');
    container.innerHTML = '';

    simulado.desempenhoPorMateria.forEach(m => {
      const div = document.createElement('div');
      div.className = 'materia-item';
      div.innerHTML = `
        <div class="materia-item-top">
          <span>${this.escapeHtml(m.materia)} <span class="materia-sub">(${m.acertos}/${m.total} acertos)</span></span>
          <span>${m.aproveitamento}%</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width:${m.aproveitamento}%"></div>
        </div>
      `;
      container.appendChild(div);
    });
  },

  renderListaAssuntos(simulado) {
    const container = document.getElementById('lista-assuntos');
    const emptyMsg = document.getElementById('assuntos-empty');
    container.innerHTML = '';

    if (simulado.assuntosComErro.length === 0) {
      emptyMsg.classList.remove('hidden');
      return;
    }
    emptyMsg.classList.add('hidden');

    simulado.assuntosComErro.forEach((a, index) => {
      const div = document.createElement('div');
      div.className = 'assunto-item' + (index < 3 ? ' destaque' : '');
      div.innerHTML = `
        <span class="assunto-rank">${index + 1}º</span>
        <div class="assunto-info">
          <div class="assunto-nome">${this.escapeHtml(a.assunto)}</div>
          <div class="assunto-materia">${this.escapeHtml(a.materia)}</div>
        </div>
        <span class="assunto-erros">${a.erros} erro${a.erros > 1 ? 's' : ''}</span>
      `;
      container.appendChild(div);
    });
  },

  /**
   * Renderiza o gráfico de evolução do aproveitamento ao longo dos
   * simulados (do mais antigo para o mais recente).
   */
  renderGraficoEvolucao(simulados) {
    const ctx = document.getElementById('chart-evolucao');
    const emptyMsg = document.getElementById('evolucao-empty');

    if (!simulados || simulados.length < 2) {
      ctx.parentElement.classList.add('hidden');
      emptyMsg.classList.remove('hidden');
      return;
    }
    ctx.parentElement.classList.remove('hidden');
    emptyMsg.classList.add('hidden');

    const ordenados = [...simulados].sort((a, b) => new Date(a.dataISO) - new Date(b.dataISO));
    const corTexto = getComputedStyle(document.body).getPropertyValue('--text-primary').trim();
    const corGrid = getComputedStyle(document.body).getPropertyValue('--border-color').trim();

    if (this.charts.evolucao) this.charts.evolucao.destroy();

    this.charts.evolucao = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ordenados.map((s, i) => `Simulado ${i + 1}`),
        datasets: [{
          label: 'Aproveitamento (%)',
          data: ordenados.map(s => s.aproveitamento),
          borderColor: '#4f6df5',
          backgroundColor: 'rgba(79, 109, 245, 0.15)',
          fill: true,
          tension: 0.35,
          pointRadius: 5,
          pointBackgroundColor: '#4f6df5'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { color: corTexto, callback: v => v + '%' },
            grid: { color: corGrid }
          },
          x: {
            ticks: { color: corTexto },
            grid: { display: false }
          }
        }
      }
    });
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
