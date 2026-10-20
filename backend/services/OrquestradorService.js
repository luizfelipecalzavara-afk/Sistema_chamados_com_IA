// backend/services/OrquestradorService.js
// Orquestrador principal do fluxo: Chamado → IA → Permissões → Automação → Verificação → Resultado

const AIService = require('./AIService');
const PermissionService = require('./PermissionService');
const AutomationExecutor = require('./AutomationExecutor');
const ChamadoService = require('./ChamadoService');
const VerificacaoService = require('./VerificacaoService');

class OrquestradorService {

  // ============================================================
  // Fluxo principal: chamado novo → diagnóstico → ação
  // ============================================================
  async processarNovoChamado(chamadoId) {
    console.log(`[TICKET] Iniciando processamento do chamado ID: ${chamadoId}`);
    const chamado = await ChamadoService.getChamadoById(chamadoId);
    if (!chamado) {
      console.error(`[TICKET] Chamado ${chamadoId} não encontrado.`);
      return;
    }

    // ── ETAPA 1: Atualizar status para "em_diagnostico"
    await ChamadoService.atualizarChamado(chamadoId, { status: 'em_analise' });
    await ChamadoService.adicionarHistorico(chamadoId, 'status_change', 'Chamado recebido. Iniciando análise da IA.', 'sistema');

    // ── ETAPA 2: Diagnóstico da IA
    console.log(`[AI] Diagnosticando chamado ${chamadoId}...`);
    await ChamadoService.adicionarHistorico(chamadoId, 'ia_iniciado', 'IA iniciou o diagnóstico do problema.', 'ia');

    let diagnostico;
    try {
      diagnostico = await AIService.diagnosticar(chamado.descricao);
    } catch (err) {
      console.error('[AI] Erro no diagnóstico:', err.message);
      await ChamadoService.atualizarChamado(chamadoId, { status: 'aberto', prioridade: 'media', sla: 4 });
      await ChamadoService.adicionarHistorico(chamadoId, 'ia_erro', `Erro no diagnóstico: ${err.message}. Encaminhado para triagem manual.`, 'ia');
      return;
    }

    console.log(`[AI] Diagnóstico concluído: categoria=${diagnostico.categoria}, confiança=${diagnostico.confianca}, fonte=${diagnostico.fonte}`);

    const categoriaFinal = chamado.categoria || diagnostico.categoria;
    const prioridadeFinal = chamado.prioridade || diagnostico.prioridade;
    const slaFinal = diagnostico.sla || 4;

    await ChamadoService.atualizarChamado(chamadoId, {
      categoria: categoriaFinal,
      prioridade: prioridadeFinal,
      sla: slaFinal,
      status: 'em_diagnostico',
      diagnostico: {
        categoria: diagnostico.categoria,
        problema: diagnostico.problema,
        confianca: diagnostico.confianca,
        diagnostico: diagnostico.diagnostico,
        acaoSugerida: diagnostico.acaoSugerida,
        automacaoPossivel: diagnostico.automacaoPossivel,
        solucao: diagnostico.solucao,
        fonte: diagnostico.fonte,
        origem: diagnostico.origem || diagnostico.fonte,
        justificativa: diagnostico.justificativa
      }
    });

    await ChamadoService.adicionarHistorico(
      chamadoId,
      'ia_diagnostico',
      `Diagnóstico concluído: ${diagnostico.diagnostico || diagnostico.problema} | Confiança: ${Math.round(diagnostico.confianca * 100)}% | Fonte: ${diagnostico.fonte}`,
      'ia'
    );

    if (diagnostico.solucao) {
      await ChamadoService.adicionarHistorico(
        chamadoId,
        'ia_sugestao',
        `Sugestão de solução: ${diagnostico.solucao}`,
        'ia'
      );
    }

    // ── ETAPA 4: Verificar se há automação disponível
    if (!diagnostico.acaoSugerida) {
      console.log(`[TICKET] Sem automação disponível para chamado ${chamadoId}.`);
      await ChamadoService.atualizarChamado(chamadoId, { status: 'tecnico_necessario' });
      await ChamadoService.adicionarHistorico(
        chamadoId,
        'encaminhamento',
        'Sem automação disponível para este tipo de problema. Encaminhado para análise técnica.',
        'sistema'
      );
      return;
    }

    // ── ETAPA 5: Verificar permissão
    console.log(`[PERMISSION] Verificando permissão para: ${diagnostico.acaoSugerida}`);
    const permissao = await PermissionService.verificar(diagnostico.acaoSugerida, diagnostico.confianca);

    await ChamadoService.adicionarHistorico(
      chamadoId,
      'permissao',
      `Permissão verificada: ${permissao.motivo}`,
      'sistema'
    );

    if (permissao.requerTecnico) {
      await ChamadoService.atualizarChamado(chamadoId, { status: 'tecnico_necessario' });
      await ChamadoService.adicionarHistorico(
        chamadoId,
        'encaminhamento',
        `Encaminhado para técnico: ${permissao.motivo}`,
        'sistema'
      );
      return;
    }

    if (permissao.requerAprovacao) {
      await ChamadoService.atualizarChamado(chamadoId, { status: 'aguardando_aprovacao' });
      await ChamadoService.adicionarHistorico(
        chamadoId,
        'aprovacao_pendente',
        `Automação "${permissao.automacao?.nome}" requer aprovação técnica: ${permissao.motivo}`,
        'sistema'
      );
      return;
    }

    if (!permissao.permitido) {
      await ChamadoService.atualizarChamado(chamadoId, { status: 'tecnico_necessario' });
      await ChamadoService.adicionarHistorico(
        chamadoId,
        'encaminhamento',
        `Automação não permitida: ${permissao.motivo}`,
        'sistema'
      );
      return;
    }

    // ── ETAPA 6: Executar SOMENTE a automação autorizada para o diagnóstico.
    // Nunca direcionar categorias diferentes para um fluxo fixo de impressora.
    await this.executarAutomacaoSugerida(chamadoId, diagnostico, permissao);
  }

