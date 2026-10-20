// ============================================
// SISTEMA DE CHAMADOS COM IA — CONTROLADOR PRINCIPAL
// ============================================

const App = (() => {
  let paginaAtual = 'dashboard';
  let chamadoAtual = null;
  let filtroStatus = '';
  let filtroPrioridade = '';
  let filtroBusca = '';

  // ---------- Inicialização ----------
  async function init() {
    const resetToken = new URLSearchParams(location.search).get('reset_token');
    if (resetToken) {
      document.getElementById('app-layout').style.display = 'none';
      document.getElementById('auth-layout').style.display = 'flex';
      renderRedefinirSenha(resetToken);
      return;
    }

    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      mostrarAuth();
      return;
    }

    try {
      DataStore.setConfig('usuarioAtual', JSON.parse(userStr).id);
      DataStore.setConfig('token', token);
      esconderAuth();
    } catch (e) {
      mostrarAuth();
      return;
    }

    // Registrar navegação
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const pagina = item.dataset.page;
        if (pagina) navegarPara(pagina);
      });
    });

    // Menu toggle (mobile)
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('open');
      });
    }

    // Fechar sidebar ao clicar fora (mobile)
    document.addEventListener('click', (e) => {
      const sidebar = document.querySelector('.sidebar');
      const toggle = document.getElementById('menu-toggle');
      if (sidebar && sidebar.classList.contains('open') &&
          !sidebar.contains(e.target) && !toggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });

    // Atualizar info do usuário na sidebar e perfil
    const user = JSON.parse(userStr);
    const sidebarUser = document.querySelector('.sidebar-user');
    if (sidebarUser) {
      const tipoBadge = user.tipo === 'administrador' ? '👑 Administrador' : (user.tipo === 'tecnico' ? '🔧 Técnico' : '👤 Usuário');
      sidebarUser.innerHTML = `
        <div class="user-avatar" onclick="App.navegarPara('perfil')" style="cursor: pointer;" title="Ver meu perfil">${user.avatar || 'U'}</div>
        <div class="user-info">
          <div class="user-name" onclick="App.navegarPara('perfil')" style="cursor: pointer;" title="Ver meu perfil">${user.nome}</div>
          <div class="user-role">${tipoBadge} · ${user.setor}</div>
          <div style="display: flex; gap: 8px; margin-top: 4px;">
            <a href="#" onclick="App.navegarPara('perfil'); return false;" style="font-size: 0.72rem; color: var(--primary-light); text-decoration: none;">Meu Perfil</a>
            <span style="font-size: 0.72rem; color: var(--text-muted);">•</span>
            <a href="#" onclick="App.logout(); return false;" style="font-size: 0.72rem; color: var(--danger); text-decoration: none;">Sair</a>
          </div>
        </div>
      `;
    }

    // Exibir ou ocultar seção administrativa baseada no perfil
    const adminSection = document.getElementById('nav-section-admin');
    if (adminSection) {
      adminSection.style.display = (user.tipo === 'administrador') ? 'block' : 'none';
    }

    // Ocultar Painel do Técnico para usuários comuns
    const tecNavItem = document.querySelector('.nav-item[data-page="tecnico"]');
    if (tecNavItem) {
      tecNavItem.style.display = (user.tipo === 'usuario') ? 'none' : 'flex';
    }

    // Mostrar spinner enquanto carrega
    const content = document.getElementById('page-content');
    if (content) content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:300px;"><div class="spinner"></div><span style="margin-left:12px;color:var(--text-muted);">Carregando dados...</span></div>';

    // Carregar dados da API antes de renderizar
    await DataStore.carregarTudo();
    await DataStore.carregarMetricas();

    // Render inicial
    navegarPara('dashboard');
    atualizarBadges();
  }

  // ---------- Autenticação ----------
  function mostrarAuth() {
    document.getElementById('app-layout').style.display = 'none';
    document.getElementById('auth-layout').style.display = 'flex';
    renderLogin();
  }

  function esconderAuth() {
    document.getElementById('auth-layout').style.display = 'none';
    document.getElementById('app-layout').style.display = 'flex';
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  }

  function preencherLogin(email, senha) {
    const emailEl = document.getElementById('login-email');
    const senhaEl = document.getElementById('login-senha');
    if (emailEl) emailEl.value = email;
    if (senhaEl) senhaEl.value = senha;
  }

  function renderLogin() {
    const container = document.getElementById('auth-form-container');
    const apiUrl = DataStore.getApiUrl();
    container.innerHTML = `
      <form onsubmit="App.realizarLogin(event)">
        <div class="form-group">
          <label class="form-label">E-mail</label>
          <input type="email" id="login-email" class="form-input" required placeholder="seu@email.com">
        </div>
        <div class="form-group">
          <label class="form-label">Senha</label>
          <input type="password" id="login-senha" class="form-input" required placeholder="Sua senha">
        </div>
        <button type="submit" id="btn-login-submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Entrar</button>
        <div style="text-align:right;margin-top:10px;"><a href="#" onclick="App.renderEsqueciSenha();return false;" style="color:var(--primary-light);font-size:.85rem;">Esqueci minha senha</a></div>
      </form>
      <div style="text-align: center; margin-top: 1rem;">
        <a href="#" onclick="App.renderRegister()" style="color: var(--primary-light); font-size: 0.9rem;">Não tem conta? Cadastre-se</a>
      </div>

      <!-- Acesso Rápido para Apresentação -->
      <div style="margin-top: 1.4rem; padding: 12px; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); text-align: left;">
        <div style="font-size: 0.73rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
          🔑 Perfis de Demonstração (Clique para Preencher):
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button type="button" class="btn btn-outline btn-sm" style="font-size: 0.75rem; justify-content: flex-start; padding: 6px 10px;" onclick="App.preencherLogin('carlos@empresa.com', 'admin123')">
            👑 Carlos (Administrador) · carlos@empresa.com
          </button>
          <button type="button" class="btn btn-outline btn-sm" style="font-size: 0.75rem; justify-content: flex-start; padding: 6px 10px;" onclick="App.preencherLogin('rafael@empresa.com', 'admin123')">
            🔧 Rafael (Técnico de TI) · rafael@empresa.com
          </button>
          <button type="button" class="btn btn-outline btn-sm" style="font-size: 0.75rem; justify-content: flex-start; padding: 6px 10px;" onclick="App.preencherLogin('joao@empresa.com', 'admin123')">
            👤 João (Usuário Solicitante) · joao@empresa.com
          </button>
        </div>
      </div>

      <div style="margin-top: 1rem; padding: 8px 12px; background: var(--bg-glass); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 0.75rem; color: var(--text-muted); text-align: center;">
        Servidor API: <span style="color: var(--primary-light); font-weight: 600;">${apiUrl}</span>
      </div>
    `;
    document.getElementById('auth-subtitle').textContent = 'Faça login para continuar';
  }

  function renderRegister() {
    const container = document.getElementById('auth-form-container');
    container.innerHTML = `
      <form onsubmit="App.realizarCadastro(event)">
        <div class="form-group">
          <label class="form-label">Nome Completo</label>
          <input type="text" id="reg-nome" class="form-input" required placeholder="Ex: João da Silva">
        </div>
        <div class="form-group">
          <label class="form-label">E-mail</label>
          <input type="email" id="reg-email" class="form-input" required placeholder="Ex: joao@email.com">
        </div>
        <div class="form-group">
          <label class="form-label">Senha</label>
          <input type="password" id="reg-senha" class="form-input" required placeholder="Mínimo 6 caracteres" minlength="6">
        </div>
        <div class="form-group">
          <label class="form-label">Confirmar Senha</label>
          <input type="password" id="reg-confirmacao" class="form-input" required placeholder="Repita a senha" minlength="6">
        </div>
        <div class="form-group">
          <label class="form-label">Setor</label>
          <select id="reg-setor" class="form-select" required>
            <option value="">Selecione...</option>
            <option value="Administrativo">Administrativo</option>
            <option value="TI">TI</option>
            <option value="Financeiro">Financeiro</option>
            <option value="RH">RH</option>
            <option value="Marketing">Marketing</option>
            <option value="Vendas">Vendas</option>
            <option value="Logística">Logística</option>
            <option value="Operações">Operações</option>
          </select>
        </div>
        <button type="submit" id="btn-reg-submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Criar Conta</button>
      </form>
      <div style="text-align: center; margin-top: 1rem;">
        <a href="#" onclick="App.renderLogin()" style="color: var(--primary-light); font-size: 0.9rem;">Já tem conta? Faça login</a>
      </div>
    `;
    document.getElementById('auth-subtitle').textContent = 'Crie sua conta para acessar';
  }

  async function realizarLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;
    const btn = document.getElementById('btn-login-submit');
    const apiUrl = DataStore.getApiUrl();

    if (!email || !senha) {
      Components.showToast('warning', 'Campos Obrigatórios', 'Por favor, informe seu e-mail e sua senha.');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner spinner-sm" style="margin-right: 6px;"></span> Entrando...';
    }

    try {
      let res;
      try {
        res = await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, senha })
        });
      } catch (networkErr) {
        console.error('[AUTH] Falha de conexão com o servidor:', networkErr);
        throw new Error(
          `Falha de conexão com o backend (${apiUrl}). Verifique se o servidor Express está iniciado com "node backend/server.js" e se a porta 3000 está acessível.`
        );
      }

      let data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = { error: `Resposta inválida do servidor (HTTP ${res.status}).` };
      }

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Credenciais inválidas. Verifique seu e-mail e senha.');
        } else if (res.status === 403) {
          throw new Error(data.error || 'Conta de usuário desativada. Entre em contato com a administração.');
        } else if (res.status === 404) {
          throw new Error(`Rota de autenticação não encontrada no servidor (${apiUrl}/auth/login).`);
        } else if (res.status >= 500) {
          throw new Error(data.error || 'Erro interno no servidor ao realizar login. Verifique os logs do backend.');
        } else {
          throw new Error(data.error || `Erro de validação (HTTP ${res.status}).`);
        }
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      Components.showToast('success', 'Login Concluído', `Bem-vindo(a), ${data.user.nome}!`);
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Entrar';
      }
      Components.showToast('danger', 'Erro de Acesso', err.message, 6000);
    }
  }

  async function realizarCadastro(e) {
    e.preventDefault();
    const nome = document.getElementById('reg-nome').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const senha = document.getElementById('reg-senha').value;
    const confirmacaoSenha = document.getElementById('reg-confirmacao').value;
    const setor = document.getElementById('reg-setor').value;
    const btn = document.getElementById('btn-reg-submit');
    const apiUrl = DataStore.getApiUrl();

    if (senha !== confirmacaoSenha) {
      Components.showToast('warning', 'Validação de Senha', 'A confirmação de senha não confere com a senha digitada.');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner spinner-sm" style="margin-right: 6px;"></span> Criando Conta...';
    }

    try {
      let res;
      try {
        res = await fetch(`${apiUrl}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, email, senha, confirmacaoSenha, setor })
        });
      } catch (networkErr) {
        console.error('[AUTH] Falha de conexão ao registrar:', networkErr);
        throw new Error(
          `Falha de conexão com o backend (${apiUrl}). Verifique se o servidor Express está iniciado com "node backend/server.js".`
        );
      }

      let data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = { error: `Resposta inválida do servidor (HTTP ${res.status}).` };
      }

      if (!res.ok) {
        if (res.status === 400 && data.error && data.error.includes('em uso')) {
          throw new Error('Este e-mail já está cadastrado por outro usuário.');
        } else {
          throw new Error(data.error || `Erro ao cadastrar usuário (HTTP ${res.status}).`);
        }
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      Components.showToast('success', 'Cadastro Realizado', 'Conta criada com sucesso!');
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Criar Conta';
      }
      Components.showToast('danger', 'Erro no Cadastro', err.message, 6000);
    }
  }

  // ---------- Navegação ----------
  function navegarPara(pagina, param) {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    // Proteção de rotas administrativas no frontend
    if (['admin', 'admin-usuarios'].includes(pagina)) {
      if (!user || user.tipo !== 'administrador') {
        Components.showToast('danger', 'Acesso Restrito', 'Você não possui permissão para acessar a área administrativa.');
        pagina = 'dashboard';
      }
    }

    // Proteção da rota do painel do técnico
    if (pagina === 'tecnico') {
      if (!user || user.tipo === 'usuario') {
        Components.showToast('danger', 'Acesso Restrito', 'O Painel do Técnico é restrito a técnicos e administradores.');
        pagina = 'dashboard';
      }
    }

    paginaAtual = pagina;

    // Atualizar nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === pagina);
    });

    // Fechar sidebar mobile
    document.querySelector('.sidebar')?.classList.remove('open');

    // Atualizar header
    const titleMap = {
      dashboard: 'Dashboard',
      chamados: 'Chamados',
      novo: 'Novo Chamado',
      detalhe: `Chamado #${param || ''}`,
      tecnico: 'Painel do Técnico',
      automacoes: 'Automações',
      admin: 'Painel Administrativo',
      'admin-usuarios': 'Gerenciamento de Usuários',
      perfil: 'Meu Perfil'
    };
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = titleMap[pagina] || 'Sistema';

    // Render da página
    const content = document.getElementById('page-content');
    if (!content) return;

    switch (pagina) {
      case 'dashboard':
        renderDashboard();
        break;
      case 'chamados':
        renderChamados();
        break;
      case 'novo':
        renderNovoChamado();
        break;
      case 'detalhe':
        chamadoAtual = parseInt(param);
        renderDetalhe(chamadoAtual);
        break;
      case 'tecnico':
        renderTecnico();
        break;
      case 'automacoes':
        renderAutomacoes();
        break;
      case 'admin':
        renderAdminDashboard();
        break;
      case 'admin-usuarios':
        renderAdminUsuarios();
        break;
      case 'perfil':
        renderPerfil();
        break;
      default:
        renderDashboard();
    }
  }

  // ---------- Dashboard ----------
  function renderDashboard() {
    const metricas = DataStore.getMetricas();
    const chamadosRecentes = DataStore.getChamados().slice(0, 5);
    const automacoes = DataStore.getAutomacoes() || [];
    const autoCount = automacoes.filter(a => a.nivel === 'automatico').length;
    const aprovCount = automacoes.filter(a => a.nivel === 'aprovacao').length;
    const tecCount = automacoes.filter(a => a.nivel === 'tecnico').length;

    // Métricas reais de distribuição por prioridade
    const totalPrio = metricas.total || 1;
    const prioCritica = (metricas.porPrioridade && metricas.porPrioridade.critica) || 0;
    const prioAlta = (metricas.porPrioridade && metricas.porPrioridade.alta) || 0;
    const prioMedia = (metricas.porPrioridade && metricas.porPrioridade.media) || 0;
    const prioBaixa = (metricas.porPrioridade && metricas.porPrioridade.baixa) || 0;

    // Métricas reais de distribuição por status
    const statusAberto = (metricas.porStatus && metricas.porStatus.aberto) || metricas.abertos || 0;
    const statusDiag = ((metricas.porStatus && metricas.porStatus.em_diagnostico) || 0) + ((metricas.porStatus && metricas.porStatus.em_analise) || 0);
    const statusAtend = ((metricas.porStatus && metricas.porStatus.em_atendimento) || 0) + ((metricas.porStatus && metricas.porStatus.tecnico_necessario) || 0) + ((metricas.porStatus && metricas.porStatus.automacao) || 0);
    const statusAprov = (metricas.porStatus && metricas.porStatus.aguardando_aprovacao) || metricas.aguardandoAprovacao || 0;
    const statusResolvIA = (metricas.porStatus && metricas.porStatus.resolvido_ia) || metricas.resolvidosIA || 0;
    const statusResolvTec = (metricas.porStatus && metricas.porStatus.resolvido) || metricas.resolvidos || 0;

    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="stats-grid">
        ${Components.renderStatCard({ valor: metricas.total, label: 'Total de Chamados', icon: '📊', tipo: 'primary' })}
        ${Components.renderStatCard({ valor: metricas.pendentes, label: 'Pendentes / Em Aberto', icon: '⏳', tipo: 'warning' })}
        ${Components.renderStatCard({ valor: metricas.resolvidosIA, label: 'Resolvidos pela IA', icon: '🤖', tipo: 'accent', trend: 'up', trendValor: `${metricas.taxaResolucaoIA}%` })}
        ${Components.renderStatCard({ valor: metricas.totalResolvidos, label: 'Total Resolvidos', icon: '✅', tipo: 'success' })}
        ${Components.renderStatCard({ valor: metricas.aguardandoAprovacao, label: 'Aguardando Aprovação', icon: '🔐', tipo: 'info' })}
        ${Components.renderStatCard({ valor: metricas.criticos, label: 'Críticos Ativos', icon: '🚨', tipo: 'danger' })}
      </div>

      <div class="grid-2">
        <!-- Chamados Recentes -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📋 Chamados Recentes</h3>
            <button class="btn btn-ghost btn-sm" onclick="App.navegarPara('chamados')">Ver todos →</button>
          </div>
          <div class="card-body" style="padding: 0;">
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Chamado</th>
                    <th>Status</th>
                    <th>Prioridade</th>
                  </tr>
                </thead>
                <tbody>
                  ${chamadosRecentes.length > 0 ? chamadosRecentes.map(c => {
                    const user = DataStore.getUsuario(c.usuario_id || c.usuario);
                    const status = DataStore.getStatusInfo(c.status);
                    const prio = DataStore.getPrioridadeInfo(c.prioridade);
                    return `
                      <tr onclick="App.navegarPara('detalhe', ${c.id})" class="animate-slide-in" style="cursor: pointer;">
                        <td><span style="color: var(--text-muted); font-weight: 700;">${c.numero || '#'+c.id}</span></td>
                        <td>
                          <div style="font-weight: 600; font-size: 0.85rem;">${c.titulo}</div>
                          <div style="font-size: 0.73rem; color: var(--text-muted);">${c.usuario_nome || user.nome} · ${DataStore.tempoRelativo(c.criado_em || c.criadoEm)}</div>
                        </td>
                        <td><span class="badge badge-dot ${status.badge}">${status.label}</span></td>
                        <td><span class="badge ${prio.badge}">${prio.label}</span></td>
                      </tr>
                    `;
                  }).join('') : `
                    <tr>
                      <td colspan="4" style="text-align: center; padding: 24px; color: var(--text-muted);">
                        Nenhum chamado registrado no momento.
                      </td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Atividade IA -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">🧠 Atividade da IA</h3>
          </div>
          <div class="card-body">
            <div style="margin-bottom: 20px;">
              <div class="flex justify-between mb-sm">
                <span style="font-size: 0.8rem; color: var(--text-secondary);">Taxa de Resolução Automática</span>
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary-light);">${metricas.taxaResolucaoIA}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill primary" style="width: ${metricas.taxaResolucaoIA}%"></div>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: var(--bg-glass); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                <span style="font-size: 1.2rem;">🟢</span>
                <div style="flex: 1;">
                  <div style="font-size: 0.8rem; font-weight: 600;">Automações Automáticas (Nível 1)</div>
                  <div style="font-size: 0.73rem; color: var(--text-muted);">${autoCount} no catálogo — execução imediata pela IA</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: var(--bg-glass); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                <span style="font-size: 1.2rem;">🟡</span>
                <div style="flex: 1;">
                  <div style="font-size: 0.8rem; font-weight: 600;">Com Aprovação Técnica (Nível 2)</div>
                  <div style="font-size: 0.73rem; color: var(--text-muted);">${aprovCount} no catálogo — exigem aval do técnico</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: var(--bg-glass); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                <span style="font-size: 1.2rem;">🔴</span>
                <div style="flex: 1;">
                  <div style="font-size: 0.8rem; font-weight: 600;">Somente Técnico (Nível 3)</div>
                  <div style="font-size: 0.73rem; color: var(--text-muted);">${tecCount} no catálogo — IA recomenda, humano executa</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Distribuição por Prioridade e Status (Dados Reais do Banco) -->
      <div class="grid-2" style="margin-top: 24px;">
        <!-- Distribuição por Status -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📊 Distribuição por Status</h3>
            <span class="badge badge-primary">${metricas.total} chamados</span>
          </div>
          <div class="card-body">
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 4px;">
                  <span>📋 Abertos / Triagem</span>
                  <span style="font-weight: 700;">${statusAberto} (${metricas.total > 0 ? Math.round((statusAberto/metricas.total)*100) : 0}%)</span>
                </div>
                <div class="progress-bar" style="height: 6px;"><div class="progress-fill" style="width: ${metricas.total > 0 ? (statusAberto/metricas.total)*100 : 0}%; background: var(--info);"></div></div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 4px;">
                  <span>🔍 Em Diagnóstico / IA</span>
                  <span style="font-weight: 700;">${statusDiag} (${metricas.total > 0 ? Math.round((statusDiag/metricas.total)*100) : 0}%)</span>
                </div>
                <div class="progress-bar" style="height: 6px;"><div class="progress-fill" style="width: ${metricas.total > 0 ? (statusDiag/metricas.total)*100 : 0}%; background: var(--primary);"></div></div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 4px;">
                  <span>⏳ Aguardando Aprovação</span>
                  <span style="font-weight: 700;">${statusAprov} (${metricas.total > 0 ? Math.round((statusAprov/metricas.total)*100) : 0}%)</span>
                </div>
                <div class="progress-bar" style="height: 6px;"><div class="progress-fill" style="width: ${metricas.total > 0 ? (statusAprov/metricas.total)*100 : 0}%; background: var(--warning);"></div></div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 4px;">
                  <span>🔧 Em Atendimento Técnico</span>
                  <span style="font-weight: 700;">${statusAtend} (${metricas.total > 0 ? Math.round((statusAtend/metricas.total)*100) : 0}%)</span>
                </div>
                <div class="progress-bar" style="height: 6px;"><div class="progress-fill" style="width: ${metricas.total > 0 ? (statusAtend/metricas.total)*100 : 0}%; background: #FF9800;"></div></div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 4px;">
                  <span>🤖 Resolvido Automaticamente pela IA</span>
                  <span style="font-weight: 700; color: var(--accent);">${statusResolvIA} (${metricas.total > 0 ? Math.round((statusResolvIA/metricas.total)*100) : 0}%)</span>
                </div>
                <div class="progress-bar" style="height: 6px;"><div class="progress-fill" style="width: ${metricas.total > 0 ? (statusResolvIA/metricas.total)*100 : 0}%; background: var(--accent);"></div></div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 4px;">
                  <span>✅ Resolvido pela Equipe Técnica</span>
                  <span style="font-weight: 700; color: var(--success);">${statusResolvTec} (${metricas.total > 0 ? Math.round((statusResolvTec/metricas.total)*100) : 0}%)</span>
                </div>
                <div class="progress-bar" style="height: 6px;"><div class="progress-fill" style="width: ${metricas.total > 0 ? (statusResolvTec/metricas.total)*100 : 0}%; background: var(--success);"></div></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Distribuição por Prioridade -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">🎯 Distribuição por Prioridade</h3>
            <span class="badge badge-accent">SLA & Criticidade</span>
          </div>
          <div class="card-body">
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 4px;">
                  <span style="color: var(--danger); font-weight: 600;">🚨 Crítica (SLA 1h)</span>
                  <span style="font-weight: 700;">${prioCritica} chamados</span>
                </div>
                <div class="progress-bar" style="height: 8px;"><div class="progress-fill" style="width: ${metricas.total > 0 ? (prioCritica/metricas.total)*100 : 0}%; background: var(--danger);"></div></div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 4px;">
                  <span style="color: #FF9800; font-weight: 600;">🟠 Alta (SLA 2h)</span>
                  <span style="font-weight: 700;">${prioAlta} chamados</span>
                </div>
                <div class="progress-bar" style="height: 8px;"><div class="progress-fill" style="width: ${metricas.total > 0 ? (prioAlta/metricas.total)*100 : 0}%; background: #FF9800;"></div></div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 4px;">
                  <span style="color: var(--warning); font-weight: 600;">🟡 Média (SLA 4h)</span>
                  <span style="font-weight: 700;">${prioMedia} chamados</span>
                </div>
                <div class="progress-bar" style="height: 8px;"><div class="progress-fill" style="width: ${metricas.total > 0 ? (prioMedia/metricas.total)*100 : 0}%; background: var(--warning);"></div></div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 4px;">
                  <span style="color: var(--success); font-weight: 600;">🟢 Baixa (SLA 8h)</span>
                  <span style="font-weight: 700;">${prioBaixa} chamados</span>
                </div>
                <div class="progress-bar" style="height: 8px;"><div class="progress-fill" style="width: ${metricas.total > 0 ? (prioBaixa/metricas.total)*100 : 0}%; background: var(--success);"></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ---------- Lista de Chamados ----------
  function renderChamados() {
    let chamados = DataStore.getChamados();

    // Aplicar filtros
    if (filtroStatus) {
      chamados = chamados.filter(c => c.status === filtroStatus);
    }
    if (filtroPrioridade) {
      chamados = chamados.filter(c => c.prioridade === filtroPrioridade);
    }
    if (filtroBusca) {
      const busca = IAEngine.normalizar(filtroBusca);
      chamados = chamados.filter(c =>
        IAEngine.normalizar(c.titulo).includes(busca) ||
        IAEngine.normalizar(c.descricao).includes(busca) ||
        String(c.id).includes(busca)
      );
    }

    const content = document.getElementById('page-content');
    const usuarioLogado = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = usuarioLogado.tipo === 'administrador';
    content.innerHTML = `
      <div class="flex justify-between items-center mb-lg" style="flex-wrap: wrap; gap: 12px;">
        <h2 style="font-size: 1.3rem; font-weight: 800;">Chamados</h2>
        <button class="btn btn-accent" onclick="App.navegarPara('novo')">➕ Novo Chamado</button>
      </div>

      <div class="filters-bar">
        <div class="search-box">
          <span class="search-box-icon">🔍</span>
          <input type="text" placeholder="Buscar chamados..." value="${filtroBusca}" oninput="App.filtrar('busca', this.value)">
        </div>
        <select class="filter-select" onchange="App.filtrar('status', this.value)">
          <option value="">Todos os Status</option>
          <option value="aberto" ${filtroStatus === 'aberto' ? 'selected' : ''}>Aberto</option>
          <option value="em_diagnostico" ${filtroStatus === 'em_diagnostico' ? 'selected' : ''}>Em Diagnóstico</option>
          <option value="em_andamento" ${filtroStatus === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
          <option value="aguardando_aprovacao" ${filtroStatus === 'aguardando_aprovacao' ? 'selected' : ''}>Aguardando Aprovação</option>
          <option value="resolvido_ia" ${filtroStatus === 'resolvido_ia' ? 'selected' : ''}>Resolvido pela IA</option>
          <option value="resolvido" ${filtroStatus === 'resolvido' ? 'selected' : ''}>Resolvido</option>
        </select>
        <select class="filter-select" onchange="App.filtrar('prioridade', this.value)">
          <option value="">Todas Prioridades</option>
          <option value="critica" ${filtroPrioridade === 'critica' ? 'selected' : ''}>Crítica</option>
          <option value="alta" ${filtroPrioridade === 'alta' ? 'selected' : ''}>Alta</option>
          <option value="media" ${filtroPrioridade === 'media' ? 'selected' : ''}>Média</option>
          <option value="baixa" ${filtroPrioridade === 'baixa' ? 'selected' : ''}>Baixa</option>
        </select>
      </div>

      <div class="card">
        <div class="card-body" style="padding: 0;">
          ${chamados.length > 0 ? `
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Chamado</th>
                    <th>Status</th>
                    <th>Prioridade</th>
                    <th>Categoria</th>
                    <th>Criado</th>
                    ${isAdmin ? '<th style="text-align:center;">Ações</th>' : ''}
                  </tr>
                </thead>
                <tbody>
                  ${chamados.map(c => Components.renderChamadoRow(c, isAdmin)).join('')}
                </tbody>
              </table>
            </div>
          ` : Components.renderEmptyState(
            '📭',
            'Nenhum chamado encontrado',
            'Não há chamados com os filtros selecionados.',
            '<button class="btn btn-accent" onclick="App.navegarPara(\'novo\')">➕ Criar Chamado</button>'
          )}
        </div>
      </div>
    `;
  }

  function filtrar(tipo, valor) {
    switch (tipo) {
      case 'status': filtroStatus = valor; break;
      case 'prioridade': filtroPrioridade = valor; break;
      case 'busca': filtroBusca = valor; break;
    }
    renderChamados();
  }

  // ---------- Novo Chamado ----------
  function renderNovoChamado() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div style="max-width: 700px; margin: 0 auto;">
        <h2 style="font-size: 1.3rem; font-weight: 800; margin-bottom: 8px;">Abrir Novo Chamado</h2>
        <p style="color: var(--text-secondary); margin-bottom: 28px; font-size: 0.9rem;">
          Descreva o seu problema. Nossa IA irá classificar e iniciar o diagnóstico automaticamente.
        </p>

        <div class="card">
          <div class="card-body">
            <form id="form-novo-chamado" onsubmit="App.submitNovoChamado(event)">
              <div class="form-group">
                <label class="form-label">Título do Problema</label>
                <input type="text" class="form-input" id="chamado-titulo" placeholder="Ex: Minha impressora não imprime" required maxlength="100">
              </div>

              <div class="grid-2" style="margin-bottom: 16px;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">Categoria do Problema</label>
                  <select class="form-select" id="chamado-categoria">
                    <option value="auto">🤖 Identificação Automática pela IA (Recomendado)</option>
                    <option value="impressora">🖨️ Impressora / Fila de Impressão</option>
                    <option value="rede">🌐 Rede / Internet / Conexão</option>
                    <option value="acesso">🔑 Acesso / Conta / Senha</option>
                    <option value="vpn">🔐 VPN / Acesso Remoto</option>
                    <option value="software">💿 Software / Aplicativo</option>
                    <option value="hardware">🖥️ Hardware / Equipamento</option>
                    <option value="outro">📌 Outro</option>
                  </select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label">Prioridade Estimada</label>
                  <select class="form-select" id="chamado-prioridade">
                    <option value="auto">🤖 Definir Automaticamente pela IA (Recomendado)</option>
                    <option value="baixa">🟢 Baixa (SLA 8 horas)</option>
                    <option value="media">🟡 Média (SLA 4 horas)</option>
                    <option value="alta">🟠 Alta (SLA 2 horas)</option>
                    <option value="critica">🔴 Crítica (SLA 1 hora - Bloqueio)</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Descreva o Problema em Detalhes</label>
                <textarea class="form-textarea" id="chamado-descricao" placeholder="Quanto mais detalhes, melhor a IA conseguirá diagnosticar. Inclua: o que aconteceu, quando começou, mensagens de erro, etc." required minlength="10" style="min-height: 140px;"></textarea>
              </div>

              <div class="form-group" style="padding: 12px 16px; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                <label class="form-label" style="margin-bottom: 4px;">Solicitante (Você)</label>
                <div style="font-weight: 600;">${JSON.parse(localStorage.getItem('user') || '{}').nome || 'Usuário'}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${JSON.parse(localStorage.getItem('user') || '{}').setor || 'N/A'}</div>
              </div>

              <div style="display: flex; gap: 12px; margin-top: 24px;">
                <button type="submit" class="btn btn-accent btn-lg" style="flex: 1;" id="btn-submit-chamado">
                  🤖 Enviar para Análise da IA
                </button>
                <button type="button" class="btn btn-outline btn-lg" onclick="App.navegarPara('chamados')">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Sugestões rápidas -->
        <div style="margin-top: 24px;">
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">💡 Exemplos rápidos (clique para preencher):</p>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${[
              { titulo: 'Impressora não imprime', categoria: 'impressora', prio: 'media', desc: 'Minha impressora do setor parou de imprimir. Já tentei reiniciar o computador mas não resolveu. Os documentos ficam na fila mas não saem.' },
              { titulo: 'Internet muito lenta', categoria: 'rede', prio: 'alta', desc: 'A internet está extremamente lenta na minha estação de trabalho. Páginas demoram muito para carregar e videoconferências ficam travando.' },
              { titulo: 'Usuário bloqueado', categoria: 'acesso', prio: 'alta', desc: 'Não consigo acessar o sistema. Aparece mensagem de usuário bloqueado após algumas tentativas de senha incorreta.' },
              { titulo: 'VPN não conecta', categoria: 'vpn', prio: 'media', desc: 'Estou em home office e a VPN não conecta. Aparece erro de timeout quando tento estabelecer a conexão.' },
            ].map(ex => `
              <button class="btn btn-outline btn-sm" onclick="document.getElementById('chamado-titulo').value='${ex.titulo}'; document.getElementById('chamado-descricao').value='${ex.desc}'; document.getElementById('chamado-categoria').value='${ex.categoria}'; document.getElementById('chamado-prioridade').value='${ex.prio}';">
                ${ex.titulo}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  async function submitNovoChamado(event) {
    event.preventDefault();

    const titulo = document.getElementById('chamado-titulo').value.trim();
    const descricao = document.getElementById('chamado-descricao').value.trim();
    const categoriaVal = document.getElementById('chamado-categoria')?.value;
    const prioridadeVal = document.getElementById('chamado-prioridade')?.value;
    const categoria = categoriaVal && categoriaVal !== 'auto' ? categoriaVal : null;
    const prioridade = prioridadeVal && prioridadeVal !== 'auto' ? prioridadeVal : null;
    const usuario_id = JSON.parse(localStorage.getItem('user')).id;

    if (!titulo || !descricao) {
      Components.showToast('warning', 'Campos obrigatórios', 'Preencha o título e a descrição do problema.');
      return;
    }

    // Atualizar usuário atual no config
    if (usuario_id) DataStore.setConfig('usuarioAtual', usuario_id);

    // Desabilitar botão
    const btn = document.getElementById('btn-submit-chamado');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-sm"></div> Enviando para IA...';

    try {
      const chamado = await Chamados.abrirChamado(titulo, descricao, categoria, prioridade);
      if (!chamado) throw new Error('Chamado não retornado');

      Components.showToast('success', 'Chamado criado!', `${chamado.numero || '#'+chamado.id} — A IA está analisando...`);
      atualizarBadges();

      // Ir para detalhe e iniciar polling
      navegarPara('detalhe', chamado.id);
      iniciarPollingChamado(chamado.id);

    } catch (err) {
      console.error('[APP] Erro ao criar chamado:', err);
      Components.showToast('danger', 'Erro ao criar chamado', err.message || 'Verifique a conexão com o servidor.');
      btn.disabled = false;
      btn.innerHTML = '🤖 Enviar para Análise da IA';
    }
  }

  // Polling para acompanhar processamento da IA
  function iniciarPollingChamado(chamadoId) {
    let tentativas = 0;
    const poll = setInterval(async () => {
      tentativas++;
      const atualizado = await DataStore.atualizarChamadoUnico(chamadoId);
      if (!atualizado) { clearInterval(poll); return; }

      // Atualizar view se estivermos na página de detalhe do chamado
      if (paginaAtual === 'detalhe' && chamadoAtual === chamadoId) {
        renderDetalhe(chamadoId);
      }
      atualizarBadges();

      const statusFinal = ['resolvido_ia','resolvido','tecnico_necessario','aguardando_aprovacao','em_atendimento'];
      if (statusFinal.includes(atualizado.status)) {
        clearInterval(poll);
        if (atualizado.status === 'resolvido_ia') {
          Components.showToast('success', '🤖 Resolvido pela IA!', `Chamado ${atualizado.numero || '#'+atualizado.id} resolvido automaticamente.`);
        } else if (atualizado.status === 'aguardando_aprovacao') {
          Components.showToast('warning', 'Aprovação necessária', `Chamado ${atualizado.numero || '#'+atualizado.id} aguarda aprovação do técnico.`);
        } else if (atualizado.status === 'tecnico_necessario') {
          Components.showToast('info', 'Técnico necessário', `Chamado ${atualizado.numero || '#'+atualizado.id} encaminhado para técnico.`);
        }
      }
      if (tentativas >= 15) clearInterval(poll);
    }, 2000);
  }

  // ---------- Detalhe do Chamado ----------
  async function renderDetalhe(id) {
    let chamado = DataStore.getChamadoById(id);
    if (!chamado) {
      const content = document.getElementById('page-content');
      content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:300px;"><div class="spinner"></div><span style="margin-left:12px;color:var(--text-muted);">Buscando chamado...</span></div>';
      chamado = await DataStore.atualizarChamadoUnico(id);
      if (!chamado) {
        content.innerHTML = Components.renderEmptyState(
          '🔍',
          'Chamado não encontrado',
          `O chamado #${id} não foi encontrado no banco de dados.`,
          '<button class="btn btn-accent" onclick="App.navegarPara(\'chamados\')">← Voltar para Lista</button>'
        );
        return;
      }
    }

    chamadoAtual = id;
    const userStr = localStorage.getItem('user');
    const currentUser = userStr ? JSON.parse(userStr) : {};
    const isTecnicoOuAdmin = currentUser.tipo === 'tecnico' || currentUser.tipo === 'administrador';

    // Normalizar estruturas JSON se necessário
    if (typeof chamado.diagnostico === 'string') {
      try { chamado.diagnostico = JSON.parse(chamado.diagnostico); } catch (e) { chamado.diagnostico = null; }
    }
    if (typeof chamado.historico === 'string') {
      try { chamado.historico = JSON.parse(chamado.historico); } catch (e) { chamado.historico = []; }
    }
    if (typeof chamado.respostas === 'string') {
      try { chamado.respostas = JSON.parse(chamado.respostas); } catch (e) { chamado.respostas = []; }
    }

    const usuario = DataStore.getUsuario(chamado.usuario_id || chamado.usuario) || {};
    const statusInfo = DataStore.getStatusInfo(chamado.status);
    const prioridadeInfo = DataStore.getPrioridadeInfo(chamado.prioridade);
    const categoriaInfo = DataStore.getCategoriaInfo(chamado.categoria);
    const tecnico = (chamado.tecnico_id || chamado.tecnico) ? DataStore.getTecnico(chamado.tecnico_id || chamado.tecnico) : null;
    const isResolvido = ['resolvido', 'resolvido_ia', 'fechado'].includes(chamado.status);
    const respostas = chamado.respostas || [];

    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <button class="btn btn-ghost" onclick="App.navegarPara('${isTecnicoOuAdmin && paginaAtual === 'tecnico' ? 'tecnico' : 'chamados'}')">
          ← Voltar para ${isTecnicoOuAdmin && paginaAtual === 'tecnico' ? 'Painel do Técnico' : 'Lista de Chamados'}
        </button>
        <div style="font-size: 0.8rem; color: var(--text-muted);">
          ID: <code>#${chamado.id}</code> · Criado em: <strong>${DataStore.formatarData(chamado.criado_em || chamado.criadoEm)}</strong>
        </div>
      </div>

      <!-- Cabeçalho do Chamado -->
      <div class="flex justify-between items-center mb-lg" style="flex-wrap: wrap; gap: 14px; background: var(--bg-card); padding: 18px 22px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span class="badge badge-accent" style="font-size: 0.8rem; font-weight: 700;">${chamado.numero || '#'+chamado.id}</span>
            <span class="badge badge-dot ${statusInfo.badge}">${statusInfo.label}</span>
            <span class="badge ${prioridadeInfo.badge}">${prioridadeInfo.label}</span>
          </div>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: #fff; margin: 0;">
            ${chamado.titulo}
          </h2>
          <div style="display: flex; align-items: center; gap: 14px; margin-top: 8px; flex-wrap: wrap; font-size: 0.82rem; color: var(--text-secondary);">
            <span>📁 ${categoriaInfo.icon} ${categoriaInfo.label}</span>
            <span>⏱️ SLA: <strong>${chamado.sla ? chamado.sla + 'h' : '4h'}</strong></span>
            <span>👤 Solicitante: <strong>${chamado.usuario_nome || usuario.nome || 'Usuário'}</strong> (${chamado.usuario_setor || usuario.setor || 'Geral'})</span>
          </div>
        </div>

        <!-- Botões de Ação Dinâmicos -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          ${chamado.status === 'aguardando_aprovacao' && isTecnicoOuAdmin ? `
            <button class="btn btn-warning btn-sm" onclick="App.aprovarChamado(${chamado.id})" style="box-shadow: 0 0 15px rgba(255, 214, 0, 0.4);">
              ⚡ Aprovar Automação
            </button>
          ` : ''}

          ${chamado.status === 'tecnico_necessario' && isTecnicoOuAdmin ? `
            <button class="btn btn-accent btn-sm" onclick="App.assumirChamado(${chamado.id})">
              🙋 Assumir Chamado
            </button>
            <button class="btn btn-outline btn-sm" onclick="App.mostrarAtribuirTecnicoModal(${chamado.id})">
              🔧 Atribuir Técnico
            </button>
          ` : ''}

          ${!isResolvido && isTecnicoOuAdmin ? `
            <button class="btn btn-success btn-sm" onclick="App.resolverChamadoModal(${chamado.id})">
              ✅ Resolver
            </button>
          ` : ''}

          ${isResolvido ? `
            <button class="btn btn-outline btn-sm" onclick="App.reabrirChamadoAction(${chamado.id})">
              🔄 Reabrir Chamado
            </button>
          ` : ''}

          <button class="btn btn-outline btn-sm" onclick="App.reprocessarIA(${chamado.id})" title="Executa novamente a análise do Google Gemini">
            🤖 Reavaliar com IA
          </button>

          <button class="btn btn-primary btn-sm" onclick="App.mostrarRespostaModal(${chamado.id})">
            💬 Responder
          </button>
        </div>
      </div>

      <!-- Grid com Detalhes, IA, Conversa e Histórico -->
      <div class="grid-2">
        <!-- Coluna Esquerda: Informações + Diagnóstico IA -->
        <div>
          <!-- Card Informações -->
          <div class="card mb-lg">
            <div class="card-header">
              <h3 class="card-title">📝 Detalhes da Solicitação</h3>
            </div>
            <div class="card-body">
              <div style="margin-bottom: 18px;">
                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                  Descrição Informada pelo Usuário:
                </div>
                <div style="font-size: 0.92rem; color: var(--text-primary); line-height: 1.7; padding: 14px 16px; background: rgba(0,0,0,0.25); border-radius: var(--radius-sm); border-left: 3px solid var(--primary-light);">
                  ${chamado.descricao}
                </div>
              </div>

              <div class="grid-2" style="gap: 14px;">
                <div style="background: var(--bg-glass); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                  <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 4px;">SOLICITANTE</div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div class="user-avatar" style="width: 30px; height: 30px; font-size: 0.7rem;">${(chamado.usuario_avatar || usuario.avatar || '??')}</div>
                    <div>
                      <div style="font-size: 0.85rem; font-weight: 700;">${(chamado.usuario_nome || usuario.nome || 'Usuário')}</div>
                      <div style="font-size: 0.72rem; color: var(--text-muted);">${chamado.usuario_email || usuario.email || '—'} · ${chamado.usuario_setor || usuario.setor || 'Geral'}</div>
                    </div>
                  </div>
                </div>

                <div style="background: var(--bg-glass); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                  <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 4px;">TÉCNICO RESPONSÁVEL</div>
                  <div>
                    ${(chamado.tecnico_nome || (tecnico && tecnico.nome)) ? `
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="user-avatar" style="width: 30px; height: 30px; font-size: 0.7rem; background: linear-gradient(135deg, #00D2FF, #6C5CE7);">
                          ${chamado.tecnico_avatar || (tecnico && tecnico.avatar) || 'TI'}
                        </div>
                        <div>
                          <div style="font-size: 0.85rem; font-weight: 700; color: var(--accent);">${chamado.tecnico_nome || (tecnico && tecnico.nome)}</div>
                          <div style="font-size: 0.72rem; color: var(--text-muted);">${chamado.tecnico_especialidade || (tecnico && tecnico.especialidade) || 'Suporte Técnico'}</div>
                        </div>
                      </div>
                    ` : `
                      <div style="font-size: 0.82rem; color: var(--text-muted); padding: 4px 0;">
                        ⏳ <em>Fila geral (não atribuído)</em>
                      </div>
                    `}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Card Diagnóstico IA -->
          <div class="mb-lg">
            ${chamado.diagnostico ? Components.renderDiagnosisPanel(chamado.diagnostico) : `
              <div class="card" style="padding: 20px; text-align: center; border: 1px dashed var(--border-medium);">
                <div style="font-size: 1.8rem; margin-bottom: 8px;">🤖</div>
                <div style="font-weight: 700; margin-bottom: 4px;">Diagnóstico de IA Pendente</div>
                <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px;">
                  O diagnóstico da IA está sendo processado ou aguardando solicitação.
                </div>
                <button class="btn btn-outline btn-sm" onclick="App.reprocessarIA(${chamado.id})">
                  ⚡ Diagnosticar com Google Gemini
                </button>
              </div>
            `}
          </div>
        </div>

        <!-- Coluna Direita: Conversa & Respostas + Histórico -->
        <div>
          <!-- Card Conversa e Mensagens (Respostas) -->
          <div class="card mb-lg" id="card-respostas">
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
              <h3 class="card-title" style="display: flex; align-items: center; gap: 8px;">
                <span>💬</span> Conversa e Mensagens
              </h3>
              <span class="badge badge-primary">${respostas.length} respostas</span>
            </div>
            <div class="card-body">
              <!-- Thread de Mensagens -->
              <div style="display: flex; flex-direction: column; gap: 12px; max-height: 380px; overflow-y: auto; padding-right: 6px;">
                ${respostas.length > 0 ? respostas.map(r => {
                  const isMinha = (currentUser.id && (r.autor_id === currentUser.id || r.autor === currentUser.nome));
                  return `
                    <div style="display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; background: ${isMinha ? 'rgba(108, 92, 231, 0.14)' : 'var(--bg-glass)'}; border-radius: var(--radius-sm); border: 1px solid ${isMinha ? 'var(--primary-light)' : 'var(--border-subtle)'};">
                      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;">
                        <span style="font-weight: 700; color: ${isMinha ? 'var(--primary-light)' : 'var(--accent)'};">
                          ${r.autor_nome || r.autor || 'Usuário'}
                        </span>
                        <span style="color: var(--text-muted); font-size: 0.7rem;">
                          ${DataStore.formatarData(r.criado_em || r.criadoEm)}
                        </span>
                      </div>
                      <div style="font-size: 0.88rem; color: var(--text-primary); line-height: 1.6; word-break: break-word;">
                        ${r.mensagem || r.texto || ''}
                      </div>
                    </div>
                  `;
                }).join('') : `
                  <div style="text-align: center; padding: 24px 16px; color: var(--text-muted); font-size: 0.85rem;">
                    Nenhuma resposta registrada ainda. Envie uma mensagem abaixo para atualizar o chamado.
                  </div>
                `}
              </div>

              <!-- Formulário Inline de Nova Resposta -->
              <form id="form-resposta-inline" onsubmit="App.enviarRespostaInline(event, ${chamado.id})" style="margin-top: 18px; border-top: 1px solid var(--border-subtle); padding-top: 14px;">
                <div class="form-group" style="margin-bottom: 8px;">
                  <label class="form-label" style="font-size: 0.75rem;">Enviar Mensagem / Resposta Direta</label>
                  <textarea id="resposta-inline-input" class="form-textarea" placeholder="Digite uma atualização, dúvida ou orientações sobre este chamado..." style="min-height: 75px; font-size: 0.86rem;" required></textarea>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                  <button type="submit" id="btn-submit-resposta-inline" class="btn btn-primary btn-sm">
                    💬 Enviar Mensagem
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Card Histórico de Auditoria -->
          <div class="card">
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
              <h3 class="card-title">📜 Histórico e Auditoria</h3>
              <span class="badge badge-muted">${(chamado.historico || []).length} eventos</span>
            </div>
            <div class="card-body">
              <div class="timeline" style="max-height: 400px; overflow-y: auto; padding-right: 6px;">
                ${(chamado.historico || []).map((e, i) => Components.renderTimelineItem(e, i)).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ---------- Painel do Técnico ----------
  let _filtroTecnico = 'todos';

  function filtrarTecnico(status) {
    _filtroTecnico = status;
    renderTecnico();
  }

  function renderTecnico() {
    const userStr = localStorage.getItem('user');
    const currentUser = userStr ? JSON.parse(userStr) : {};
    const content = document.getElementById('page-content');

    if (currentUser.tipo === 'usuario') {
      content.innerHTML = Components.renderEmptyState(
        '🚫',
        'Acesso Restrito',
        'Esta área é restrita aos Técnicos de TI e Administradores do sistema.',
        '<button class="btn btn-accent" onclick="App.navegarPara(\'dashboard\')">Ir para o Dashboard</button>'
      );
      return;
    }

    const todosChams = DataStore.getChamados();
    const pendentes = todosChams.filter(c =>
      ['aguardando_aprovacao', 'em_andamento', 'aberto', 'em_diagnostico', 'tecnico_necessario', 'em_atendimento'].includes(c.status)
    );
    const aprovacoes = todosChams.filter(c => c.status === 'aguardando_aprovacao');
    const tecnicoNecessario = todosChams.filter(c => c.status === 'tecnico_necessario');
    const emAtendimento = todosChams.filter(c => ['em_andamento', 'em_atendimento'].includes(c.status));
    const meusChamados = todosChams.filter(c => (c.tecnico_id && (c.tecnico_id === currentUser.id || c.tecnico_id === 't1')) || c.tecnico === currentUser.id);

    // Filtragem de lista de acordo com o tab ativo
    let listaFiltrada = pendentes;
    if (_filtroTecnico === 'aprovacao') listaFiltrada = aprovacoes;
    else if (_filtroTecnico === 'tecnico') listaFiltrada = tecnicoNecessario;
    else if (_filtroTecnico === 'atendimento') listaFiltrada = emAtendimento;
    else if (_filtroTecnico === 'meus') listaFiltrada = meusChamados;

    content.innerHTML = `
      <div class="admin-toolbar" style="margin-bottom: 24px;">
        <div>
          <h2 style="font-size: 1.3rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
            <span>🔧</span> Painel de Atendimento Técnico
          </h2>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">
            Fila operacional de chamados, aprovação de automações da IA e gestão de atendimentos.
          </p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-outline btn-sm" onclick="App.resetarDados()">🔄 Atualizar Fila</button>
        </div>
      </div>

      <!-- Métricas Operacionais do Técnico -->
      <div class="stats-grid mb-lg">
        <div class="stat-card primary" style="cursor: pointer;" onclick="App.filtrarTecnico('todos')">
          <div class="stat-icon">📋</div>
          <div class="stat-value">${pendentes.length}</div>
          <div class="stat-label">Total Pendentes</div>
        </div>
        <div class="stat-card warning" style="cursor: pointer;" onclick="App.filtrarTecnico('aprovacao')">
          <div class="stat-icon">⏳</div>
          <div class="stat-value">${aprovacoes.length}</div>
          <div class="stat-label">Aguardando Aprovação</div>
        </div>
        <div class="stat-card danger" style="cursor: pointer;" onclick="App.filtrarTecnico('tecnico')">
          <div class="stat-icon">⚠️</div>
          <div class="stat-value">${tecnicoNecessario.length}</div>
          <div class="stat-label">Técnico Necessário</div>
        </div>
        <div class="stat-card accent" style="cursor: pointer;" onclick="App.filtrarTecnico('meus')">
          <div class="stat-icon">👤</div>
          <div class="stat-value">${meusChamados.length}</div>
          <div class="stat-label">Atribuídos a Mim</div>
        </div>
      </div>

      <!-- Se houver chamados aguardando aprovação, destacar -->
      ${aprovacoes.length > 0 ? `
        <div class="card mb-lg" style="border: 1px solid var(--warning); box-shadow: 0 0 20px rgba(255, 214, 0, 0.15);">
          <div class="card-header" style="background: var(--warning-bg); display: flex; justify-content: space-between; align-items: center;">
            <h3 class="card-title" style="color: var(--warning); display: flex; align-items: center; gap: 8px;">
              <span>⚡</span> Automações Aguardando Sua Aprovação (${aprovacoes.length})
            </h3>
            <span class="badge badge-warning">Ação Requerida</span>
          </div>
          <div class="card-body" style="padding: 0;">
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Chamado & Solicitante</th>
                    <th>Automação Sugerida</th>
                    <th>Confiança IA</th>
                    <th style="text-align: right;">Ações Imediatas</th>
                  </tr>
                </thead>
                <tbody>
                  ${aprovacoes.map(c => {
                    const user = DataStore.getUsuario(c.usuario_id || c.usuario) || {};
                    const autoNome = c.diagnostico?.acaoSugerida ? (DataStore.getAutomacao(c.diagnostico.acaoSugerida)?.nome || c.diagnostico.acaoSugerida) : 'N/A';
                    const conf = c.diagnostico ? Math.round(c.diagnostico.confianca * 100) : 0;
                    return `
                      <tr class="animate-slide-in">
                        <td><span style="color: var(--primary-light); font-weight: 700;">${c.numero || '#'+c.id}</span></td>
                        <td>
                          <div style="font-weight: 600;">${c.titulo}</div>
                          <div style="font-size: 0.73rem; color: var(--text-muted);">${c.usuario_nome || user.nome || 'Usuário'} · ${c.usuario_setor || user.setor || 'Geral'}</div>
                        </td>
                        <td>
                          <span class="badge badge-warning">⚡ ${autoNome}</span>
                        </td>
                        <td>
                          <span style="font-weight: 800; color: var(--success);">${conf}%</span>
                        </td>
                        <td style="text-align: right;">
                          <div style="display: flex; gap: 6px; justify-content: flex-end;">
                            <button class="btn btn-warning btn-sm" onclick="App.aprovarChamado(${c.id})">✅ Aprovar</button>
                            <button class="btn btn-outline btn-sm" onclick="App.navegarPara('detalhe', ${c.id})">👁️ Ver</button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Tabs e Fila Geral -->
      <div class="card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn ${_filtroTecnico === 'todos' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="App.filtrarTecnico('todos')">
              Todos Pendentes (${pendentes.length})
            </button>
            <button class="btn ${_filtroTecnico === 'aprovacao' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="App.filtrarTecnico('aprovacao')">
              ⏳ Aprovação (${aprovacoes.length})
            </button>
            <button class="btn ${_filtroTecnico === 'tecnico' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="App.filtrarTecnico('tecnico')">
              ⚠️ Técnico Necessário (${tecnicoNecessario.length})
            </button>
            <button class="btn ${_filtroTecnico === 'atendimento' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="App.filtrarTecnico('atendimento')">
              🔧 Em Atendimento (${emAtendimento.length})
            </button>
            <button class="btn ${_filtroTecnico === 'meus' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="App.filtrarTecnico('meus')">
              👤 Atribuídos a Mim (${meusChamados.length})
            </button>
          </div>
        </div>
        <div class="card-body" style="padding: 0;">
          ${listaFiltrada.length > 0 ? `
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Título & Solicitante</th>
                    <th>Status</th>
                    <th>Prioridade</th>
                    <th>Responsável</th>
                    <th>Criado</th>
                    <th style="text-align: right;">Ações Operacionais</th>
                  </tr>
                </thead>
                <tbody>
                  ${listaFiltrada.map(c => {
                    const statusInfo = DataStore.getStatusInfo(c.status);
                    const prioInfo = DataStore.getPrioridadeInfo(c.prioridade);
                    const user = DataStore.getUsuario(c.usuario_id || c.usuario) || {};
                    const isMeu = (c.tecnico_id && (c.tecnico_id === currentUser.id || c.tecnico_id === 't1')) || c.tecnico === currentUser.id;

                    return `
                      <tr class="animate-slide-in">
                        <td><span style="color: var(--text-muted); font-weight: 700;">${c.numero || '#'+c.id}</span></td>
                        <td>
                          <div style="font-weight: 600; color: #fff;">${c.titulo}</div>
                          <div style="font-size: 0.74rem; color: var(--text-muted);">${c.usuario_nome || user.nome || 'Usuário'} · ${c.usuario_setor || user.setor || 'Geral'}</div>
                        </td>
                        <td><span class="badge badge-dot ${statusInfo.badge}">${statusInfo.label}</span></td>
                        <td><span class="badge ${prioInfo.badge}">${prioInfo.label}</span></td>
                        <td>
                          ${c.tecnico_nome ? `
                            <span class="badge badge-accent" style="font-size: 0.72rem;">${isMeu ? '🙋 Você' : c.tecnico_nome}</span>
                          ` : `
                            <span style="color: var(--text-muted); font-size: 0.75rem;">Fila Geral</span>
                          `}
                        </td>
                        <td style="font-size: 0.75rem; color: var(--text-muted);">${DataStore.formatarData(c.criado_em || c.criadoEm)}</td>
                        <td style="text-align: right;">
                          <div style="display: flex; gap: 6px; justify-content: flex-end;">
                            <button class="btn btn-outline btn-sm" onclick="App.navegarPara('detalhe', ${c.id})" title="Ver detalhes completos">👁️</button>
                            ${!isMeu ? `
                              <button class="btn btn-primary btn-sm" onclick="App.assumirChamado(${c.id})" title="Assumir este chamado">🙋 Assumir</button>
                            ` : ''}
                            <button class="btn btn-primary btn-sm" onclick="App.mostrarRespostaModal(${c.id})" title="Enviar resposta">💬</button>
                            <button class="btn btn-success btn-sm" onclick="App.resolverChamadoModal(${c.id})" title="Marcar como resolvido">✅</button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : Components.renderEmptyState(
            '🎉',
            'Nenhum chamado nesta fila!',
            'Não há chamados com o filtro selecionado no momento.'
          )}
        </div>
      </div>
    `;
  }

  // ---------- Automações ----------
  function renderAutomacoes() {
    const catalogo = DataStore.getAutomacoes();
    const automaticas = catalogo.filter(a => a.nivel === 'automatico');
    const aprovacao = catalogo.filter(a => a.nivel === 'aprovacao');
    const tecnico = catalogo.filter(a => a.nivel === 'tecnico');

    const content = document.getElementById('page-content');
    content.innerHTML = `
      <h2 style="font-size: 1.3rem; font-weight: 800; margin-bottom: 8px;">⚙️ Catálogo de Automações</h2>
      <p style="color: var(--text-secondary); margin-bottom: 28px; font-size: 0.9rem;">
        Automações disponíveis no sistema, organizadas por nível de segurança.
      </p>

      <!-- Automáticas -->
      <div class="mb-lg">
        <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          🟢 Automáticas <span class="badge badge-success">${automaticas.length}</span>
        </h3>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 16px;">
          Ações completamente seguras e de baixo risco. Executadas automaticamente pela IA.
        </p>
        <div class="automation-grid">
          ${automaticas.map(a => renderAutomacaoCard(a)).join('')}
        </div>
      </div>

      <!-- Aprovação necessária -->
      <div class="mb-lg">
        <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          🟡 Aprovação Necessária <span class="badge badge-warning">${aprovacao.length}</span>
        </h3>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 16px;">
          O sistema identifica o problema e prepara a ação, mas um técnico precisa autorizar.
        </p>
        <div class="automation-grid">
          ${aprovacao.map(a => renderAutomacaoCard(a)).join('')}
        </div>
      </div>

      <!-- Somente técnico -->
      <div class="mb-lg">
        <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          🔴 Somente Técnico <span class="badge badge-danger">${tecnico.length}</span>
        </h3>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 16px;">
          A IA apenas recomenda a solução. Execução somente por técnico autorizado.
        </p>
        <div class="automation-grid">
          ${tecnico.map(a => renderAutomacaoCard(a)).join('')}
        </div>
      </div>

      <!-- Arquitetura de segurança -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🔐 Princípio de Segurança</h3>
        </div>
        <div class="card-body">
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 12px; color: var(--primary-light);">
              "A IA decide o que pode ser feito; o sistema decide o que é permitido fazer."
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); max-width: 600px; margin: 0 auto;">
              A IA funciona como cérebro de decisão, enquanto as automações continuam sob controle do sistema.
              Isso permite aproveitar a capacidade de raciocínio sem entregar controle irrestrito da infraestrutura.
            </p>
          </div>
          <div style="display: flex; justify-content: center; gap: 24px; margin-top: 20px; flex-wrap: wrap;">
            <div style="text-align: center; padding: 16px; background: var(--bg-glass); border-radius: var(--radius-md); min-width: 140px;">
              <div style="font-size: 1.5rem; margin-bottom: 8px;">🧠</div>
              <div style="font-size: 0.8rem; font-weight: 600;">IA Solicita</div>
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;">Identifica e recomenda</div>
            </div>
            <div style="display: flex; align-items: center; font-size: 1.5rem; color: var(--text-muted);">→</div>
            <div style="text-align: center; padding: 16px; background: var(--bg-glass); border-radius: var(--radius-md); min-width: 140px;">
              <div style="font-size: 1.5rem; margin-bottom: 8px;">🔐</div>
              <div style="font-size: 0.8rem; font-weight: 600;">Sistema Verifica</div>
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;">Permissões e políticas</div>
            </div>
            <div style="display: flex; align-items: center; font-size: 1.5rem; color: var(--text-muted);">→</div>
            <div style="text-align: center; padding: 16px; background: var(--bg-glass); border-radius: var(--radius-md); min-width: 140px;">
              <div style="font-size: 1.5rem; margin-bottom: 8px;">⚡</div>
              <div style="font-size: 0.8rem; font-weight: 600;">Execução</div>
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;">Automação controlada</div>
            </div>
            <div style="display: flex; align-items: center; font-size: 1.5rem; color: var(--text-muted);">→</div>
            <div style="text-align: center; padding: 16px; background: var(--bg-glass); border-radius: var(--radius-md); min-width: 140px;">
              <div style="font-size: 1.5rem; margin-bottom: 8px;">📋</div>
              <div style="font-size: 0.8rem; font-weight: 600;">Registro</div>
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;">Auditoria completa</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ---------- Helper renderAutomacaoCard inline ----------
  function renderAutomacaoCard(a) {
    const nivelInfo = DataStore.getNivelAutomacaoInfo(a.nivel);
    return `
      <div class="card" style="padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div style="font-weight: 700; font-size: 0.9rem;">${a.nome}</div>
          <span class="badge ${nivelInfo.badge}" style="font-size: 0.7rem;">${nivelInfo.label}</span>
        </div>
        <div style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.5;">${a.descricao || ''}</div>
        <div style="margin-top: 8px; font-size: 0.7rem; color: var(--text-muted);">ID: <code>${a.id}</code></div>
      </div>
    `;
  }

  // ---------- Ações ----------
  async function aprovarChamado(id) {
    const confirmado = await Components.confirmar(
      'Aprovar Automação?',
      'Ao aprovar, o sistema executará a automação sugerida pela IA. Deseja continuar?'
    );
    if (!confirmado) return;

    try {
      await Chamados.aprovarAutomacao(id);
      Components.showToast('info', 'Aprovação enviada', 'Executando automação...');
      atualizarBadges();
      iniciarPollingChamado(id);
      if (paginaAtual === 'tecnico') renderTecnico();
      else if (paginaAtual === 'detalhe') renderDetalhe(id);
    } catch(err) {
      Components.showToast('danger', 'Erro', err.message);
    }
  }

  // ---------- Atribuir técnico ----------
  function mostrarAtribuirTecnicoModal(chamadoId) {
    const tecnicos = DataStore.getTecnicos();
    Components.openModal(
      '🔧 Atribuir Técnico',
      `
        <div class="form-group">
          <label class="form-label">Selecionar Técnico</label>
          <select class="form-select" id="select-tecnico">
            ${tecnicos.map(t => `<option value="${t.id}">${t.nome} — ${t.especialidade}</option>`).join('')}
          </select>
        </div>
      `,
      `
        <button class="btn btn-outline" onclick="Components.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="App.confirmarAtribuicao(${chamadoId})">Atribuir</button>
      `
    );
  }

  async function confirmarAtribuicao(chamadoId) {
    const tecnicoId = document.getElementById('select-tecnico')?.value;
    if (!tecnicoId) return;
    try {
      await Chamados.atribuirTecnico(chamadoId, tecnicoId);
      await DataStore.atualizarChamadoUnico(chamadoId);
      Components.closeModal();
      Components.showToast('success', 'Técnico atribuído', 'Chamado em atendimento.');
      renderDetalhe(chamadoId);
      atualizarBadges();
    } catch(err) {
      Components.showToast('danger', 'Erro', err.message);
    }
  }

  function mostrarRespostaModal(id) {
    Components.openModal(
      '💬 Responder ao Chamado',
      `
        <div class="form-group">
          <label class="form-label">Sua Resposta</label>
          <textarea class="form-textarea" id="resposta-tecnico" placeholder="Escreva sua resposta ou observação..." style="min-height: 120px;"></textarea>
        </div>
      `,
      `
        <button class="btn btn-outline" onclick="Components.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="App.enviarResposta(${id})">Enviar</button>
      `
    );
  }

  async function enviarResposta(id) {
    const msg = document.getElementById('resposta-tecnico')?.value?.trim();
    if (!msg) {
      Components.showToast('warning', 'Campo vazio', 'Escreva uma resposta antes de enviar.');
      return;
    }
    try {
      await Chamados.responderComoTecnico(id, msg);
      await DataStore.atualizarChamadoUnico(id);
      Components.closeModal();
      Components.showToast('success', 'Resposta enviada', '');
      renderDetalhe(id);
      atualizarBadges();
    } catch(err) {
      Components.showToast('danger', 'Erro ao enviar resposta', err.message);
    }
  }

  function resolverChamadoModal(id) {
    Components.openModal(
      '✅ Resolver Chamado',
      `
        <div class="form-group">
          <label class="form-label">Descrição da Solução (opcional)</label>
          <textarea class="form-textarea" id="solucao-texto" placeholder="Descreva como o problema foi resolvido..." style="min-height: 100px;"></textarea>
        </div>
      `,
      `
        <button class="btn btn-outline" onclick="Components.closeModal()">Cancelar</button>
        <button class="btn btn-success" onclick="App.confirmarResolucao(${id})">✅ Marcar como Resolvido</button>
      `
    );
  }

  async function confirmarResolucao(id) {
    const msg = document.getElementById('solucao-texto')?.value?.trim();
    try {
      await Chamados.resolverManualmente(id, msg);
      await DataStore.atualizarChamadoUnico(id);
      Components.closeModal();
      Components.showToast('success', 'Chamado resolvido', '');
      renderDetalhe(id);
      atualizarBadges();
    } catch(err) {
      Components.showToast('danger', 'Erro ao resolver', err.message);
    }
  }

  async function reabrirChamadoAction(id) {
    try {
      await Chamados.reabrirChamado(id);
      await DataStore.atualizarChamadoUnico(id);
      Components.showToast('warning', 'Chamado reaberto', 'A IA irá analisar novamente.');
      renderDetalhe(id);
      atualizarBadges();
      iniciarPollingChamado(id);
    } catch(err) {
      Components.showToast('danger', 'Erro ao reabrir', err.message);
    }
  }

  async function enviarRespostaInline(event, chamadoId) {
    event.preventDefault();
    const input = document.getElementById('resposta-inline-input');
    const btn = document.getElementById('btn-submit-resposta-inline');
    const msg = input ? input.value.trim() : '';

    if (!msg) {
      Components.showToast('warning', 'Atenção', 'Digite uma mensagem antes de enviar.');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner spinner-sm" style="margin-right: 6px;"></span> Enviando...';
    }

    try {
      await Chamados.adicionarResposta(chamadoId, msg);
      await DataStore.atualizarChamadoUnico(chamadoId);
      Components.showToast('success', 'Resposta Enviada', 'Sua mensagem foi adicionada ao chamado.');
      renderDetalhe(chamadoId);
    } catch (err) {
      Components.showToast('danger', 'Erro ao Enviar', err.message);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '💬 Enviar Mensagem';
      }
    }
  }

  async function reprocessarIA(chamadoId) {
    Components.showToast('info', 'Análise Iniciada', 'O Google Gemini está reavaliando o chamado...');
    try {
      await Chamados.diagnosticarChamado(chamadoId);
      iniciarPollingChamado(chamadoId);
      setTimeout(async () => {
        await DataStore.atualizarChamadoUnico(chamadoId);
        if (paginaAtual === 'detalhe' && chamadoAtual === chamadoId) {
          renderDetalhe(chamadoId);
        }
      }, 1500);
    } catch (err) {
      Components.showToast('danger', 'Erro na IA', err.message);
    }
  }

  async function assumirChamado(chamadoId) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) return;
    try {
      await Chamados.atribuirTecnico(chamadoId, user.id);
      await DataStore.atualizarChamadoUnico(chamadoId);
      Components.showToast('success', 'Chamado Assumido', `Você agora é o responsável pelo chamado #${chamadoId}.`);
      if (paginaAtual === 'tecnico') renderTecnico();
      else if (paginaAtual === 'detalhe') renderDetalhe(chamadoId);
      atualizarBadges();
    } catch (err) {
      Components.showToast('danger', 'Erro ao Assumir', err.message);
    }
  }

  async function resetarDados() {
    // Recarregar dados do servidor
    await DataStore.carregarTudo();
    await DataStore.carregarMetricas();
    Components.showToast('info', 'Dados Atualizados', 'Dados recarregados do servidor.');
    navegarPara('dashboard');
    atualizarBadges();
  }

  // ---------- Badges ----------
  function atualizarBadges() {
    const metricas = DataStore.getMetricas();

    const badgeChamados = document.getElementById('badge-chamados');
    if (badgeChamados) {
      badgeChamados.textContent = metricas.total;
    }

    const badgeTecnico = document.getElementById('badge-tecnico');
    if (badgeTecnico) {
      badgeTecnico.textContent = metricas.aguardandoAprovacao;
      badgeTecnico.style.display = metricas.aguardandoAprovacao > 0 ? 'block' : 'none';
    }
  }

  // ============================================================
  // ÁREA ADMINISTRATIVA — DASHBOARD & GOVERNANÇA
  // ============================================================
  async function renderAdminDashboard() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
        <div class="spinner"></div>
        <span style="margin-left:12px;color:var(--text-muted);">Carregando painel administrativo...</span>
      </div>
    `;

    const metricas = await DataStore.adminGetMetricas() || {
      total: 0, ativos: 0, inativos: 0, administradores: 0, tecnicos: 0, usuariosComuns: 0
    };

    const usuarios = await DataStore.adminGetUsuarios() || [];
    const usuariosRecentes = usuarios.slice(0, 6);

    content.innerHTML = `
      <div class="admin-toolbar">
        <div>
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
            <span>🛡️</span> Governança e Controle de Usuários
          </h3>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
            Painel administrativo com métricas em tempo real, auditoria e gestão de acessos.
          </p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-outline btn-sm" onclick="App.navegarPara('admin-usuarios')">
            👥 Gerenciar Todos os Usuários
          </button>
          <button class="btn btn-primary btn-sm" onclick="App.abrirModalNovoUsuario()">
            ➕ Novo Usuário
          </button>
        </div>
      </div>

      <div class="stats-grid">
        ${Components.renderStatCard({ valor: metricas.total, label: 'Total de Usuários', icon: '👥', tipo: 'primary' })}
        ${Components.renderStatCard({ valor: metricas.ativos, label: 'Usuários Ativos', icon: '✅', tipo: 'success' })}
        ${Components.renderStatCard({ valor: metricas.inativos, label: 'Contas Inativas', icon: '⏸️', tipo: 'danger' })}
        ${Components.renderStatCard({ valor: metricas.administradores, label: 'Administradores', icon: '👑', tipo: 'accent' })}
        ${Components.renderStatCard({ valor: metricas.tecnicos, label: 'Técnicos', icon: '🔧', tipo: 'warning' })}
        ${Components.renderStatCard({ valor: metricas.usuariosComuns, label: 'Usuários Comuns', icon: '👤', tipo: 'info' })}
      </div>

      <div class="card" style="margin-top: 24px;">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h3 class="card-title">👥 Usuários Cadastrados Recentemente</h3>
          <button class="btn btn-ghost btn-sm" onclick="App.navegarPara('admin-usuarios')">Ver todos (${usuarios.length}) →</button>
        </div>
        <div class="card-body" style="padding: 0;">
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Setor</th>
                  <th>Perfil</th>
                  <th>Situação</th>
                  <th>Chamados</th>
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${usuariosRecentes.map(u => renderUsuarioRow(u)).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================
  // ÁREA ADMINISTRATIVA — LISTAGEM E FILTROS DE USUÁRIOS
  // ============================================================
  let _adminFiltro = { busca: '', setor: '', tipo: '', ativo: '' };

  async function renderAdminUsuarios(filtros = _adminFiltro) {
    _adminFiltro = filtros;
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
        <div class="spinner"></div>
        <span style="margin-left:12px;color:var(--text-muted);">Carregando usuários...</span>
      </div>
    `;

    const usuarios = await DataStore.adminGetUsuarios(filtros) || [];
    const setores = DataStore.getSetores() || [];

    content.innerHTML = `
      <div class="admin-toolbar">
        <div class="admin-filters">
          <div class="admin-filter-search">
            <input 
              type="text" 
              id="filtro-admin-busca" 
              class="form-input" 
              placeholder="🔍 Buscar por nome ou e-mail..." 
              value="${filtros.busca || ''}"
              onkeydown="if(event.key === 'Enter') App.aplicarFiltrosAdmin()"
            >
          </div>
          <div class="admin-filter-item">
            <select id="filtro-admin-setor" class="form-select" onchange="App.aplicarFiltrosAdmin()">
              <option value="">Todos os Setores</option>
              ${setores.map(s => `<option value="${s.nome}" ${filtros.setor === s.nome ? 'selected' : ''}>${s.nome}</option>`).join('')}
            </select>
          </div>
          <div class="admin-filter-item">
            <select id="filtro-admin-tipo" class="form-select" onchange="App.aplicarFiltrosAdmin()">
              <option value="">Todos os Perfis</option>
              <option value="administrador" ${filtros.tipo === 'administrador' ? 'selected' : ''}>👑 Administrador</option>
              <option value="tecnico" ${filtros.tipo === 'tecnico' ? 'selected' : ''}>🔧 Técnico</option>
              <option value="usuario" ${filtros.tipo === 'usuario' ? 'selected' : ''}>👤 Usuário</option>
            </select>
          </div>
          <div class="admin-filter-item">
            <select id="filtro-admin-ativo" class="form-select" onchange="App.aplicarFiltrosAdmin()">
              <option value="">Todas as Situações</option>
              <option value="1" ${filtros.ativo === '1' ? 'selected' : ''}>🟢 Ativo</option>
              <option value="0" ${filtros.ativo === '0' ? 'selected' : ''}>🔴 Inativo</option>
            </select>
          </div>
          <button class="btn btn-outline btn-sm" onclick="App.limparFiltrosAdmin()" title="Limpar filtros">
            🔄 Limpar
          </button>
        </div>
        <div>
          <button class="btn btn-primary btn-sm" onclick="App.abrirModalNovoUsuario()">
            ➕ Novo Usuário
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
          <h3 class="card-title">
            📋 Usuários do Sistema
            <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted); margin-left: 8px;">
              (${usuarios.length} ${usuarios.length === 1 ? 'registro encontrado' : 'registros encontrados'})
            </span>
          </h3>
          <button class="btn btn-ghost btn-sm" onclick="App.renderAdminUsuarios(_adminFiltro)">
            🔄 Atualizar Lista
          </button>
        </div>
        <div class="card-body" style="padding: 0;">
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Setor</th>
                  <th>Perfil</th>
                  <th>Situação</th>
                  <th>Chamados</th>
                  <th>Cadastrado em</th>
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${usuarios.length > 0 
                  ? usuarios.map(u => renderUsuarioRow(u)).join('')
                  : `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted);">
                       Nenhum usuário encontrado com os filtros selecionados.
                     </td></tr>`
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function aplicarFiltrosAdmin() {
    const busca = document.getElementById('filtro-admin-busca')?.value.trim() || '';
    const setor = document.getElementById('filtro-admin-setor')?.value || '';
    const tipo = document.getElementById('filtro-admin-tipo')?.value || '';
    const ativo = document.getElementById('filtro-admin-ativo')?.value || '';

    renderAdminUsuarios({ busca, setor, tipo, ativo });
  }

  function limparFiltrosAdmin() {
    renderAdminUsuarios({ busca: '', setor: '', tipo: '', ativo: '' });
  }

  function renderUsuarioRow(u) {
    const isAtivo = u.ativo === 1 || u.ativo === true;
    const roleBadgeClass = u.tipo === 'administrador' ? 'role-badge-admin' : (u.tipo === 'tecnico' ? 'role-badge-tecnico' : 'role-badge-usuario');
    const roleNome = u.tipo === 'administrador' ? '👑 Administrador' : (u.tipo === 'tecnico' ? '🔧 Técnico' : '👤 Usuário');
    const dataCadastro = DataStore.formatarData(u.created_at);

    return `
      <tr>
        <td>
          <div class="user-cell">
            <div class="user-cell-avatar">${u.avatar || '??'}</div>
            <div class="user-cell-info">
              <span class="user-cell-name">${u.nome}</span>
              <span class="user-cell-email">${u.email}</span>
            </div>
          </div>
        </td>
        <td>
          <span style="font-weight: 500;">${u.setor || '—'}</span>
        </td>
        <td>
          <span class="badge ${roleBadgeClass}">${roleNome}</span>
        </td>
        <td>
          <span class="badge ${isAtivo ? 'badge-success' : 'badge-danger'}">
            <span class="status-indicator-dot ${isAtivo ? 'active' : 'inactive'}"></span>
            ${isAtivo ? 'Ativo' : 'Inativo'}
          </span>
        </td>
        <td>
          <span class="badge badge-muted" title="${u.total_chamados || 0} chamados abertos">
            🎫 ${u.total_chamados || 0}
          </span>
        </td>
        <td>
          <span style="color: var(--text-muted); font-size: 0.8rem;">${dataCadastro}</span>
        </td>
        <td style="text-align: right;">
          <div class="actions-cell" style="justify-content: flex-end;">
            <button class="btn-icon-sm" onclick="App.abrirModalDetalhesUsuario('${u.id}')" title="Visualizar Detalhes">
              👁️
            </button>
            <button class="btn-icon-sm" onclick="App.abrirModalEditarUsuario('${u.id}')" title="Editar Usuário">
              ✏️
            </button>
            <button class="btn-icon-sm" onclick="App.adminAlternarStatus('${u.id}', ${isAtivo ? 0 : 1})" title="${isAtivo ? 'Desativar Conta' : 'Ativar Conta'}">
              ${isAtivo ? '⏸️' : '▶️'}
            </button>
            <button class="btn-icon-sm" onclick="App.adminConfirmarExclusao('${u.id}', '${u.nome.replace(/'/g, "\\'")}')" title="Excluir Usuário" style="color: var(--danger);">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  // ── Modal Novo Usuário (Admin)
  function abrirModalNovoUsuario() {
    const setores = DataStore.getSetores() || [
      { nome: 'TI' }, { nome: 'Administrativo' }, { nome: 'Financeiro' },
      { nome: 'RH' }, { nome: 'Marketing' }, { nome: 'Vendas' },
      { nome: 'Logística' }, { nome: 'Operações' }
    ];

    const bodyHtml = `
      <form id="form-novo-usuario" onsubmit="App.adminSalvarNovoUsuario(event)">
        <div class="form-group">
          <label class="form-label">Nome Completo *</label>
          <input type="text" id="modal-novo-nome" class="form-input" required placeholder="Ex: Lucas Ferreira">
        </div>

        <div class="form-group">
          <label class="form-label">E-mail *</label>
          <input type="email" id="modal-novo-email" class="form-input" required placeholder="Ex: lucas@empresa.com">
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Senha *</label>
            <input type="password" id="modal-novo-senha" class="form-input" required minlength="6" placeholder="Mínimo 6 dígitos">
          </div>
          <div class="form-group">
            <label class="form-label">Confirmar Senha *</label>
            <input type="password" id="modal-novo-confirma" class="form-input" required minlength="6" placeholder="Repita a senha">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Setor *</label>
            <select id="modal-novo-setor" class="form-select" required>
              <option value="">Selecione...</option>
              ${setores.map(s => `<option value="${s.nome}">${s.nome}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Perfil *</label>
            <select id="modal-novo-tipo" class="form-select" required>
              <option value="usuario">👤 Usuário</option>
              <option value="tecnico">🔧 Técnico</option>
              <option value="administrador">👑 Administrador</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Situação</label>
            <select id="modal-novo-ativo" class="form-select" required>
              <option value="1">🟢 Ativo</option>
              <option value="0">🔴 Inativo</option>
            </select>
          </div>
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-outline" onclick="Components.closeModal()">Cancelar</button>
      <button type="submit" form="form-novo-usuario" id="btn-salvar-novo-user" class="btn btn-primary">
        💾 Cadastrar Usuário
      </button>
    `;

    Components.openModal('➕ Cadastrar Novo Usuário', bodyHtml, footerHtml);
  }

  async function adminSalvarNovoUsuario(e) {
    e.preventDefault();
    const nome = document.getElementById('modal-novo-nome').value.trim();
    const email = document.getElementById('modal-novo-email').value.trim();
    const senha = document.getElementById('modal-novo-senha').value;
    const confirmacaoSenha = document.getElementById('modal-novo-confirma').value;
    const setor = document.getElementById('modal-novo-setor').value;
    const tipo = document.getElementById('modal-novo-tipo').value;
    const ativo = parseInt(document.getElementById('modal-novo-ativo').value);

    if (senha !== confirmacaoSenha) {
      Components.showToast('warning', 'Validação', 'A confirmação de senha não confere.');
      return;
    }

    const btn = document.getElementById('btn-salvar-novo-user');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner spinner-sm" style="margin-right:6px;"></span> Salvando...';
    }

    try {
      await DataStore.adminCriarUsuario({
        nome, email, senha, confirmacaoSenha, setor, tipo, ativo
      });
      Components.showToast('success', 'Sucesso', 'Usuário cadastrado com sucesso!');
      Components.closeModal();
      await DataStore.carregarTudo();
      if (paginaAtual === 'admin') renderAdminDashboard();
      else renderAdminUsuarios(_adminFiltro);
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '💾 Cadastrar Usuário';
      }
      Components.showToast('danger', 'Erro no Cadastro', err.message);
    }
  }

  // ── Modal Editar Usuário (Admin)
  async function abrirModalEditarUsuario(id) {
    const usuario = await DataStore.adminGetUsuario(id);
    if (!usuario) {
      Components.showToast('danger', 'Erro', 'Usuário não encontrado.');
      return;
    }

    const setores = DataStore.getSetores() || [];

    const bodyHtml = `
      <form id="form-editar-usuario" onsubmit="App.adminSalvarEdicaoUsuario(event, '${id}')">
        <div class="form-group">
          <label class="form-label">Nome Completo *</label>
          <input type="text" id="modal-edit-nome" class="form-input" required value="${usuario.nome}">
        </div>

        <div class="form-group">
          <label class="form-label">E-mail *</label>
          <input type="email" id="modal-edit-email" class="form-input" required value="${usuario.email}">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Setor *</label>
            <select id="modal-edit-setor" class="form-select" required>
              ${setores.map(s => `<option value="${s.nome}" ${usuario.setor === s.nome ? 'selected' : ''}>${s.nome}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Perfil *</label>
            <select id="modal-edit-tipo" class="form-select" required>
              <option value="usuario" ${usuario.tipo === 'usuario' ? 'selected' : ''}>👤 Usuário</option>
              <option value="tecnico" ${usuario.tipo === 'tecnico' ? 'selected' : ''}>🔧 Técnico</option>
              <option value="administrador" ${usuario.tipo === 'administrador' ? 'selected' : ''}>👑 Administrador</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Situação</label>
            <select id="modal-edit-ativo" class="form-select" required>
              <option value="1" ${usuario.ativo === 1 ? 'selected' : ''}>🟢 Ativo</option>
              <option value="0" ${usuario.ativo === 0 ? 'selected' : ''}>🔴 Inativo</option>
            </select>
          </div>
        </div>

        <div style="margin-top:16px;padding:14px;background:var(--bg-glass);border-radius:var(--radius-sm);border:1px solid var(--border-subtle);">
          <div style="font-weight:600;margin-bottom:6px;">🔐 Senha protegida</div>
          <div style="font-size:.82rem;color:var(--text-muted);">O administrador não define a senha do usuário. Envie um link seguro para o e-mail cadastrado.</div>
          <button type="button" class="btn btn-outline btn-sm" style="margin-top:10px;" onclick="App.adminEnviarResetSenha('${id}')">✉️ Enviar redefinição de senha</button>
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-outline" onclick="Components.closeModal()">Cancelar</button>
      <button type="submit" form="form-editar-usuario" id="btn-salvar-edit-user" class="btn btn-primary">
        💾 Salvar Alterações
      </button>
    `;

    Components.openModal(`✏️ Editar Usuário: ${usuario.nome}`, bodyHtml, footerHtml);
  }

  async function adminSalvarEdicaoUsuario(e, id) {
    e.preventDefault();
    const nome = document.getElementById('modal-edit-nome').value.trim();
    const email = document.getElementById('modal-edit-email').value.trim();
    const setor = document.getElementById('modal-edit-setor').value;
    const tipo = document.getElementById('modal-edit-tipo').value;
    const ativo = parseInt(document.getElementById('modal-edit-ativo').value);
    const btn = document.getElementById('btn-salvar-edit-user');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner spinner-sm" style="margin-right:6px;"></span> Salvando...';
    }

    try {
      const payload = { nome, email, setor, tipo, ativo };
      await DataStore.adminAtualizarUsuario(id, payload);
      Components.showToast('success', 'Atualizado', 'Usuário atualizado com sucesso!');
      Components.closeModal();
      await DataStore.carregarTudo();
      if (paginaAtual === 'admin') renderAdminDashboard();
      else renderAdminUsuarios(_adminFiltro);
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '💾 Salvar Alterações';
      }
      Components.showToast('danger', 'Erro na Edição', err.message);
    }
  }

  async function adminEnviarResetSenha(id) {
    try {
      const data = await DataStore.adminEnviarRedefinicaoSenha(id);
      Components.showToast('success', 'E-mail enviado', data.mensagem || 'Link de redefinição enviado.');
    } catch (err) { Components.showToast('danger', 'Não foi possível enviar', err.message); }
  }

  function renderEsqueciSenha() {
    document.getElementById('auth-title').textContent = 'Recuperar senha';
    document.getElementById('auth-subtitle').textContent = 'Enviaremos um link para seu e-mail';
    document.getElementById('auth-form-container').innerHTML = `
      <form onsubmit="App.solicitarResetSenha(event)">
        <div class="form-group"><label class="form-label">E-mail</label><input type="email" id="reset-email" class="form-input" required placeholder="seu@email.com"></div>
        <button class="btn btn-primary" style="width:100%;margin-top:1rem;">Enviar link</button>
        <div style="text-align:center;margin-top:14px;"><a href="#" onclick="App.renderLogin();return false;" style="color:var(--primary-light);">Voltar ao login</a></div>
      </form>`;
  }

  async function solicitarResetSenha(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${DataStore.getApiUrl()}/auth/esqueci-senha`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:document.getElementById('reset-email').value.trim()})});
      const data = await res.json(); if(!res.ok) throw new Error(data.error || 'Falha ao enviar.');
      Components.showToast('success','Confira seu e-mail',data.mensagem); renderLogin();
    } catch(err) { Components.showToast('danger','Erro',err.message); }
  }

  function renderRedefinirSenha(token) {
    document.getElementById('auth-title').textContent = 'Criar nova senha';
    document.getElementById('auth-subtitle').textContent = 'O link só pode ser usado uma vez';
    document.getElementById('auth-form-container').innerHTML = `
      <form onsubmit="App.confirmarResetSenha(event, '${token.replace(/'/g,"\\'")}')">
        <div class="form-group"><label class="form-label">Nova senha</label><input type="password" id="nova-reset-senha" class="form-input" required minlength="6"></div>
        <div class="form-group"><label class="form-label">Confirmar nova senha</label><input type="password" id="nova-reset-confirma" class="form-input" required minlength="6"></div>
        <button class="btn btn-primary" style="width:100%;margin-top:1rem;">Salvar nova senha</button>
      </form>`;
  }

  async function confirmarResetSenha(e, token) {
    e.preventDefault(); const senha=document.getElementById('nova-reset-senha').value; const confirmacaoSenha=document.getElementById('nova-reset-confirma').value;
    if(senha!==confirmacaoSenha) return Components.showToast('warning','Validação','As senhas não conferem.');
    try { const res=await fetch(`${DataStore.getApiUrl()}/auth/redefinir-senha`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,senha,confirmacaoSenha})}); const data=await res.json(); if(!res.ok) throw new Error(data.error||'Falha ao redefinir.'); Components.showToast('success','Senha alterada',data.mensagem); history.replaceState({},'',location.pathname); renderLogin(); } catch(err){ Components.showToast('danger','Erro',err.message); }
  }

  // ── Modal Detalhes do Usuário (Admin)
  async function abrirModalDetalhesUsuario(id) {
    const usuario = await DataStore.adminGetUsuario(id);
    if (!usuario) {
      Components.showToast('danger', 'Erro', 'Usuário não encontrado.');
      return;
    }

    const isAtivo = usuario.ativo === 1;
    const stats = usuario.estatisticas || { totalChamados: 0, resolvidos: 0, abertos: 0 };
    const ultimosChamados = usuario.ultimosChamados || [];

    const bodyHtml = `
      <div style="display:flex; align-items:center; gap: 16px; margin-bottom: 20px;">
        <div class="profile-avatar-large" style="width: 54px; height: 54px; font-size: 1.2rem;">
          ${usuario.avatar || '??'}
        </div>
        <div>
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">${usuario.nome}</h3>
          <div style="font-size: 0.85rem; color: var(--text-muted);">${usuario.email}</div>
          <div style="margin-top: 4px; display:flex; gap: 6px;">
            <span class="badge ${usuario.tipo === 'administrador' ? 'role-badge-admin' : (usuario.tipo === 'tecnico' ? 'role-badge-tecnico' : 'role-badge-usuario')}">
              ${usuario.tipo === 'administrador' ? '👑 Administrador' : (usuario.tipo === 'tecnico' ? '🔧 Técnico' : '👤 Usuário')}
            </span>
            <span class="badge ${isAtivo ? 'badge-success' : 'badge-danger'}">
              ${isAtivo ? '🟢 Ativo' : '🔴 Inativo'}
            </span>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px;">
        <div style="background: var(--bg-glass); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); text-align: center;">
          <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary);">${stats.totalChamados}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">Total de Chamados</div>
        </div>
        <div style="background: var(--bg-glass); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); text-align: center;">
          <div style="font-size: 1.4rem; font-weight: 800; color: var(--warning);">${stats.abertos}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">Chamados Abertos</div>
        </div>
        <div style="background: var(--bg-glass); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); text-align: center;">
          <div style="font-size: 1.4rem; font-weight: 800; color: var(--success);">${stats.resolvidos}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">Resolvidos</div>
        </div>
      </div>

      <div style="margin-bottom: 12px; font-weight: 600; font-size: 0.85rem; color: var(--text-secondary);">
        📋 Histórico de Chamados Recentes
      </div>
      ${ultimosChamados.length > 0 ? `
        <div class="table-wrapper" style="max-height: 200px; overflow-y: auto;">
          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>Título</th>
                <th>Status</th>
                <th>Prioridade</th>
              </tr>
            </thead>
            <tbody>
              ${ultimosChamados.map(c => `
                <tr onclick="Components.closeModal(); App.navegarPara('detalhe', ${c.id});" style="cursor: pointer;">
                  <td><span style="font-weight: 600; color: var(--primary-light);">${c.numero || '#' + c.id}</span></td>
                  <td><span style="font-size: 0.85rem;">${c.titulo}</span></td>
                  <td><span class="badge ${DataStore.getStatusInfo(c.status).badge}">${DataStore.getStatusInfo(c.status).label}</span></td>
                  <td><span class="badge ${DataStore.getPrioridadeInfo(c.prioridade).badge}">${DataStore.getPrioridadeInfo(c.prioridade).label}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <p style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">
          Nenhum chamado aberto por este usuário até o momento.
        </p>
      `}
    `;

    const footerHtml = `
      <button class="btn btn-outline" onclick="Components.closeModal()">Fechar</button>
      <button class="btn btn-primary" onclick="Components.closeModal(); App.abrirModalEditarUsuario('${id}')">✏️ Editar Usuário</button>
    `;

    Components.openModal(`Detalhes da Conta: ${usuario.nome}`, bodyHtml, footerHtml);
  }

  // ── Alternar Status (Ativar / Desativar)
  async function adminAlternarStatus(id, novoStatus) {
    try {
      const res = await DataStore.adminAlterarStatus(id, novoStatus);
      Components.showToast('success', 'Status Alterado', res.mensagem);
      await DataStore.carregarTudo();
      if (paginaAtual === 'admin') renderAdminDashboard();
      else renderAdminUsuarios(_adminFiltro);
    } catch (err) {
      Components.showToast('danger', 'Erro na Operação', err.message);
    }
  }

  // ── Confirmar Exclusão com Tratamento Seguro e Auditoria
  async function adminConfirmarExclusao(id, nome) {
    const confirmou = await Components.confirmar(
      '⚠️ Confirmação de Exclusão Segura',
      `Deseja realmente excluir o usuário <strong>${nome}</strong>?<br><br>
       <em>Nota de Integridade:</em> Caso este usuário possua chamados ou registros vinculados no sistema, 
       a conta será <strong>desativada com segurança</strong> para preservar a integridade dos relacionamentos e o histórico de auditoria.`
    );

    if (!confirmou) return;

    try {
      const res = await DataStore.adminExcluirUsuario(id);
      if (res.desativado) {
        Components.showToast('warning', 'Conta Desativada', res.mensagem, 6000);
      } else {
        Components.showToast('success', 'Usuário Excluído', res.mensagem);
      }
      await DataStore.carregarTudo();
      if (paginaAtual === 'admin') renderAdminDashboard();
      else renderAdminUsuarios(_adminFiltro);
    } catch (err) {
      Components.showToast('danger', 'Erro na Exclusão', err.message);
    }
  }

  // ============================================================
  // PÁGINA DE PERFIL DO PRÓPRIO USUÁRIO
  // ============================================================
  async function renderPerfil() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
        <div class="spinner"></div>
        <span style="margin-left:12px;color:var(--text-muted);">Carregando perfil...</span>
      </div>
    `;

    let perfil;
    try {
      perfil = await DataStore.perfilObter();
    } catch (err) {
      Components.showToast('danger', 'Erro', err.message);
      navegarPara('dashboard');
      return;
    }

    const setores = DataStore.getSetores() || [];
    const stats = perfil.estatisticas || { total: 0, resolvidos: 0, pendentes: 0 };
    const roleNome = perfil.tipo === 'administrador' ? '👑 Administrador' : (perfil.tipo === 'tecnico' ? '🔧 Técnico' : '👤 Usuário');
    const roleBadgeClass = perfil.tipo === 'administrador' ? 'role-badge-admin' : (perfil.tipo === 'tecnico' ? 'role-badge-tecnico' : 'role-badge-usuario');

    content.innerHTML = `
      <div class="profile-card">
        <div class="profile-header">
          <div class="profile-avatar-large">
            ${perfil.avatar || 'U'}
          </div>
          <div>
            <h2 class="profile-details-title">${perfil.nome}</h2>
            <div class="profile-details-sub">
              <span>${perfil.email}</span>
              <span>•</span>
              <span class="badge ${roleBadgeClass}">${roleNome}</span>
              <span>•</span>
              <span style="color: var(--text-muted);">Setor: ${perfil.setor}</span>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 28px;">
          ${Components.renderStatCard({ valor: stats.total, label: 'Meus Chamados', icon: '📋', tipo: 'primary' })}
          ${Components.renderStatCard({ valor: stats.pendentes, label: 'Em Andamento', icon: '⏳', tipo: 'warning' })}
          ${Components.renderStatCard({ valor: stats.resolvidos, label: 'Resolvidos', icon: '✅', tipo: 'success' })}
        </div>

        <div class="grid-2">
          <!-- Card de Dados Pessoais -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">👤 Informações Pessoais</h3>
            </div>
            <div class="card-body">
              <form onsubmit="App.perfilSalvarDados(event)">
                <div class="form-group">
                  <label class="form-label">Nome Completo</label>
                  <input type="text" id="perfil-nome" class="form-input" required value="${perfil.nome}">
                </div>
                <div class="form-group">
                  <label class="form-label">E-mail (Identificador da Conta)</label>
                  <input type="email" class="form-input" disabled value="${perfil.email}" style="opacity: 0.6; cursor: not-allowed;" title="E-mail fixo por segurança">
                </div>
                <div class="form-group">
                  <label class="form-label">Setor</label>
                  <select id="perfil-setor" class="form-select" required>
                    ${setores.map(s => `<option value="${s.nome}" ${perfil.setor === s.nome ? 'selected' : ''}>${s.nome}</option>`).join('')}
                  </select>
                </div>
                <button type="submit" id="btn-perfil-salvar" class="btn btn-primary" style="margin-top: 10px;">
                  💾 Salvar Dados Pessoais
                </button>
              </form>
            </div>
          </div>

          <!-- Card de Alteração de Senha -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">🔐 Alterar Senha de Acesso</h3>
            </div>
            <div class="card-body">
              <form onsubmit="App.perfilSalvarSenha(event)">
                <div class="form-group">
                  <label class="form-label">Senha Atual *</label>
                  <input type="password" id="perfil-senha-atual" class="form-input" required placeholder="Digite sua senha atual">
                </div>
                <div class="form-group">
                  <label class="form-label">Nova Senha *</label>
                  <input type="password" id="perfil-senha-nova" class="form-input" required minlength="6" placeholder="Mínimo 6 caracteres">
                </div>
                <div class="form-group">
                  <label class="form-label">Confirmar Nova Senha *</label>
                  <input type="password" id="perfil-senha-confirma" class="form-input" required minlength="6" placeholder="Repita a nova senha">
                </div>
                <button type="submit" id="btn-perfil-senha" class="btn btn-accent" style="margin-top: 10px;">
                  🔑 Atualizar Senha
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async function perfilSalvarDados(e) {
    e.preventDefault();
    const nome = document.getElementById('perfil-nome').value.trim();
    const setor = document.getElementById('perfil-setor').value;
    const btn = document.getElementById('btn-perfil-salvar');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner spinner-sm" style="margin-right:6px;"></span> Salvando...';
    }

    try {
      const res = await DataStore.perfilAtualizar({ nome, setor });
      Components.showToast('success', 'Perfil Atualizado', res.mensagem);

      // Atualizar cache de usuário local
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        u.nome = res.usuario.nome;
        u.setor = res.usuario.setor;
        u.avatar = res.usuario.avatar;
        localStorage.setItem('user', JSON.stringify(u));
      }

      await DataStore.carregarTudo();
      renderPerfil();
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '💾 Salvar Dados Pessoais';
      }
      Components.showToast('danger', 'Erro ao Atualizar', err.message);
    }
  }

  async function perfilSalvarSenha(e) {
    e.preventDefault();
    const senhaAtual = document.getElementById('perfil-senha-atual').value;
    const novaSenha = document.getElementById('perfil-senha-nova').value;
    const confirmacaoNovaSenha = document.getElementById('perfil-senha-confirma').value;
    const btn = document.getElementById('btn-perfil-senha');

    if (novaSenha !== confirmacaoNovaSenha) {
      Components.showToast('warning', 'Validação', 'A confirmação da nova senha não confere.');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner spinner-sm" style="margin-right:6px;"></span> Atualizando...';
    }

    try {
      const res = await DataStore.perfilAlterarSenha({
        senhaAtual, novaSenha, confirmacaoNovaSenha
      });
      Components.showToast('success', 'Senha Atualizada', res.mensagem);
      document.getElementById('perfil-senha-atual').value = '';
      document.getElementById('perfil-senha-nova').value = '';
      document.getElementById('perfil-senha-confirma').value = '';
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🔑 Atualizar Senha';
      }
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🔑 Atualizar Senha';
      }
      Components.showToast('danger', 'Erro na Senha', err.message);
    }
  }

  async function adminExcluirChamado(id, numero) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.tipo !== 'administrador') {
      Components.showToast('danger', 'Acesso negado', 'Somente administradores podem excluir chamados.');
      return;
    }
    if (!confirm(`Excluir permanentemente o chamado ${numero || '#'+id}?\n\nO histórico e as respostas desse chamado também serão removidos.`)) return;
    try {
      const resultado = await DataStore.adminExcluirChamado(id);
      Components.showToast('success', 'Chamado excluído', resultado.mensagem);
      await DataStore.carregarTudo();
      await DataStore.carregarMetricas();
      renderChamados();
      atualizarBadges();
    } catch (err) {
      Components.showToast('danger', 'Erro ao excluir', err.message);
    }
  }

  // ---------- API pública ----------
  return {
    init,
    navegarPara,
    renderDetalhe,
    filtrar,
    submitNovoChamado,
    aprovarChamado,
    mostrarRespostaModal,
    enviarResposta,
    enviarRespostaInline,
    reprocessarIA,
    assumirChamado,
    filtrarTecnico,
    resolverChamadoModal,
    confirmarResolucao,
    reabrirChamadoAction,
    mostrarAtribuirTecnicoModal,
    confirmarAtribuicao,
    resetarDados,
    atualizarBadges,
    iniciarPollingChamado,
    preencherLogin,
    renderLogin,
    renderEsqueciSenha,
    solicitarResetSenha,
    renderRedefinirSenha,
    confirmarResetSenha,
    renderRegister,
    realizarLogin,
    realizarCadastro,
    logout,
    // Admin & Perfil
    renderAdminDashboard,
    renderAdminUsuarios,
    aplicarFiltrosAdmin,
    limparFiltrosAdmin,
    abrirModalNovoUsuario,
    adminSalvarNovoUsuario,
    abrirModalEditarUsuario,
    adminEnviarResetSenha,
    adminSalvarEdicaoUsuario,
    abrirModalDetalhesUsuario,
    adminAlternarStatus,
    adminConfirmarExclusao,
    adminExcluirChamado,
    renderPerfil,
    perfilSalvarDados,
    perfilSalvarSenha,
    get paginaAtual() { return paginaAtual; },
    get chamadoAtual() { return chamadoAtual; },
  };
})();

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', async () => {
  await App.init();
});
