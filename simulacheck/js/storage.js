/* ============================================================
   storage.js
   Responsável por toda a persistência de dados no localStorage.
   Não contém lógica de interface — apenas leitura/escrita de dados.
   ============================================================ */

const STORAGE_KEYS = {
  SIMULADOS: 'simulacheck_simulados',
  THEME: 'simulacheck_theme'
};

const Storage = {

  /**
   * Retorna todos os simulados salvos, ordenados do mais recente
   * para o mais antigo.
   */
  getSimulados() {
    const raw = localStorage.getItem(STORAGE_KEYS.SIMULADOS);
    if (!raw) return [];
    try {
      const lista = JSON.parse(raw);
      return lista.sort((a, b) => new Date(b.dataISO) - new Date(a.dataISO));
    } catch (e) {
      console.error('Erro ao ler simulados do localStorage:', e);
      return [];
    }
  },

  /**
   * Retorna um simulado específico pelo id.
   */
  getSimuladoById(id) {
    return this.getSimulados().find(s => s.id === id) || null;
  },

  /**
   * Salva (cria ou atualiza) um simulado.
   */
  saveSimulado(simulado) {
    const lista = this.getSimulados();
    const index = lista.findIndex(s => s.id === simulado.id);
    if (index >= 0) {
      lista[index] = simulado;
    } else {
      lista.push(simulado);
    }
    localStorage.setItem(STORAGE_KEYS.SIMULADOS, JSON.stringify(lista));
  },

  /**
   * Remove um simulado pelo id.
   */
  deleteSimulado(id) {
    const lista = this.getSimulados().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SIMULADOS, JSON.stringify(lista));
  },

  /**
   * Tema (claro/escuro)
   */
  getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  },

  setTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  /**
   * Gera um id único simples, sem dependências externas.
   */
  generateId() {
    return 'sim_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }
};
