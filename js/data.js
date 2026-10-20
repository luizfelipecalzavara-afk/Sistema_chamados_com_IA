// ============================================
// SISTEMA DE CHAMADOS COM IA — CAMADA DE DADOS (Integração API Real)
// ============================================

const DataStore = (() => {
  let _data = {
    chamados: [],
    usuarios: [],
    tecnicos: [],
    categorias: [],
    setores: [],
    prioridades: [],
    automacoes: [],
    metricas: null,
    adminMetricas: null,
    adminUsuarios: [],
    config: {
      usuarioAtual: 'u1',
      modoTecnico: true
    }
  };

  // ── Resolução dinâmica e inteligente da URL base da API
  function getApiUrl() {
    // 1. Override manual configurado no localStorage
    const custom = typeof localStorage !== 'undefined' ? localStorage.getItem('chamadoia_api_url') : null;
    if (custom) return custom.replace(/\/+$/, '');

    // 2. Se a página foi aberta diretamente como arquivo local (file://)
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      return 'http://localhost:3000/api';
    }

    // 3. Se estiver sendo servida por outro servidor web / Live Server (ex: porta 5500, 8080)
    if (typeof window !== 'undefined' && window.location.port && window.location.port !== '3000') {
      const host = window.location.hostname || 'localhost';
      return `http://${host}:3000/api`;
    }

    // 4. Se estiver servida pelo próprio servidor Express na porta 3000
    return '/api';
  }

  // ── Helper central para chamadas à API com token de autenticação
  async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const config = {
      ...options,
      headers
    };

    const baseUrl = getApiUrl();
    let res;
    try {
      res = await fetch(`${baseUrl}${endpoint}`, config);
    } catch (networkErr) {
      console.error(`[DataStore] Erro de rede ao acessar ${baseUrl}${endpoint}:`, networkErr);
      throw new Error(`Falha de conexão com o servidor (${baseUrl}). Verifique se o backend Node.js está em execução na porta 3000.`);
    }

    // Se 401 Unauthorized e não estiver na tela de login, alertar sessão expirada
    if (res.status === 401 && !endpoint.startsWith('/auth/')) {
      console.warn('[DataStore] Sessão expirada ou token inválido.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof App !== 'undefined' && App.mostrarAuth) {
        App.mostrarAuth();
      }
    }

    return res;
  }

  // ── Carregar todos os dados da API
  async function carregarTudo() {
    try {
      const [chamadosRes, usuariosRes, tecnicosRes, categoriasRes, automacoesRes, setoresRes, prioridadesRes] = await Promise.all([
        apiFetch('/chamados'),
        apiFetch('/usuarios'),
        apiFetch('/tecnicos'),
        apiFetch('/categorias'),
        apiFetch('/automacoes'),
        apiFetch('/setores'),
        apiFetch('/prioridades')
      ]);

      if (chamadosRes.ok) _data.chamados = await chamadosRes.json();
      if (usuariosRes.ok) _data.usuarios = await usuariosRes.json();
      if (tecnicosRes.ok) _data.tecnicos = await tecnicosRes.json();
      if (categoriasRes.ok) _data.categorias = await categoriasRes.json();
      if (automacoesRes.ok) _data.automacoes = await automacoesRes.json();
      if (setoresRes && setoresRes.ok) _data.setores = await setoresRes.json();
      if (prioridadesRes && prioridadesRes.ok) _data.prioridades = await prioridadesRes.json();
    } catch (e) {
      console.error('[DataStore] Erro ao carregar dados da API:', e);
    }
  }

  async function carregarMetricas() {
    try {
      const res = await apiFetch('/metricas');
      if (res.ok) _data.metricas = await res.json();
    } catch (e) {
      console.error('[DataStore] Erro ao carregar métricas:', e);
    }
  }

  // ── Chamados
  function getChamados() { return _data.chamados; }

  function getChamadoById(id) {
    return _data.chamados.find(c => parseInt(c.id) === parseInt(id));
  }

  async function atualizarChamadoUnico(id) {
    try {
      const res = await apiFetch(`/chamados/${id}`);
      if (!res.ok) return null;
      const atualizado = await res.json();
      const index = _data.chamados.findIndex(c => parseInt(c.id) === parseInt(id));
      if (index >= 0) {
        _data.chamados[index] = atualizado;
      } else {
        _data.chamados.unshift(atualizado);
      }
      return atualizado;
    } catch (e) {
      console.error('[DataStore] Erro ao buscar chamado:', e);
      return null;
    }
  }

  async function adminExcluirChamado(id) {
    // POST dedicado evita conflito com servidores/proxies que devolvem index.html para DELETE.
    const res = await apiFetch(`/chamados/${id}/excluir-admin`, { method: 'POST' });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const texto = await res.text();
      throw new Error(`Servidor incorreto ou desatualizado: a rota de exclusão não retornou JSON (HTTP ${res.status}). Reinicie o backend desta versão.`);
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.detalhes || 'Erro ao excluir chamado.');
    _data.chamados = _data.chamados.filter(c => parseInt(c.id) !== parseInt(id));
    _data.metricas = null;
    return data;
  }

  // ── Usuários gerais
  function getUsuarios() { return _data.usuarios; }

  function getUsuario(id) {
    const u = _data.usuarios.find(u => u.id === id);
    if (u) return u;
    return { nome: 'Usuário', email: '', setor: '', avatar: '??' };
  }

  // ── Técnicos
  function getTecnicos() { return _data.tecnicos; }

  function getTecnico(id) {
    const t = _data.tecnicos.find(t => t.id === id);
    if (t) return t;
    return { nome: 'Não atribuído', especialidade: '', avatar: '--' };
  }

  // ── Categorias & Setores
  function getCategorias() { return _data.categorias; }
  function getSetores() { return _data.setores; }
  function getPrioridades() { return _data.prioridades; }

  // ── Automações
  function getAutomacoes() { return _data.automacoes; }

  function getAutomacao(id) {
    return _data.automacoes.find(a => a.id === id) || null;
  }

  // ── Config
  function getConfig() { return _data.config; }
  function setConfig(key, value) { _data.config[key] = value; }

  // ============================================================
  // OPERAÇÕES ADMINISTRATIVAS (API REAL)
  // ============================================================
  async function adminGetMetricas() {
    try {
      const res = await apiFetch('/admin/metricas-usuarios');
      if (res.ok) {
        _data.adminMetricas = await res.json();
        return _data.adminMetricas;
      }
      return null;
    } catch (e) {
      console.error('[DataStore] Erro ao buscar métricas admin:', e);
      return null;
    }
  }

  async function adminGetUsuarios(filtros = {}) {
    try {
      const params = new URLSearchParams();
      if (filtros.busca) params.append('busca', filtros.busca);
      if (filtros.setor) params.append('setor', filtros.setor);
      if (filtros.tipo) params.append('tipo', filtros.tipo);
      if (filtros.ativo !== undefined && filtros.ativo !== '') params.append('ativo', filtros.ativo);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await apiFetch(`/admin/usuarios${qs}`);
      if (res.ok) {
        _data.adminUsuarios = await res.json();
        return _data.adminUsuarios;
      }
      return [];
    } catch (e) {
      console.error('[DataStore] Erro ao listar usuários admin:', e);
      return [];
    }
  }

  async function adminGetUsuario(id) {
    try {
      const res = await apiFetch(`/admin/usuarios/${id}`);
      if (res.ok) return await res.json();
      return null;
    } catch (e) {
      console.error('[DataStore] Erro ao obter usuário admin:', e);
      return null;
    }
  }

  async function adminCriarUsuario(dados) {
    const res = await apiFetch('/admin/usuarios', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao criar usuário.');
    return data;
  }

  async function adminAtualizarUsuario(id, dados) {
    const res = await apiFetch(`/admin/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao atualizar usuário.');
    return data;
  }

  async function adminEnviarRedefinicaoSenha(id) {
    const res = await apiFetch(`/admin/usuarios/${id}/redefinir-senha`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao enviar redefinição de senha.');
    return data;
  }

  async function adminAlterarStatus(id, ativo) {
    const res = await apiFetch(`/admin/usuarios/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ ativo })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao alterar situação da conta.');
    return data;
  }

  async function adminExcluirUsuario(id) {
    const res = await apiFetch(`/admin/usuarios/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao excluir usuário.');
    return data;
  }

  // ============================================================
  // PERFIL DO USUÁRIO LOGADO
  // ============================================================
  async function perfilObter() {
    const res = await apiFetch('/perfil');
    if (!res.ok) throw new Error('Erro ao carregar dados do perfil.');
    return await res.json();
  }

  async function perfilAtualizar(dados) {
    const res = await apiFetch('/perfil', {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao salvar alterações do perfil.');
    return data;
  }

  async function perfilAlterarSenha(dados) {
    const res = await apiFetch('/perfil/senha', {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao alterar senha.');
    return data;
  }

  // ── Métricas de chamados (usa dados da API se disponíveis, senão calcula local)
  function getMetricas() {
    if (_data.metricas) return _data.metricas;

    const chamados = _data.chamados;
    const total = chamados.length;
    const abertos = chamados.filter(c => c.status === 'aberto').length;
    const emAnalise = chamados.filter(c => c.status === 'em_analise').length;
    const emDiagnostico = chamados.filter(c => c.status === 'em_diagnostico').length;
    const emAtendimento = chamados.filter(c => ['em_atendimento','tecnico_necessario'].includes(c.status)).length;
    const aguardandoAprovacao = chamados.filter(c => c.status === 'aguardando_aprovacao').length;
    const resolvidosIA = chamados.filter(c => c.status === 'resolvido_ia').length;
    const resolvidosTecnico = chamados.filter(c => c.status === 'resolvido').length;
    const totalResolvidos = resolvidosIA + resolvidosTecnico;
    const criticos = chamados.filter(c => c.prioridade === 'critica' && !['resolvido','resolvido_ia'].includes(c.status)).length;
    const taxaResolucaoIA = total > 0 ? Math.round((resolvidosIA / total) * 100) : 0;

    return {
      total, abertos, emAnalise, emDiagnostico, emAtendimento,
      aguardandoAprovacao, resolvidosIA, resolvidosTecnico,
      totalResolvidos, criticos, taxaResolucaoIA,
      pendentes: abertos + emAnalise + emDiagnostico + emAtendimento + aguardandoAprovacao
    };
  }

  // ── Status info
  function getStatusInfo(status) {
    const map = {
      'aberto': { label: 'Aberto', badge: 'badge-info', icon: '📋' },
      'em_analise': { label: 'Em Análise', badge: 'badge-primary', icon: '🔎' },
      'em_diagnostico': { label: 'Em Diagnóstico', badge: 'badge-primary', icon: '🔍' },
      'automacao': { label: 'Automação', badge: 'badge-primary', icon: '⚙️' },
      'verificacao': { label: 'Verificação', badge: 'badge-primary', icon: '✔️' },
      'em_andamento': { label: 'Em Andamento', badge: 'badge-warning', icon: '⚙️' },
      'em_atendimento': { label: 'Em Atendimento', badge: 'badge-warning', icon: '🔧' },
      'tecnico_necessario': { label: 'Técnico Necessário', badge: 'badge-warning', icon: '🔧' },
      'aguardando_aprovacao': { label: 'Aguardando Aprovação', badge: 'badge-warning', icon: '⏳' },
      'resolvido': { label: 'Resolvido', badge: 'badge-success', icon: '✅' },
      'resolvido_ia': { label: 'Resolvido pela IA', badge: 'badge-accent', icon: '🤖' },
      'reaberto': { label: 'Reaberto', badge: 'badge-warning', icon: '🔄' },
      'fechado': { label: 'Fechado', badge: 'badge-muted', icon: '🔒' },
    };
    return map[status] || { label: status, badge: 'badge-muted', icon: '❓' };
  }

  function getPrioridadeInfo(prioridade) {
    const map = {
      'baixa': { label: 'Baixa', badge: 'badge-success', slaHoras: 8 },
      'media': { label: 'Média', badge: 'badge-warning', slaHoras: 4 },
      'alta': { label: 'Alta', badge: 'badge-danger', slaHoras: 2 },
      'critica': { label: 'Crítica', badge: 'badge-danger', slaHoras: 1 },
    };
    return map[prioridade] || { label: prioridade || 'N/A', badge: 'badge-muted', slaHoras: 4 };
  }

  function getCategoriaInfo(categoria) {
    const map = {
      'impressora': { label: 'Impressora', icon: '🖨️' },
      'rede': { label: 'Rede', icon: '🌐' },
      'acesso': { label: 'Acesso/Conta', icon: '🔑' },
      'hardware': { label: 'Hardware', icon: '🖥️' },
      'software': { label: 'Software', icon: '💿' },
      'email': { label: 'E-mail', icon: '📧' },
      'vpn': { label: 'VPN', icon: '🔐' },
      'sistema': { label: 'Sistema', icon: '⚙️' },
      'outro': { label: 'Outro', icon: '📌' },
    };
    return map[categoria] || { label: categoria || 'Não classificado', icon: '❓' };
  }

  function getNivelAutomacaoInfo(nivel) {
    const map = {
      'automatico': { label: '🟢 Automático', badge: 'badge-success' },
      'aprovacao': { label: '🟡 Aprovação', badge: 'badge-warning' },
      'tecnico': { label: '🔴 Técnico', badge: 'badge-danger' },
    };
    return map[nivel] || { label: nivel, badge: 'badge-muted' };
  }

  function formatarData(isoString) {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      if (isNaN(d)) return '—';
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return '—'; }
  }

  function tempoRelativo(isoString) {
    if (!isoString) return '—';
    try {
      const agora = new Date();
      const data = new Date(isoString);
      if (isNaN(data)) return '—';
      const diff = agora - data;
      const mins = Math.floor(diff / 60000);
      const horas = Math.floor(diff / 3600000);
      const dias = Math.floor(diff / 86400000);
      if (mins < 1) return 'Agora mesmo';
      if (mins < 60) return `Há ${mins} min`;
      if (horas < 24) return `Há ${horas}h`;
      if (dias < 7) return `Há ${dias} dia${dias > 1 ? 's' : ''}`;
      return formatarData(isoString);
    } catch { return '—'; }
  }

  // Calcular SLA status
  function getSLAStatus(chamado) {
    const criado = new Date(chamado.criado_em || chamado.criadoEm);
    const slaHoras = chamado.sla || 4;
    const limite = new Date(criado.getTime() + slaHoras * 3600000);
    const agora = new Date();
    const diff = limite - agora;

    if (['resolvido', 'resolvido_ia'].includes(chamado.status)) {
      return { status: 'resolvido', label: 'Resolvido', cor: 'success' };
    }
    if (diff < 0) return { status: 'vencido', label: `Vencido há ${Math.abs(Math.round(diff/3600000))}h`, cor: 'danger' };
    if (diff < 3600000) return { status: 'critico', label: `< 1h restante`, cor: 'danger' };
    if (diff < slaHoras * 3600000 * 0.5) return { status: 'alerta', label: `${Math.round(diff/3600000)}h restantes`, cor: 'warning' };
    return { status: 'ok', label: `${Math.round(diff/3600000)}h restantes`, cor: 'success' };
  }

  return {
    apiFetch,
    carregarTudo,
    carregarMetricas,
    getChamados,
    getChamadoById,
    atualizarChamadoUnico,
    adminExcluirChamado,
    getUsuarios,
    getUsuario,
    getTecnicos,
    getTecnico,
    getCategorias,
    getSetores,
    getPrioridades,
    getAutomacoes,
    getAutomacao,
    getConfig,
    setConfig,
    getMetricas,
    getStatusInfo,
    getPrioridadeInfo,
    getCategoriaInfo,
    getNivelAutomacaoInfo,
    formatarData,
    tempoRelativo,
    getSLAStatus,
    // Admin methods
    adminGetMetricas,
    adminGetUsuarios,
    adminGetUsuario,
    adminCriarUsuario,
    adminAtualizarUsuario,
    adminEnviarRedefinicaoSenha,
    adminAlterarStatus,
    adminExcluirUsuario,
    // Perfil methods
    perfilObter,
    perfilAtualizar,
    perfilAlterarSenha,
    getApiUrl
  };
})();
