// ============================================
// SISTEMA DE CHAMADOS COM IA — CATÁLOGO DE AUTOMAÇÕES
// ============================================

const Automacoes = (() => {

  // ---------- Catálogo de Automações ----------
  const catalogo = {
    verificar_impressora: {
      id: 'verificar_impressora',
      nome: 'Verificar Impressora',
      descricao: 'Verifica o status da impressora: se está online, acessível e respondendo.',
      nivel: 'automatico', // 🟢
      nivelLabel: '🟢 Automático',
      nivelBadge: 'badge-success',
      categoria: 'impressora',
      tempoExecucao: 3000, // ms
      executar: async () => {
        await simularDelay(3000);
        // Simula verificação — 80% de chance de estar online
        const online = Math.random() > 0.2;
        return {
          sucesso: true,
          resultado: online ? 'online' : 'offline',
          mensagem: online
            ? '✅ Impressora está online e respondendo normalmente.'
            : '⚠️ Impressora está offline ou não acessível na rede.',
          detalhes: {
            status: online ? 'Online' : 'Offline',
            ip: '192.168.1.50',
            modelo: 'HP LaserJet Pro M404dn',
            ultimaResposta: online ? 'Agora' : 'Há 2 horas'
          }
        };
      }
    },

    verificar_fila_impressao: {
      id: 'verificar_fila_impressao',
      nome: 'Verificar Fila de Impressão',
      descricao: 'Consulta a fila de impressão em busca de documentos pendentes ou travados.',
      nivel: 'automatico',
      nivelLabel: '🟢 Automático',
      nivelBadge: 'badge-success',
      categoria: 'impressora',
      tempoExecucao: 2000,
      executar: async () => {
        await simularDelay(2000);
        // Simula — 70% de chance de ter fila travada
        const travada = Math.random() > 0.3;
        return {
          sucesso: true,
          resultado: travada ? 'fila_travada' : 'fila_ok',
          mensagem: travada
            ? '⚠️ Fila de impressão travada! Encontrados 3 documentos pendentes.'
            : '✅ Fila de impressão está funcionando normalmente.',
          detalhes: {
            documentosPendentes: travada ? 3 : 0,
            documentoTravado: travada ? 'Relatório_Financeiro.pdf' : null,
            tempoNaFila: travada ? '2h 15min' : '0'
          }
        };
      }
    },

    limpar_fila_impressao: {
      id: 'limpar_fila_impressao',
      nome: 'Limpar Fila de Impressão',
      descricao: 'Remove todos os documentos travados da fila e reinicia o serviço de impressão.',
      nivel: 'automatico',
      nivelLabel: '🟢 Automático',
      nivelBadge: 'badge-success',
      categoria: 'impressora',
      tempoExecucao: 4000,
      executar: async () => {
        await simularDelay(4000);
        // Simula — 90% de sucesso
        const sucesso = Math.random() > 0.1;
        return {
          sucesso,
          resultado: sucesso ? 'fila_limpa' : 'erro_limpeza',
          mensagem: sucesso
            ? '✅ Fila de impressão limpa com sucesso! Serviço Print Spooler reiniciado.'
            : '❌ Erro ao limpar a fila de impressão. Serviço pode estar corrompido.',
          detalhes: {
            documentosRemovidos: sucesso ? 3 : 0,
            servicoReiniciado: sucesso,
            spoolerStatus: sucesso ? 'Executando' : 'Parado'
          }
        };
      }
    },

    verificar_conexao_rede: {
      id: 'verificar_conexao_rede',
      nome: 'Verificar Conexão de Rede',
      descricao: 'Testa a conectividade de rede: ping ao gateway, latência e pacotes perdidos.',
      nivel: 'automatico',
      nivelLabel: '🟢 Automático',
      nivelBadge: 'badge-success',
      categoria: 'rede',
      tempoExecucao: 5000,
      executar: async () => {
        await simularDelay(5000);
        // Simula latência
        const latencia = Math.floor(Math.random() * 200) + 5;
        const pacotesPerdidos = Math.floor(Math.random() * 30);
        const problematico = latencia > 100 || pacotesPerdidos > 10;
        return {
          sucesso: true,
          resultado: problematico ? 'rede_instavel' : 'rede_ok',
          mensagem: problematico
            ? `⚠️ Rede instável detectada! Latência: ${latencia}ms, Pacotes perdidos: ${pacotesPerdidos}%`
            : `✅ Rede funcionando normalmente. Latência: ${latencia}ms, Sem perda de pacotes.`,
          detalhes: {
            gateway: '192.168.1.1',
            latencia: `${latencia}ms`,
            pacotesPerdidos: `${pacotesPerdidos}%`,
            ipLocal: '192.168.1.105',
            dns: '8.8.8.8'
          }
        };
      }
    },

    testar_dns: {
      id: 'testar_dns',
      nome: 'Testar DNS',
      descricao: 'Testa a resolução de nomes DNS para verificar se o serviço está funcionando.',
      nivel: 'automatico',
      nivelLabel: '🟢 Automático',
      nivelBadge: 'badge-success',
      categoria: 'rede',
      tempoExecucao: 3000,
      executar: async () => {
        await simularDelay(3000);
        const funcionando = Math.random() > 0.25;
        return {
          sucesso: true,
          resultado: funcionando ? 'dns_ok' : 'dns_falha',
          mensagem: funcionando
            ? '✅ DNS resolvendo normalmente. Servidores DNS respondendo.'
            : '❌ Falha na resolução DNS. Servidor DNS não está respondendo.',
          detalhes: {
            servidorDNS: '8.8.8.8',
            teste: 'google.com → ' + (funcionando ? '142.250.79.46' : 'TIMEOUT'),
            tempoResposta: funcionando ? '23ms' : 'N/A'
          }
        };
      }
    },

    reiniciar_fila_impressao: {
      id: 'reiniciar_fila_impressao',
      nome: 'Reiniciar Serviço de Impressão',
      descricao: 'Reinicia o serviço Print Spooler do Windows. Pode interromper impressões em andamento.',
      nivel: 'aprovacao',
      nivelLabel: '🟡 Aprovação Necessária',
      nivelBadge: 'badge-warning',
      categoria: 'impressora',
      tempoExecucao: 6000,
      executar: async () => {
        await simularDelay(6000);
        const sucesso = Math.random() > 0.15;
        return {
          sucesso,
          resultado: sucesso ? 'servico_reiniciado' : 'erro_reinicio',
          mensagem: sucesso
            ? '✅ Serviço Print Spooler reiniciado com sucesso!'
            : '❌ Erro ao reiniciar o serviço. Pode ser necessário reiniciar o computador.',
          detalhes: {
            servico: 'Print Spooler',
            acao: 'Restart',
            statusAnterior: 'Parado',
            statusAtual: sucesso ? 'Executando' : 'Parado'
          }
        };
      }
    },

    verificar_usuario_bloqueado: {
      id: 'verificar_usuario_bloqueado',
      nome: 'Verificar Usuário Bloqueado',
      descricao: 'Consulta o Active Directory para verificar se a conta do usuário está bloqueada.',
      nivel: 'aprovacao',
      nivelLabel: '🟡 Aprovação Necessária',
      nivelBadge: 'badge-warning',
      categoria: 'acesso',
      tempoExecucao: 4000,
      executar: async () => {
        await simularDelay(4000);
        const bloqueado = Math.random() > 0.3;
        return {
          sucesso: true,
          resultado: bloqueado ? 'conta_bloqueada' : 'conta_ativa',
          mensagem: bloqueado
            ? '⚠️ Conta de usuário BLOQUEADA no Active Directory. Último bloqueio: 3 tentativas incorretas de senha.'
            : '✅ Conta de usuário está ativa e desbloqueada.',
          detalhes: {
            status: bloqueado ? 'Bloqueada' : 'Ativa',
            tentativasIncorretas: bloqueado ? 3 : 0,
            ultimaAlteracaoSenha: 'Há 45 dias',
            senhaExpira: 'Em 15 dias'
          }
        };
      }
    },

    redefinir_servico: {
      id: 'redefinir_servico',
      nome: 'Redefinir Serviço Crítico',
      descricao: 'Reinicia serviços críticos do sistema. ALTO IMPACTO — pode afetar múltiplos usuários.',
      nivel: 'tecnico',
      nivelLabel: '🔴 Somente Técnico',
      nivelBadge: 'badge-danger',
      categoria: 'sistema',
      tempoExecucao: 8000,
      executar: async () => {
        await simularDelay(8000);
        return {
          sucesso: true,
          resultado: 'servico_redefinido',
          mensagem: '✅ Serviço redefinido com sucesso pelo técnico.',
          detalhes: {
            servico: 'Serviço do Sistema',
            acao: 'Reinício completo',
            impacto: 'Possível breve interrupção para usuários conectados'
          }
        };
      }
    }
  };

  // ---------- Helpers ----------
  function simularDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retorna todas as automações do catálogo
   */
  function getCatalogo() {
    return Object.values(catalogo);
  }

  /**
   * Retorna uma automação pelo ID
   */
  function getAutomacao(id) {
    return catalogo[id] || null;
  }

  /**
   * Filtra automações por categoria
   */
  function getAutomacoesPorCategoria(categoria) {
    return Object.values(catalogo).filter(a => a.categoria === categoria);
  }

  /**
   * Filtra automações por nível
   */
  function getAutomacoesPorNivel(nivel) {
    return Object.values(catalogo).filter(a => a.nivel === nivel);
  }

  /**
   * Verifica se a automação pode ser executada automaticamente
   */
  function podeExecutarAuto(automacaoId) {
    const auto = catalogo[automacaoId];
    if (!auto) return false;
    return auto.nivel === 'automatico';
  }

  /**
   * Verifica se a automação precisa de aprovação
   */
  function precisaAprovacao(automacaoId) {
    const auto = catalogo[automacaoId];
    if (!auto) return false;
    return auto.nivel === 'aprovacao';
  }

  /**
   * Verifica se a automação é somente para técnico
   */
  function somenteTecnico(automacaoId) {
    const auto = catalogo[automacaoId];
    if (!auto) return false;
    return auto.nivel === 'tecnico';
  }

  /**
   * Executa uma automação (com validação de nível)
   * @param {string} automacaoId - ID da automação
   * @param {boolean} aprovado - Se a automação foi aprovada (para nível 🟡)
   * @returns {object} Resultado da execução
   */
  async function executar(automacaoId, aprovado = false) {
    const auto = catalogo[automacaoId];

    if (!auto) {
      return {
        sucesso: false,
        resultado: 'nao_encontrada',
        mensagem: `❌ Automação "${automacaoId}" não encontrada no catálogo.`
      };
    }

    // Validação de nível
    if (auto.nivel === 'aprovacao' && !aprovado) {
      return {
        sucesso: false,
        resultado: 'aprovacao_necessaria',
        mensagem: `⏳ Automação "${auto.nome}" requer aprovação de um técnico (Nível 🟡).`,
        automacao: auto
      };
    }

    if (auto.nivel === 'tecnico') {
      return {
        sucesso: false,
        resultado: 'somente_tecnico',
        mensagem: `🔴 Automação "${auto.nome}" só pode ser executada por um técnico (Nível 🔴).`,
        automacao: auto
      };
    }

    // Executar
    try {
      const resultado = await auto.executar();
      return { ...resultado, automacao: auto };
    } catch (err) {
      return {
        sucesso: false,
        resultado: 'erro_execucao',
        mensagem: `❌ Erro ao executar "${auto.nome}": ${err.message}`,
        automacao: auto
      };
    }
  }

  /**
   * Fluxo de diagnóstico completo para impressora
   * Simula: verificar → fila → limpar → testar
   */
  async function fluxoImpressora(chamadoId, onStep) {
    const steps = [];

    // Step 1: Verificar impressora
    onStep && onStep({ step: 1, total: 4, descricao: 'Verificando status da impressora...', status: 'executando' });
    const step1 = await catalogo.verificar_impressora.executar();
    steps.push({ automacao: 'verificar_impressora', ...step1 });
    onStep && onStep({ step: 1, total: 4, descricao: step1.mensagem, status: 'concluido', resultado: step1 });

    // Step 2: Verificar fila
    onStep && onStep({ step: 2, total: 4, descricao: 'Verificando fila de impressão...', status: 'executando' });
    const step2 = await catalogo.verificar_fila_impressao.executar();
    steps.push({ automacao: 'verificar_fila_impressao', ...step2 });
    onStep && onStep({ step: 2, total: 4, descricao: step2.mensagem, status: 'concluido', resultado: step2 });

    // Step 3: Limpar fila (se travada)
    if (step2.resultado === 'fila_travada') {
      onStep && onStep({ step: 3, total: 4, descricao: 'Limpando fila de impressão travada...', status: 'executando' });
      const step3 = await catalogo.limpar_fila_impressao.executar();
      steps.push({ automacao: 'limpar_fila_impressao', ...step3 });
      onStep && onStep({ step: 3, total: 4, descricao: step3.mensagem, status: 'concluido', resultado: step3 });

      // Step 4: Verificar novamente
      onStep && onStep({ step: 4, total: 4, descricao: 'Testando impressão novamente...', status: 'executando' });
      await simularDelay(2000);
      const sucesso = step3.sucesso;
      const step4 = {
        sucesso,
        resultado: sucesso ? 'teste_ok' : 'teste_falha',
        mensagem: sucesso
          ? '✅ Teste de impressão realizado com sucesso! Problema resolvido.'
          : '❌ Teste de impressão falhou. Encaminhando para técnico.'
      };
      steps.push({ automacao: 'teste_impressao', ...step4 });
      onStep && onStep({ step: 4, total: 4, descricao: step4.mensagem, status: 'concluido', resultado: step4 });

      return {
        sucesso: step4.sucesso,
        resolvido: step4.sucesso,
        steps,
        mensagemFinal: step4.sucesso
          ? 'Problema resolvido automaticamente! A fila de impressão estava travada e foi limpa com sucesso.'
          : 'Automação não conseguiu resolver o problema. Encaminhado para técnico.'
      };
    } else {
      // Fila OK — problema pode ser outro
      onStep && onStep({ step: 3, total: 4, descricao: 'Fila está normal. Verificando conectividade da impressora...', status: 'executando' });
      await simularDelay(2000);

      if (step1.resultado === 'offline') {
        const step3 = {
          sucesso: false,
          resultado: 'impressora_offline',
          mensagem: '⚠️ Impressora está offline. Necessária verificação física do equipamento.'
        };
        steps.push({ automacao: 'verificacao_fisica', ...step3 });
        onStep && onStep({ step: 3, total: 4, descricao: step3.mensagem, status: 'concluido', resultado: step3 });

        return {
          sucesso: false,
          resolvido: false,
          steps,
          mensagemFinal: 'Impressora offline. Encaminhado para técnico para verificação física.'
        };
      }

      const step3 = {
        sucesso: true,
        resultado: 'tudo_ok',
        mensagem: '✅ Todos os testes passaram. O problema pode ter sido temporário.'
      };
      steps.push({ automacao: 'verificacao_geral', ...step3 });
      onStep && onStep({ step: 3, total: 4, descricao: step3.mensagem, status: 'concluido', resultado: step3 });

      return {
        sucesso: true,
        resolvido: true,
        steps,
        mensagemFinal: 'Todos os diagnósticos foram concluídos. O problema parece ter sido temporário. Chamado mantido em observação.'
      };
    }
  }

  // ---------- API pública ----------
  return {
    getCatalogo,
    getAutomacao,
    getAutomacoesPorCategoria,
    getAutomacoesPorNivel,
    podeExecutarAuto,
    precisaAprovacao,
    somenteTecnico,
    executar,
    fluxoImpressora,
  };
})();
