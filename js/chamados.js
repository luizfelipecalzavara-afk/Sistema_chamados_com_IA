// ============================================
// SISTEMA DE CHAMADOS COM IA — LÓGICA DE NEGÓCIO (API Real Autenticada)
// ============================================

const Chamados = (() => {

  // ── Abrir novo chamado
  async function abrirChamado(titulo, descricao, categoria, prioridade) {
    if (!titulo || !descricao) {
      Components.showToast('warning', 'Campos obrigatórios', 'Preencha título e descrição.');
      return null;
    }

    const config = DataStore.getConfig();
    const payload = {
      titulo,
      descricao,
      usuario_id: config.usuarioAtual,
      categoria: categoria || null,
      prioridade: prioridade || null
    };

    const res = await DataStore.apiFetch('/chamados', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const erro = await res.json().catch(() => ({}));
      throw new Error(erro.error || `HTTP ${res.status}`);
    }

    const chamado = await res.json();
    await DataStore.carregarTudo();
    return chamado;
  }

  // ── Aprovar automação
  async function aprovarAutomacao(id) {
    const res = await DataStore.apiFetch(`/chamados/${id}/aprovar`, { method: 'POST' });
    if (!res.ok) {
      const erro = await res.json().catch(() => ({}));
      throw new Error(erro.error || 'Erro ao aprovar automação.');
    }
    return res.json();
  }

  // ── Adicionar resposta
  async function adicionarResposta(id, mensagem, autorId, autorNome) {
    if (!mensagem || !mensagem.trim()) return;

    let finalAutorId = autorId;
    let finalAutorNome = autorNome;

    const userStr = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (!finalAutorId) finalAutorId = u.id;
        if (!finalAutorNome) finalAutorNome = u.nome;
      } catch (e) {}
    }

    const res = await DataStore.apiFetch(`/chamados/${id}/respostas`, {
      method: 'POST',
      body: JSON.stringify({
        mensagem: mensagem.trim(),
        autor_id: finalAutorId,
        autor_nome: finalAutorNome
      })
    });

    if (!res.ok) {
      const erro = await res.json().catch(() => ({}));
      throw new Error(erro.error || 'Erro ao enviar resposta.');
    }
    return res.json();
  }

  // ── Alias para compatibilidade com app.js
  async function responderComoTecnico(id, mensagem) {
    return adicionarResposta(id, mensagem);
  }

  // ── Resolver chamado
  async function resolverManualmente(id, mensagem) {
    const res = await DataStore.apiFetch(`/chamados/${id}/resolver`, {
      method: 'POST',
      body: JSON.stringify({ mensagem: mensagem || 'Problema resolvido pelo técnico.' })
    });
    if (!res.ok) {
      const erro = await res.json().catch(() => ({}));
      throw new Error(erro.error || 'Erro ao resolver chamado.');
    }
    return res.json();
  }

  // ── Reabrir chamado
  async function reabrirChamado(id) {
    const res = await DataStore.apiFetch(`/chamados/${id}/reabrir`, { method: 'POST' });
    if (!res.ok) {
      const erro = await res.json().catch(() => ({}));
      throw new Error(erro.error || 'Erro ao reabrir chamado.');
    }
    return res.json();
  }

  // ── Atribuir técnico
  async function atribuirTecnico(id, tecnicoId) {
    const res = await DataStore.apiFetch(`/chamados/${id}/atribuir`, {
      method: 'POST',
      body: JSON.stringify({ tecnico_id: tecnicoId })
    });
    if (!res.ok) {
      const erro = await res.json().catch(() => ({}));
      throw new Error(erro.error || 'Erro ao atribuir técnico.');
    }
    return res.json();
  }

  // ── Re-executar diagnóstico da IA
  async function diagnosticarChamado(id) {
    const res = await DataStore.apiFetch(`/chamados/${id}/diagnosticar`, { method: 'POST' });
    if (!res.ok) {
      const erro = await res.json().catch(() => ({}));
      throw new Error(erro.error || 'Erro ao iniciar diagnóstico.');
    }
    return res.json();
  }

  return {
    abrirChamado,
    aprovarAutomacao,
    adicionarResposta,
    responderComoTecnico,
    resolverManualmente,
    reabrirChamado,
    atribuirTecnico,
    diagnosticarChamado
  };
})();
