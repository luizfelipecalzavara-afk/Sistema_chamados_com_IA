// backend/services/AutomacaoService.js

const simularDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const catalogo = {
  verificar_impressora: {
    id: 'verificar_impressora',
    nome: 'Verificar Impressora',
    descricao: 'Verifica o status da impressora.',
    nivel: 'automatico',
    categoria: 'impressora',
    executar: async () => {
      await simularDelay(1000);
      const online = true; // Simulado fixo para o teste
      return {
        sucesso: true,
        resultado: online ? 'online' : 'offline',
        mensagem: 'Impressora está online e respondendo.'
      };
    }
  },
  verificar_fila_impressao: {
    id: 'verificar_fila_impressao',
    nome: 'Verificar Fila de Impressão',
    descricao: 'Consulta a fila de impressão.',
    nivel: 'automatico',
    categoria: 'impressora',
    executar: async () => {
      await simularDelay(1000);
      return {
        sucesso: true,
        resultado: 'fila_travada',
        mensagem: 'Fila de impressão travada detectada!'
      };
    }
  },
  limpar_fila_impressao: {
    id: 'limpar_fila_impressao',
    nome: 'Limpar Fila de Impressão',
    descricao: 'Remove documentos travados.',
    nivel: 'automatico',
    categoria: 'impressora',
    executar: async () => {
      await simularDelay(1000);
      return {
        sucesso: true,
        resultado: 'fila_limpa',
        mensagem: 'Fila de impressão limpa com sucesso.'
      };
    }
  },
  verificar_servico_impressao: {
    id: 'verificar_servico_impressao',
    nome: 'Verificar Serviço de Impressão',
    descricao: 'Verifica se o Print Spooler está rodando.',
    nivel: 'automatico',
    categoria: 'impressora',
    executar: async () => {
      await simularDelay(1000);
      return { sucesso: true, resultado: 'servico_ok', mensagem: 'Print Spooler está rodando.' };
    }
  },
  testar_impressao: {
    id: 'testar_impressao',
    nome: 'Testar Impressão',
    descricao: 'Envia página de teste para a impressora.',
    nivel: 'automatico',
    categoria: 'impressora',
    executar: async () => {
      await simularDelay(1000);
      return { sucesso: true, resultado: 'teste_ok', mensagem: 'Impressão de teste realizada com sucesso.' };
    }
  },
  reiniciar_fila_impressao: {
    id: 'reiniciar_fila_impressao',
    nome: 'Reiniciar Serviço de Impressão',
    descricao: 'Reinicia o serviço Print Spooler.',
    nivel: 'aprovacao',
    categoria: 'impressora',
    executar: async () => {
      await simularDelay(1000);
      return { sucesso: true, resultado: 'servico_reiniciado', mensagem: 'Serviço reiniciado com sucesso.' };
    }
  },
  redefinir_servico: {
    id: 'redefinir_servico',
    nome: 'Redefinir Serviço Crítico',
    descricao: 'Reinicia serviços críticos.',
    nivel: 'tecnico',
    categoria: 'sistema',
    executar: async () => {
      await simularDelay(1000);
      return { sucesso: true, resultado: 'servico_redefinido', mensagem: 'Serviço redefinido pelo técnico.' };
    }
  }
};

class AutomacaoService {
  getAutomacao(id) {
    return catalogo[id] || null;
  }

  async executar(automacaoId, aprovado = false) {
    const auto = this.getAutomacao(automacaoId);
    if (!auto) {
      return { sucesso: false, mensagem: `Automação ${automacaoId} não encontrada.` };
    }
    if (auto.nivel === 'aprovacao' && !aprovado) {
      return { sucesso: false, requerAprovacao: true, mensagem: `Automação requer aprovação.` };
    }
    if (auto.nivel === 'tecnico') {
      return { sucesso: false, requerTecnico: true, mensagem: `Apenas técnico pode executar.` };
    }

    try {
      const res = await auto.executar();
      return { ...res, automacao: auto };
    } catch (e) {
      return { sucesso: false, mensagem: `Erro na execução: ${e.message}` };
    }
  }

  async fluxoImpressora() {
    // Fluxo específico simulado como pedido ("minha impressora não imprime")
    let steps = [];
    
    let res1 = await catalogo.verificar_impressora.executar();
    steps.push({ step: 'verificar_impressora', result: res1 });
    
    let res2 = await catalogo.verificar_fila_impressao.executar();
    steps.push({ step: 'verificar_fila_impressao', result: res2 });
    
    if (res2.resultado === 'fila_travada') {
      let res3 = await catalogo.limpar_fila_impressao.executar();
      steps.push({ step: 'limpar_fila_impressao', result: res3 });
      
      let res4 = await catalogo.testar_impressao.executar();
      steps.push({ step: 'testar_impressao', result: res4 });
      
      return { resolvido: res4.sucesso, steps, mensagem: 'Fila limpa e teste realizado.' };
    }
    return { resolvido: false, steps, mensagem: 'Não foi possível resolver automaticamente.' };
  }
}

module.exports = new AutomacaoService();