  // ============================================================
  // Executa a ação sugerida pela IA e autorizada pelo PermissionService
  // ============================================================
  async executarAutomacaoSugerida(chamadoId, diagnostico, permissao) {
    const chamado = await ChamadoService.getChamadoById(chamadoId);
    const acao = diagnostico.acaoSugerida;

    if (!acao) {
      await ChamadoService.atualizarChamado(chamadoId, { status: 'tecnico_necessario' });
      await ChamadoService.adicionarHistorico(chamadoId, 'encaminhamento', 'Nenhuma automação compatível foi indicada. Aguardando técnico.', 'sistema');
      return;
    }

    // Defesa adicional: a ação que será executada precisa ser exatamente a que foi autorizada.
    if (permissao?.automacao?.id && permissao.automacao.id !== acao) {
      await ChamadoService.atualizarChamado(chamadoId, { status: 'tecnico_necessario' });
      await ChamadoService.adicionarHistorico(chamadoId, 'encaminhamento', 'A automação autorizada não corresponde à ação sugerida pela IA. Execução bloqueada por segurança.', 'sistema');
      return;
    }

    await ChamadoService.atualizarChamado(chamadoId, { status: 'automacao' });
    await ChamadoService.adicionarHistorico(
      chamadoId,
      'automacao_inicio',
      `Iniciando automação: ${permissao?.automacao?.nome || acao}.`,
      'sistema'
    );
    await ChamadoService.adicionarHistorico(
      chamadoId,
      'automacao_passo',
      `Executando ação autorizada: ${permissao?.automacao?.nome || acao}.`,
      'automacao'
    );

    const resultado = await AutomationExecutor.executar(acao);
    await ChamadoService.adicionarHistorico(
      chamadoId,
      'automacao_resultado',
      `${resultado.mensagem} [modo: ${resultado.executionMode}]`,
      'automacao'
    );

    await ChamadoService.atualizarChamado(chamadoId, { status: 'verificacao' });
    await ChamadoService.adicionarHistorico(chamadoId, 'verificacao_inicio', 'Executando verificação pós-ação...', 'sistema');

    const chamadoAtualizado = await ChamadoService.getChamadoById(chamadoId);
    const verificacao = await VerificacaoService.verificarResolucao(chamadoAtualizado || chamado, resultado);
    await ChamadoService.adicionarHistorico(chamadoId, 'verificacao_resultado', verificacao.mensagem, 'sistema');

    if (verificacao.resolvido) {
      await ChamadoService.atualizarChamado(chamadoId, { status: 'resolvido_ia', resolvido_em: new Date() });
      await ChamadoService.adicionarHistorico(chamadoId, 'resolucao', `✅ Chamado resolvido automaticamente pela IA. ${verificacao.mensagem}`, 'ia');
    } else {
      await ChamadoService.atualizarChamado(chamadoId, { status: 'tecnico_necessario' });
      await ChamadoService.adicionarHistorico(chamadoId, 'encaminhamento', '⚠️ A automação correta foi executada, mas a verificação não confirmou a resolução. Aguardando técnico.', 'sistema');
    }
  }

