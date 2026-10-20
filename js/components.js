// ============================================
// SISTEMA DE CHAMADOS COM IA — COMPONENTES UI
// ============================================

const Components = (() => {

  // ---------- Toast Notifications ----------
  function showToast(tipo, titulo, mensagem, duracao = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const iconMap = {
      success: '✅',
      danger: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `
      <span class="toast-icon">${iconMap[tipo] || 'ℹ️'}</span>
      <div class="toast-body">
        <div class="toast-title">${titulo}</div>
        <div class="toast-message">${mensagem}</div>
      </div>
      <button class="modal-close" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duracao);
  }

  // ---------- Stat Card ----------
  function renderStatCard(config) {
    const { valor, label, icon, tipo, trend, trendValor } = config;
    let trendHtml = '';
    if (trend) {
      trendHtml = `<span class="stat-trend ${trend}">${trend === 'up' ? '↑' : '↓'} ${trendValor}</span>`;
    }

    return `
      <div class="stat-card ${tipo} animate-slide-in">
        <div class="stat-card-header">
          <div class="stat-icon">${icon}</div>
          ${trendHtml}
        </div>
        <div class="stat-value">${valor}</div>
        <div class="stat-label">${label}</div>
      </div>
    `;
  }

  // ---------- Chamado Row (para tabela) ----------
  function renderChamadoRow(chamado, mostrarAcoesAdmin = false) {
    const usuario = DataStore.getUsuario(chamado.usuario_id || chamado.usuario);
    const usuarioNome = chamado.usuario_nome || usuario.nome || 'Usuário';
    const usuarioAvatar = chamado.usuario_avatar || usuario.avatar || '??';
    const statusInfo = DataStore.getStatusInfo(chamado.status);
    const prioridadeInfo = DataStore.getPrioridadeInfo(chamado.prioridade);
    const categoriaInfo = DataStore.getCategoriaInfo(chamado.categoria);
    const tempo = DataStore.tempoRelativo(chamado.criado_em || chamado.criadoEm);
    const numeroIdentificador = chamado.numero || `#${String(chamado.id).padStart(6, '0')}`;

    return `
      <tr onclick="App.navegarPara('detalhe', ${chamado.id})" class="animate-slide-in" style="cursor: pointer;">
        <td>
          <span style="color: var(--text-muted); font-weight: 700;">${numeroIdentificador}</span>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.7rem;">${usuarioAvatar}</div>
            <div>
              <div style="font-weight: 600; font-size: 0.85rem;">${chamado.titulo}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${usuarioNome} · ${chamado.usuario_setor || usuario.setor || 'Geral'}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge badge-dot ${statusInfo.badge}">${statusInfo.label}</span>
        </td>
        <td>
          <span class="badge ${prioridadeInfo.badge}">${prioridadeInfo.label}</span>
        </td>
        <td>
          <span>${categoriaInfo.icon} ${categoriaInfo.label}</span>
        </td>
        <td>
          <span style="color: var(--text-muted); font-size: 0.8rem;">${tempo}</span>
        </td>
        ${mostrarAcoesAdmin ? `
          <td style="text-align:center;">
            <button class="btn btn-outline btn-sm" style="color:var(--danger); border-color:var(--danger);" title="Excluir chamado de teste" onclick="event.stopPropagation(); App.adminExcluirChamado(${chamado.id}, '${String(numeroIdentificador).replace(/'/g, "\\'")}')">🗑️ Excluir</button>
          </td>` : ''}
      </tr>
    `;
  }

  // ---------- Timeline Item ----------
  function renderTimelineItem(evento, index) {
    const tipoMap = {
      abertura: { dot: 'user', icon: '📋' },
      ia_iniciado: { dot: 'ia', icon: '🤖' },
      ia_classificacao: { dot: 'ia', icon: '🧠' },
      ia_diagnostico: { dot: 'ia', icon: '🔍' },
      ia_sugestao: { dot: 'ia', icon: '💡' },
      ia_erro: { dot: 'warning', icon: '⚠️' },
      permissao: { dot: 'info', icon: '🔐' },
      automacao: { dot: 'info', icon: '⚙️' },
      automacao_inicio: { dot: 'info', icon: '🚀' },
      automacao_passo: { dot: 'info', icon: '⚡' },
      automacao_resultado: { dot: 'info', icon: '📊' },
      verificacao_inicio: { dot: 'success', icon: '🔄' },
      verificacao_resultado: { dot: 'success', icon: '✔️' },
      aprovacao_pendente: { dot: 'warning', icon: '⏳' },
      aprovacao_concedida: { dot: 'success', icon: '✅' },
      encaminhamento: { dot: 'warning', icon: '📤' },
      tecnico: { dot: 'info', icon: '👨‍🔧' },
      tecnico_atribuido: { dot: 'info', icon: '👤' },
      resolucao: { dot: 'success', icon: '✅' },
      resolucao_manual: { dot: 'success', icon: '👨‍🔧' },
      reabertura: { dot: 'warning', icon: '🔄' },
      comentario: { dot: 'user', icon: '💬' },
      resposta: { dot: 'user', icon: '💬' },
      status_change: { dot: 'info', icon: '📌' },
    };

    const config = tipoMap[evento.tipo] || { dot: 'info', icon: '📌' };
    const tempo = DataStore.formatarData(evento.timestamp);

    return `
      <div class="timeline-item stagger-${Math.min(index + 1, 6)}" style="animation-delay: ${index * 0.05}s;">
        <div class="timeline-dot ${config.dot}">${config.icon}</div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="timeline-title">${getTipoLabel(evento.tipo)}</span>
            <span class="timeline-time">${tempo}</span>
          </div>
          <div class="timeline-body">${evento.descricao}</div>
          ${evento.autor ? `<div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">Por: <strong>${evento.autor}</strong></div>` : ''}
        </div>
      </div>
    `;
  }

  function getTipoLabel(tipo) {
    const labels = {
      abertura: 'Abertura de Chamado',
      ia_iniciado: 'IA Iniciou Análise',
      ia_classificacao: 'Classificação da IA',
      ia_diagnostico: 'Diagnóstico da IA',
      ia_sugestao: 'Recomendação da IA',
      ia_erro: 'Fallback da IA',
      permissao: 'Controle de Permissão',
      automacao: 'Automação',
      automacao_inicio: 'Início de Automação',
      automacao_passo: 'Etapa de Automação',
      automacao_resultado: 'Resultado da Automação',
      verificacao_inicio: 'Verificação Pós-Ação',
      verificacao_resultado: 'Resultado da Verificação',
      aprovacao_pendente: 'Aguardando Aprovação',
      aprovacao_concedida: 'Aprovação Concedida',
      encaminhamento: 'Encaminhamento',
      tecnico: 'Atendimento Técnico',
      tecnico_atribuido: 'Técnico Atribuído',
      resolucao: 'Resolução Automática',
      resolucao_manual: 'Resolução Técnica',
      reabertura: 'Reabertura de Chamado',
      comentario: 'Resposta Registrada',
      resposta: 'Resposta Registrada',
      status_change: 'Atualização de Status',
    };
    return labels[tipo] || tipo;
  }

  // ---------- Automation Card ----------
  function renderAutomationCard(automacao) {
    return `
      <div class="automation-card animate-slide-in">
        <div class="automation-card-header">
          <span class="automation-name">${automacao.nome}</span>
          <span class="badge ${automacao.nivelBadge || 'badge-info'}">${automacao.nivelLabel || automacao.nivel}</span>
        </div>
        <div class="automation-desc">${automacao.descricao}</div>
        <div class="automation-meta">
          <span>📁 ${DataStore.getCategoriaInfo(automacao.categoria).label}</span>
          <span>⏱️ ~${Math.round((automacao.tempoExecucao || 2000) / 1000)}s</span>
          <span>🆔 ${automacao.id}</span>
        </div>
      </div>
    `;
  }

  // ---------- Diagnosis Panel ----------
  function renderDiagnosisPanel(diagnostico) {
    if (!diagnostico) return '';

    const categoriaInfo = DataStore.getCategoriaInfo(diagnostico.categoria);
    const confiancaPercent = Math.round(diagnostico.confianca * 100);
    const isGemini = (diagnostico.origem === 'gemini' || diagnostico.fonte === 'gemini');

    const origemBadge = isGemini
      ? '<span class="badge badge-accent" style="font-weight: 700; padding: 4px 10px; font-size: 0.8rem;">🤖 Google Gemini (IA Real)</span>'
      : '<span class="badge badge-warning" style="font-weight: 700; padding: 4px 10px; font-size: 0.8rem;">⚙️ Classificador Local (Fallback por Regras)</span>';

    const confiancaColor = confiancaPercent >= 80 ? 'var(--success)' : (confiancaPercent >= 60 ? 'var(--warning)' : 'var(--danger)');

    return `
      <div class="diagnosis-panel animate-scale-in">
        <div class="diagnosis-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="diagnosis-header-icon">🤖</div>
            <div class="diagnosis-header-text">
              <h3>Diagnóstico Assistido por IA</h3>
              <span>Análise automatizada de causa-raiz e recomendações</span>
            </div>
          </div>
          <div>${origemBadge}</div>
        </div>

        <div class="diagnosis-body">
          <div class="diagnosis-result">
            <div class="diagnosis-result-item">
              <div class="diagnosis-result-label">Categoria Identificada:</div>
              <div class="diagnosis-result-value" style="font-weight: 600;">${categoriaInfo.icon} ${categoriaInfo.label}</div>
            </div>

            <div class="diagnosis-result-item">
              <div class="diagnosis-result-label">Nível de Confiança:</div>
              <div style="display: flex; align-items: center; gap: 10px; margin-top: 4px;">
                <span style="font-weight: 800; font-size: 1.1rem; color: ${confiancaColor};">${confiancaPercent}%</span>
                <div class="progress-bar" style="flex: 1; height: 8px; background: rgba(255,255,255,0.08);">
                  <div class="progress-fill" style="width: ${confiancaPercent}%; background: ${confiancaColor};"></div>
                </div>
              </div>
            </div>

            <div class="diagnosis-result-item" style="grid-column: 1 / -1;">
              <div class="diagnosis-result-label">Problema Diagnosticado:</div>
              <div class="diagnosis-result-value" style="font-weight: 600; color: #fff; font-size: 0.95rem;">
                ${diagnostico.problema || diagnostico.diagnostico || 'Não identificado'}
              </div>
            </div>

            <div class="diagnosis-result-item" style="grid-column: 1 / -1;">
              <div class="diagnosis-result-label">Justificativa da Decisão:</div>
              <div class="diagnosis-result-value" style="color: var(--text-secondary); font-size: 0.88rem; line-height: 1.6; background: rgba(0,0,0,0.2); padding: 10px 14px; border-radius: var(--radius-sm); border-left: 3px solid var(--primary-light);">
                ${diagnostico.justificativa || diagnostico.diagnostico || 'Classificação baseada nos termos do chamado.'}
              </div>
            </div>

            <div class="diagnosis-result-item" style="grid-column: 1 / -1;">
              <div class="diagnosis-result-label">Ação / Automação Recomendada:</div>
              <div class="diagnosis-result-value" style="font-weight: 700; color: var(--primary-light); display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                ${diagnostico.acaoSugerida ? `
                  <span>⚡ ${diagnostico.acaoSugerida}</span>
                  <span class="badge ${diagnostico.automacaoPossivel ? 'badge-success' : 'badge-warning'}">
                    ${diagnostico.automacaoPossivel ? 'Pronta para Execução' : 'Requer Técnico'}
                  </span>
                ` : '<span style="color: var(--text-muted); font-weight: normal;">Nenhuma ação automatizada disponível — Requer intervenção humana.</span>'}
              </div>
            </div>

            ${diagnostico.solucao ? `
              <div class="diagnosis-result-item" style="grid-column: 1 / -1;">
                <div class="diagnosis-result-label">Orientação de Resolução:</div>
                <div class="diagnosis-result-value" style="color: var(--text-muted); font-size: 0.85rem;">
                  ${diagnostico.solucao}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // ---------- Execution Steps ----------
  function renderExecutionStep(step) {
    const statusIcons = {
      executando: '<div class="spinner spinner-sm"></div>',
      concluido: '✅',
      erro: '❌',
      pendente: '⏳'
    };

    return `
      <div class="flex items-center gap-md" style="padding: 12px 16px; background: var(--bg-glass); border-radius: var(--radius-sm); margin-bottom: 8px; border: 1px solid var(--border-subtle); animation: fadeSlideIn 0.3s ease forwards;">
        <div style="min-width: 24px; text-align: center;">
          ${statusIcons[step.status] || statusIcons.pendente}
        </div>
        <div style="flex: 1;">
          <div style="font-size: 0.8rem; font-weight: 600;">Passo ${step.step} de ${step.total}</div>
          <div style="font-size: 0.78rem; color: var(--text-secondary);">${step.descricao}</div>
        </div>
      </div>
    `;
  }

  // ---------- Modal ----------
  function openModal(titulo, bodyHtml, footerHtml) {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">${titulo}</h2>
          <button class="modal-close" onclick="Components.closeModal()">✕</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
      </div>
    `;

    overlay.classList.add('active');
    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  // ---------- Empty State ----------
  function renderEmptyState(icon, titulo, descricao, actionHtml) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <div class="empty-state-title">${titulo}</div>
        <div class="empty-state-desc">${descricao}</div>
        ${actionHtml || ''}
      </div>
    `;
  }

  // ---------- Confirm Dialog ----------
  function confirmar(titulo, mensagem) {
    return new Promise((resolve) => {
      openModal(titulo, `
        <p style="color: var(--text-secondary); font-size: 0.9rem;">${mensagem}</p>
      `, `
        <button class="btn btn-outline" onclick="Components.closeModal(); window._confirmResolve(false);">Cancelar</button>
        <button class="btn btn-primary" onclick="Components.closeModal(); window._confirmResolve(true);">Confirmar</button>
      `);
      window._confirmResolve = resolve;
    });
  }

  // ---------- API pública ----------
  return {
    showToast,
    renderStatCard,
    renderChamadoRow,
    renderTimelineItem,
    renderAutomationCard,
    renderDiagnosisPanel,
    renderExecutionStep,
    renderEmptyState,
    openModal,
    closeModal,
    confirmar,
  };
})();
