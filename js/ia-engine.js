// ============================================
// SISTEMA DE CHAMADOS COM IA — MOTOR DE IA
// ============================================

const IAEngine = (() => {

  // ---------- Base de conhecimento (keywords → classificação) ----------
  const baseConhecimento = {
    impressora: {
      keywords: ['impressora', 'imprimir', 'impressão', 'imprime', 'toner', 'papel', 'scanner', 'digitalizar', 'xerox', 'hp laserjet', 'print spooler', 'fila de impressão'],
      problemas: {
        fila_travada: {
          keywords: ['não imprime', 'parou de imprimir', 'travou', 'fila', 'presa', 'travada', 'pendente', 'não sai'],
          confiancaBase: 0.90,
          acaoSugerida: 'limpar_fila_impressao',
          descricao: 'Fila de impressão travada',
          solucao: 'Limpeza da fila de impressão e reinício do serviço Print Spooler'
        },
        offline: {
          keywords: ['offline', 'desligada', 'desconectada', 'não aparece', 'sumiu', 'não encontra'],
          confiancaBase: 0.85,
          acaoSugerida: 'verificar_impressora',
          descricao: 'Impressora offline ou desconectada',
          solucao: 'Verificação de conectividade e status da impressora'
        },
        qualidade: {
          keywords: ['borrando', 'manchando', 'listras', 'fraco', 'claro demais', 'torto', 'desalinhado'],
          confiancaBase: 0.75,
          acaoSugerida: null,
          descricao: 'Problema de qualidade de impressão',
          solucao: 'Verificação de toner/cartucho e alinhamento de cabeçote'
        },
      }
    },
    rede: {
      keywords: ['internet', 'rede', 'wifi', 'conexão', 'conectar', 'lenta', 'lento', 'caiu', 'sem acesso', 'ping', 'latência', 'cabo de rede', 'switch', 'roteador'],
      problemas: {
        conexao_lenta: {
          keywords: ['lenta', 'lento', 'demora', 'devagar', 'carregando', 'travando', 'latência'],
          confiancaBase: 0.85,
          acaoSugerida: 'verificar_conexao_rede',
          descricao: 'Conexão de rede lenta',
          solucao: 'Diagnóstico de latência e verificação de infraestrutura de rede'
        },
        sem_conexao: {
          keywords: ['sem internet', 'sem conexão', 'caiu', 'não conecta', 'sem rede', 'não acessa', 'sem acesso'],
          confiancaBase: 0.88,
          acaoSugerida: 'verificar_conexao_rede',
          descricao: 'Sem conexão de rede',
          solucao: 'Verificação de cabo, switch e configurações de IP'
        },
        vpn_falha: {
          keywords: ['vpn', 'home office', 'remoto', 'túnel', 'timeout vpn'],
          confiancaBase: 0.82,
          acaoSugerida: 'verificar_conexao_rede',
          descricao: 'Falha na conexão VPN',
          solucao: 'Verificação de conectividade, DNS e configuração da VPN'
        },
        dns: {
          keywords: ['dns', 'resolver', 'nome', 'domínio', 'site não abre', 'endereço'],
          confiancaBase: 0.80,
          acaoSugerida: 'testar_dns',
          descricao: 'Problema de resolução DNS',
          solucao: 'Teste e reconfiguração de DNS'
        },
      }
    },
    acesso: {
      keywords: ['login', 'senha', 'acesso', 'bloqueado', 'bloqueada', 'bloquear', 'entrar', 'autenticação', 'credencial', 'permissão', 'logon', 'conta'],
      problemas: {
        usuario_bloqueado: {
          keywords: ['bloqueado', 'bloqueada', 'bloquear', 'travada conta', 'muitas tentativas', 'expirou'],
          confiancaBase: 0.91,
          acaoSugerida: 'verificar_usuario_bloqueado',
          descricao: 'Usuário bloqueado',
          solucao: 'Verificação e desbloqueio de conta do usuário'
        },
        senha_expirada: {
          keywords: ['senha expirou', 'trocar senha', 'redefinir senha', 'nova senha', 'esqueci senha'],
          confiancaBase: 0.88,
          acaoSugerida: 'verificar_usuario_bloqueado',
          descricao: 'Senha expirada ou esquecida',
          solucao: 'Redefinição de senha do usuário'
        },
        sem_permissao: {
          keywords: ['sem permissão', 'acesso negado', 'não autorizado', 'proibido', 'sem acesso ao sistema', 'não aparece'],
          confiancaBase: 0.78,
          acaoSugerida: null,
          descricao: 'Sem permissão de acesso',
          solucao: 'Verificação e ajuste de permissões — requer análise do técnico'
        }
      }
    },
    hardware: {
      keywords: ['computador', 'monitor', 'teclado', 'mouse', 'memória', 'disco', 'HD', 'SSD', 'fonte', 'placa', 'tela', 'reiniciando', 'travando', 'barulho', 'esquentando', 'lento demais'],
      problemas: {
        reinicio_inesperado: {
          keywords: ['reiniciando sozinho', 'reinicia', 'desliga sozinho', 'tela azul', 'blue screen', 'BSOD'],
          confiancaBase: 0.72,
          acaoSugerida: null,
          descricao: 'Reinício inesperado ou tela azul',
          solucao: 'Análise de logs de sistema, temperatura e hardware — requer técnico presencial'
        },
        lentidao: {
          keywords: ['computador lento', 'muito lento', 'travando', 'demora para abrir', 'congelando'],
          confiancaBase: 0.76,
          acaoSugerida: null,
          descricao: 'Lentidão no computador',
          solucao: 'Verificação de uso de CPU, memória e disco'
        },
        periferico: {
          keywords: ['mouse', 'teclado', 'monitor', 'webcam', 'headset', 'fone', 'USB', 'não funciona', 'parou de funcionar'],
          confiancaBase: 0.70,
          acaoSugerida: null,
          descricao: 'Problema com periférico',
          solucao: 'Troca ou verificação do periférico — requer suporte presencial'
        }
      }
    },
    software: {
      keywords: ['programa', 'aplicativo', 'sistema', 'software', 'atualização', 'instalar', 'abrir', 'erro', 'crashando', 'não abre'],
      problemas: {
        nao_abre: {
          keywords: ['não abre', 'não inicia', 'erro ao abrir', 'crashando', 'fecha sozinho', 'parou de funcionar'],
          confiancaBase: 0.74,
          acaoSugerida: 'redefinir_servico',
          descricao: 'Software não abre ou trava',
          solucao: 'Reinstalação ou reparo do software'
        },
        atualizacao: {
          keywords: ['atualizar', 'atualização', 'versão nova', 'update', 'patch'],
          confiancaBase: 0.80,
          acaoSugerida: null,
          descricao: 'Necessidade de atualização',
          solucao: 'Atualização do software para versão mais recente'
        }
      }
    },
    email: {
      keywords: ['email', 'e-mail', 'outlook', 'enviar email', 'receber email', 'caixa de entrada', 'spam'],
      problemas: {
        nao_envia: {
          keywords: ['não envia', 'não manda', 'erro ao enviar', 'retornou', 'voltou', 'bounced'],
          confiancaBase: 0.80,
          acaoSugerida: 'verificar_conexao_rede',
          descricao: 'E-mail não envia',
          solucao: 'Verificação de conectividade e configurações de e-mail'
        },
        nao_recebe: {
          keywords: ['não recebe', 'não chega', 'atrasado', 'sumiu email'],
          confiancaBase: 0.78,
          acaoSugerida: null,
          descricao: 'E-mail não recebe mensagens',
          solucao: 'Verificação de cota de caixa e regras de spam'
        }
      }
    }
  };

  // ---------- Chamados similares (base de aprendizado) ----------
  const baseSimilares = {
    fila_travada: { total: 127, resolvidos: 119, taxa: 94 },
    offline: { total: 84, resolvidos: 71, taxa: 85 },
    conexao_lenta: { total: 95, resolvidos: 68, taxa: 72 },
    sem_conexao: { total: 112, resolvidos: 89, taxa: 79 },
    vpn_falha: { total: 43, resolvidos: 31, taxa: 72 },
    dns: { total: 56, resolvidos: 49, taxa: 88 },
    usuario_bloqueado: { total: 203, resolvidos: 191, taxa: 94 },
    senha_expirada: { total: 178, resolvidos: 170, taxa: 96 },
    reinicio_inesperado: { total: 37, resolvidos: 22, taxa: 59 },
    nao_abre: { total: 64, resolvidos: 41, taxa: 64 },
    nao_envia: { total: 45, resolvidos: 38, taxa: 84 },
  };

  // ---------- Funções de Classificação ----------

  /**
   * Normaliza o texto removendo acentos e convertendo para minúsculas
   */
  function normalizar(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calcula a relevância de uma lista de keywords contra o texto
   */
  function calcularRelevancia(texto, keywords) {
    const textoNorm = normalizar(texto);
    let matchCount = 0;
    let totalWeight = 0;

    for (const kw of keywords) {
      const kwNorm = normalizar(kw);
      if (textoNorm.includes(kwNorm)) {
        matchCount++;
        // Keywords mais longas têm mais peso
        totalWeight += kwNorm.length;
      }
    }

    return {
      matchCount,
      totalWeight,
      score: keywords.length > 0 ? matchCount / keywords.length : 0
    };
  }

  /**
   * Classifica a descrição do chamado
   * Retorna: { categoria, problema, confianca, acaoSugerida, descricao, solucao, similares }
   */
  function classificar(descricao) {
    if (!descricao || descricao.trim().length === 0) {
      return null;
    }

    let melhorCategoria = null;
    let melhorProblema = null;
    let melhorConfianca = 0;
    let melhorAcao = null;
    let melhorDescricao = '';
    let melhorSolucao = '';
    let melhorProblemaKey = null;

    // Passo 1: Encontrar a melhor categoria
    for (const [catKey, catData] of Object.entries(baseConhecimento)) {
      const relCat = calcularRelevancia(descricao, catData.keywords);

      if (relCat.matchCount === 0) continue;

      // Passo 2: Dentro da categoria, encontrar o melhor problema
      for (const [probKey, probData] of Object.entries(catData.problemas)) {
        const relProb = calcularRelevancia(descricao, probData.keywords);

        if (relProb.matchCount === 0) continue;

        // Calcular confiança combinada
        let confianca = probData.confiancaBase;

        // Bonus por matches da categoria
        confianca += relCat.score * 0.05;

        // Bonus por matches do problema
        confianca += relProb.score * 0.08;

        // Bonus por comprimento do texto (mais contexto = mais confiança)
        if (descricao.length > 50) confianca += 0.02;
        if (descricao.length > 100) confianca += 0.02;

        // Cap em 0.99
        confianca = Math.min(0.99, confianca);

        if (confianca > melhorConfianca) {
          melhorConfianca = confianca;
          melhorCategoria = catKey;
          melhorProblema = probKey;
          melhorAcao = probData.acaoSugerida;
          melhorDescricao = probData.descricao;
          melhorSolucao = probData.solucao;
          melhorProblemaKey = probKey;
        }
      }
    }

    // Se não encontrou nada com confiança mínima
    if (!melhorCategoria || melhorConfianca < 0.3) {
      // Tenta classificar só pela categoria
      let melhorCatScore = 0;
      for (const [catKey, catData] of Object.entries(baseConhecimento)) {
        const rel = calcularRelevancia(descricao, catData.keywords);
        if (rel.totalWeight > melhorCatScore) {
          melhorCatScore = rel.totalWeight;
          melhorCategoria = catKey;
        }
      }

      return {
        categoria: melhorCategoria || 'outro',
        problema: 'nao_identificado',
        confianca: Math.max(0.35, melhorConfianca),
        acaoSugerida: null,
        descricao: 'Problema não identificado automaticamente',
        solucao: 'Requer análise manual pelo técnico de suporte.',
        similares: null
      };
    }

    // Buscar dados de chamados similares
    const similares = baseSimilares[melhorProblemaKey] || null;

    return {
      categoria: melhorCategoria,
      problema: melhorProblema,
      confianca: Math.round(melhorConfianca * 100) / 100,
      acaoSugerida: melhorAcao,
      descricao: melhorDescricao,
      solucao: melhorSolucao,
      similares
    };
  }

  /**
   * Determina a prioridade baseada na classificação
   */
  function determinarPrioridade(diagnostico, descricao) {
    const textoNorm = normalizar(descricao);

    // Palavras que indicam urgência
    const urgente = ['urgente', 'critico', 'parado', 'produção', 'todos', 'empresa toda', 'servidor', 'ninguem consegue'];
    const alta = ['importante', 'bloqueado', 'nao consigo trabalhar', 'parou', 'varios', 'muitos'];

    for (const u of urgente) {
      if (textoNorm.includes(normalizar(u))) return 'critica';
    }

    for (const a of alta) {
      if (textoNorm.includes(normalizar(a))) return 'alta';
    }

    // Prioridade por categoria
    if (diagnostico) {
      if (diagnostico.categoria === 'hardware' && diagnostico.problema === 'reinicio_inesperado') return 'critica';
      if (diagnostico.categoria === 'rede' && diagnostico.problema === 'sem_conexao') return 'alta';
      if (diagnostico.categoria === 'acesso') return 'alta';
    }

    // Confiança baixa pode indicar problema incomum = prioridade mais alta
    if (diagnostico && diagnostico.confianca < 0.6) return 'alta';

    return 'media';
  }

  /**
   * Determina o SLA em horas baseado na prioridade
   */
  function determinarSLA(prioridade) {
    const slaMap = { critica: 1, alta: 2, media: 4, baixa: 8 };
    return slaMap[prioridade] || 4;
  }

  /**
   * Gera uma resposta de diagnóstico formatada para o histórico
   */
  function gerarRespostaDiagnostico(diagnostico) {
    if (!diagnostico) return 'Não foi possível realizar o diagnóstico automático.';

    let resposta = `**Diagnóstico provável:** ${diagnostico.descricao}\n`;
    resposta += `**Confiança:** ${Math.round(diagnostico.confianca * 100)}%\n`;
    resposta += `**Solução recomendada:** ${diagnostico.solucao}`;

    if (diagnostico.similares) {
      resposta += `\n**Chamados semelhantes:** ${diagnostico.similares.total}`;
      resposta += `\n**Taxa histórica de resolução:** ${diagnostico.similares.taxa}%`;
    }

    return resposta;
  }

  /**
   * Processo completo: classificar + priorizar + definir SLA
   * Retorna um objeto de diagnóstico completo
   */
  function diagnosticar(descricao) {
    const classificacao = classificar(descricao);
    if (!classificacao) return null;

    const prioridade = determinarPrioridade(classificacao, descricao);
    const sla = determinarSLA(prioridade);

    return {
      ...classificacao,
      prioridade,
      sla,
      respostaDiagnostico: gerarRespostaDiagnostico(classificacao)
    };
  }

  // ---------- API pública ----------
  return {
    classificar,
    diagnosticar,
    determinarPrioridade,
    determinarSLA,
    gerarRespostaDiagnostico,
    normalizar,
  };
})();
