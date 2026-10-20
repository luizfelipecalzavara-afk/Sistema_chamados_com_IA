// backend/services/AutomationExecutor.js
// Executor de automações — separação clara entre "decidir" e "executar"
// Atualmente: SimulatedAutomationExecutor
// Futuro: RealAutomationExecutor (PowerShell, APIs, etc.)

const simularDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================
// AUTOMAÇÕES SIMULADAS — PARA MVP / TESTES SEM HARDWARE
// ============================================================
const implementacoesSimuladas = {
  verificar_impressora: async () => {
    await simularDelay(1200);
    // Simulado: impressora sempre online no MVP
    return {
      sucesso: true,
      resultado: 'online',
      mensagem: 'Impressora está online e respondendo.',
      detalhes: {
        status: 'Online',
        ip: '192.168.1.50',
        modelo: 'HP LaserJet Pro M404dn'
      }
    };
  },

  verificar_fila_impressao: async () => {
    await simularDelay(1000);
    // Simulado: fila sempre travada no MVP (para demonstrar o fluxo)
    return {
      sucesso: true,
      resultado: 'fila_travada',
      mensagem: 'Fila de impressão travada! 3 documentos pendentes detectados.',
      detalhes: {
        documentosPendentes: 3,
        documentoTravado: 'Relatorio_Financeiro.pdf',
        tempoNaFila: '1h 45min'
      }
    };
  },

  limpar_fila_impressao: async () => {
    await simularDelay(1800);
    return {
      sucesso: true,
      resultado: 'fila_limpa',
      mensagem: 'Fila de impressão limpa com sucesso. 3 documentos removidos.',
      detalhes: {
        documentosRemovidos: 3,
        servicoReiniciado: true
      }
    };
  },

  verificar_servico_impressao: async () => {
    await simularDelay(900);
    return {
      sucesso: true,
      resultado: 'servico_ok',
      mensagem: 'Print Spooler está rodando normalmente.',
      detalhes: {
        servico: 'Print Spooler',
        status: 'Running',
        pid: 1234
      }
    };
  },

  testar_impressao: async () => {
    await simularDelay(2000);
    return {
      sucesso: true,
      resultado: 'teste_ok',
      mensagem: 'Página de teste enviada e impressa com sucesso.',
      detalhes: {
        paginasImpressas: 1,
        tempo: '2s'
      }
    };
  },

  reiniciar_fila_impressao: async () => {
    await simularDelay(2500);
    return {
      sucesso: true,
      resultado: 'servico_reiniciado',
      mensagem: 'Serviço Print Spooler reiniciado com sucesso.',
      detalhes: { servico: 'Print Spooler', acao: 'restart' }
    };
  },

  verificar_conexao_rede: async () => {
    await simularDelay(1500);
    return {
      sucesso: true,
      resultado: 'rede_ok',
      mensagem: 'Conexão de rede verificada. Latência dentro do esperado.',
      detalhes: { latencia: '12ms', packetLoss: '0%', gateway: '192.168.1.1' }
    };
  }
};

// ============================================================
// EXECUTOR SIMULADO
// ============================================================
class SimulatedAutomationExecutor {
  constructor() {
    this.executionMode = 'simulated';
  }

  async executar(automacaoId) {
    const impl = implementacoesSimuladas[automacaoId];
    if (!impl) {
      return {
        sucesso: false,
        resultado: 'nao_encontrada',
        mensagem: `Implementação simulada para "${automacaoId}" não encontrada.`,
        executionMode: this.executionMode
      };
    }

    try {
      const resultado = await impl();
      return { ...resultado, executionMode: this.executionMode };
    } catch (err) {
      return {
        sucesso: false,
        resultado: 'erro_execucao',
        mensagem: `Erro durante execução simulada: ${err.message}`,
        executionMode: this.executionMode
      };
    }
  }
}

// ============================================================
// AUTOMATION EXECUTOR — ponto de entrada
// ============================================================
class AutomationExecutor {
  constructor() {
    // Usa executor simulado por padrão no MVP
    // Futuramente: switch baseado em config para RealAutomationExecutor
    this.executor = new SimulatedAutomationExecutor();
    console.log(`[AUTOMATION] Executor inicializado em modo: ${this.executor.executionMode}`);
  }

  async executar(automacaoId) {
    console.log(`[AUTOMATION] Executando: ${automacaoId} [modo: ${this.executor.executionMode}]`);
    const resultado = await this.executor.executar(automacaoId);
    console.log(`[AUTOMATION] Resultado: ${resultado.resultado} | Sucesso: ${resultado.sucesso}`);
    return resultado;
  }

  getModo() {
    return this.executor.executionMode;
  }
}

module.exports = new AutomationExecutor();
