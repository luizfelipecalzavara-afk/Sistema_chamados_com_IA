// backend/services/VerificacaoService.js
// Verifica se o problema foi realmente resolvido após execução de automação.
// REGRA FUNDAMENTAL: Executar automação ≠ problema resolvido.

const AutomationExecutor = require('./AutomationExecutor');

class VerificacaoService {
  /**
   * Verifica se o problema foi resolvido após execução das automações.
   * @param {object} chamado - Objeto do chamado
   * @param {object} resultadoAutomacao - Resultado da automação executada
   * @returns {{ resolvido: boolean, mensagem: string, resultadoVerificacao: object }}
   */
  async verificarResolucao(chamado, resultadoAutomacao) {
    console.log('[VERIFY] Iniciando verificação de resolução...');

    const categoria = chamado?.diagnostico?.categoria || chamado?.categoria;

    // Verificação específica para impressora
    if (categoria === 'impressora') {
      return await this._verificarImpressora(chamado, resultadoAutomacao);
    }

    // Verificação para rede
    if (categoria === 'rede') {
      return await this._verificarRede(chamado, resultadoAutomacao);
    }

    // Verificação genérica
    return this._verificarGenerico(resultadoAutomacao);
  }

  async _verificarImpressora(chamado, resultadoAutomacao) {
    // Se a automação executada foi limpar a fila, executar testar_impressao como verificação
    const acaoExecutada = chamado?.diagnostico?.acaoSugerida || '';

    if (['limpar_fila_impressao', 'reiniciar_fila_impressao', 'verificar_servico_impressao'].includes(acaoExecutada)) {
      console.log('[VERIFY] Executando testar_impressao como verificação...');
      try {
        const resultadoTeste = await AutomationExecutor.executar('testar_impressao');

        if (resultadoTeste.sucesso && resultadoTeste.resultado === 'teste_ok') {
          console.log('[VERIFY] Verificação: impressão de teste bem-sucedida.');
          return {
            resolvido: true,
            mensagem: `Verificação confirmada: ${resultadoTeste.mensagem}`,
            resultadoVerificacao: resultadoTeste
          };
        } else {
          console.log('[VERIFY] Verificação: impressão de teste falhou.');
          return {
            resolvido: false,
            mensagem: `Problema persiste após automação. Verificação: ${resultadoTeste.mensagem}`,
            resultadoVerificacao: resultadoTeste
          };
        }
      } catch (err) {
        console.warn('[VERIFY] Erro durante verificação:', err.message);
        return {
          resolvido: false,
          mensagem: 'Não foi possível verificar o resultado. Requer análise técnica.',
          resultadoVerificacao: { sucesso: false, mensagem: err.message }
        };
      }
    }

    // Para outras automações de impressora (verificar_impressora, verificar_fila)
    if (resultadoAutomacao.sucesso) {
      return {
        resolvido: false,
        mensagem: 'Diagnóstico concluído. Aguardando execução da ação corretiva.',
        resultadoVerificacao: resultadoAutomacao
      };
    }

    return {
      resolvido: false,
      mensagem: 'Automação não teve sucesso. Requer análise técnica.',
      resultadoVerificacao: resultadoAutomacao
    };
  }

  async _verificarRede(chamado, resultadoAutomacao) {
    // Para rede, verificar conectividade
    if (resultadoAutomacao.sucesso && resultadoAutomacao.resultado === 'rede_ok') {
      return {
        resolvido: true,
        mensagem: 'Conectividade de rede verificada e normalizada.',
        resultadoVerificacao: resultadoAutomacao
      };
    }
    return {
      resolvido: false,
      mensagem: 'Problema de rede persiste. Requer intervenção técnica.',
      resultadoVerificacao: resultadoAutomacao
    };
  }

  _verificarGenerico(resultadoAutomacao) {
    if (resultadoAutomacao && resultadoAutomacao.sucesso) {
      return {
        resolvido: true,
        mensagem: 'Automação executada com sucesso. Problema considerado resolvido.',
        resultadoVerificacao: resultadoAutomacao
      };
    }
    return {
      resolvido: false,
      mensagem: 'Problema persiste após automação. Encaminhando para técnico.',
      resultadoVerificacao: resultadoAutomacao
    };
  }
}

module.exports = new VerificacaoService();