  // ============================================================
  // Execução após aprovação manual do técnico
  // ============================================================
  async executarAposAprovacao(chamadoId) {
    const chamado = await ChamadoService.getChamadoById(chamadoId);
    if (!chamado) throw new Error(`Chamado ${chamadoId} não encontrado`);

    const acaoSugerida = chamado.diagnostico?.acaoSugerida;
    if (!acaoSugerida) throw new Error('Chamado não possui ação sugerida no diagnóstico');

    await ChamadoService.adicionarHistorico(chamadoId, 'aprovacao_concedida', 'Técnico aprovou a execução da automação.', 'tecnico');
    await ChamadoService.atualizarChamado(chamadoId, { status: 'automacao' });

    // Verificar permissão com aprovação = true
    const permissao = await PermissionService.verificar(acaoSugerida, chamado.diagnostico?.confianca || 0, true);
    if (!permissao.permitido) throw new Error(`Automação não pode ser executada: ${permissao.motivo}`);

    console.log(`[AUTOMATION] Executando após aprovação: ${acaoSugerida}`);
    await ChamadoService.adicionarHistorico(chamadoId, 'automacao_passo', `Executando: ${permissao.automacao?.nome || acaoSugerida}`, 'automacao');

    const resultado = await AutomationExecutor.executar(acaoSugerida);
    await ChamadoService.adicionarHistorico(chamadoId, 'automacao_resultado', `${resultado.mensagem} [modo: ${resultado.executionMode}]`, 'automacao');

    // Verificação
    await ChamadoService.atualizarChamado(chamadoId, { status: 'verificacao' });
    const verificacao = await VerificacaoService.verificarResolucao(chamado, resultado);
    await ChamadoService.adicionarHistorico(chamadoId, 'verificacao_resultado', verificacao.mensagem, 'sistema');

    if (verificacao.resolvido) {
      await ChamadoService.atualizarChamado(chamadoId, { status: 'resolvido_ia', resolvido_em: new Date() });
      await ChamadoService.adicionarHistorico(chamadoId, 'resolucao', `✅ Resolvido após aprovação. ${verificacao.mensagem}`, 'ia');
    } else {
      await ChamadoService.atualizarChamado(chamadoId, { status: 'tecnico_necessario' });
      await ChamadoService.adicionarHistorico(chamadoId, 'encaminhamento', `⚠️ Problema não resolvido. Requer intervenção técnica.`, 'sistema');
    }
  }
}

module.exports = new OrquestradorService();
