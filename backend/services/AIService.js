// backend/services/AIService.js
// Serviço de Inteligência Artificial
// Integra com Google Gemini (real) com fallback para classificação local por keywords
// A IA NUNCA executa comandos — apenas analisa, diagnostica e sugere.

require('dotenv').config();

// ============================================================
// BASE DE CONHECIMENTO LOCAL (Fallback)
// ============================================================
const baseConhecimento = {
  impressora: {
    keywords: ['impressora', 'imprimir', 'impressão', 'imprime', 'toner', 'papel', 'scanner',
      'digitalizar', 'xerox', 'hp laserjet', 'print spooler', 'fila de impressao',
      'fila impressao', 'nao imprime', 'parou de imprimir', 'nao sai nada'],
    problemas: {
      fila_travada: {
        keywords: ['nao imprime', 'parou de imprimir', 'travou', 'fila', 'presa', 'travada',
          'pendente', 'nao sai', 'documentos presos', 'fila travada', 'nao sai nada',
          'mandei imprimir', 'ficam na fila', 'presos'],
        confiancaBase: 0.88,
        acaoSugerida: 'limpar_fila_impressao',
        descricao: 'Fila de impressão travada',
        solucao: 'Limpeza da fila de impressão e reinício do serviço Print Spooler'
      },
      offline: {
        keywords: ['offline', 'desligada', 'desconectada', 'nao aparece', 'sumiu', 'nao encontra',
          'nao reconhece', 'sem impressora'],
        confiancaBase: 0.82,
        acaoSugerida: 'verificar_impressora',
        descricao: 'Impressora offline ou desconectada',
        solucao: 'Verificação de conectividade e status da impressora'
      },
      servico: {
        keywords: ['servico', 'spooler', 'print spooler', 'servico parou', 'reiniciar servico'],
        confiancaBase: 0.85,
        acaoSugerida: 'verificar_servico_impressao',
        descricao: 'Serviço de impressão com problema',
        solucao: 'Verificar e reiniciar o serviço Print Spooler'
      }
    }
  },
  rede: {
    keywords: ['internet', 'rede', 'wifi', 'conexao', 'conectar', 'lenta', 'lento', 'caiu',
      'sem acesso', 'ping', 'latencia', 'cabo de rede', 'switch', 'roteador', 'sem internet'],
    problemas: {
      conexao_lenta: {
        keywords: ['lenta', 'lento', 'demora', 'devagar', 'carregando', 'travando', 'latencia'],
        confiancaBase: 0.82,
        acaoSugerida: 'verificar_conexao_rede',
        descricao: 'Conexão de rede lenta',
        solucao: 'Diagnóstico de latência e verificação de infraestrutura de rede'
      },
      sem_conexao: {
        keywords: ['sem internet', 'sem conexao', 'caiu', 'nao conecta', 'sem rede',
          'nao acessa', 'sem acesso', 'nao ha conexao'],
        confiancaBase: 0.85,
        acaoSugerida: 'verificar_conexao_rede',
        descricao: 'Sem conexão de rede',
        solucao: 'Verificação de cabo, switch e configurações de IP'
      }
    }
  },
  acesso: {
    keywords: ['login', 'senha', 'acesso', 'bloqueado', 'bloqueada', 'bloquear', 'entrar',
      'autenticacao', 'credencial', 'permissao', 'logon', 'conta', 'usuario bloqueado'],
    problemas: {
      usuario_bloqueado: {
        keywords: ['bloqueado', 'bloqueada', 'bloquear', 'travada conta', 'muitas tentativas',
          'expirou', 'nao consigo acessar', 'usuario bloqueado', 'conta bloqueada'],
        confiancaBase: 0.89,
        acaoSugerida: 'verificar_usuario_bloqueado',
        descricao: 'Usuário bloqueado',
        solucao: 'Verificação e desbloqueio de conta do usuário'
      }
    }
  },
  vpn: {
    keywords: ['vpn', 'vpn nao conecta', 'home office', 'acesso remoto', 'tunnel', 'timeout vpn'],
    problemas: {
      vpn_falha: {
        keywords: ['vpn', 'nao conecta', 'timeout', 'erro vpn', 'home office', 'acesso remoto'],
        confiancaBase: 0.83,
        acaoSugerida: null,
        descricao: 'VPN com falha de conexão',
        solucao: 'Requer análise técnica da configuração VPN'
      }
    }
  }
};

// ============================================================
// CLASSIFICADOR LOCAL (Fallback)
// ============================================================
class ClassificadorLocal {
  normalizar(texto) {
    if (!texto) return '';
    return texto.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  calcularRelevancia(texto, keywords) {
    const textoNorm = this.normalizar(texto);
    let matchCount = 0;
    let totalWeight = 0;
    for (const kw of keywords) {
      const kwNorm = this.normalizar(kw);
      if (textoNorm.includes(kwNorm)) {
        matchCount++;
        totalWeight += kwNorm.length;
      }
    }
    return { matchCount, totalWeight, score: keywords.length > 0 ? matchCount / keywords.length : 0 };
  }

  classificar(descricao) {
    if (!descricao) return null;
    let melhorCategoria = null, melhorProblema = null;
    let melhorConfianca = 0, melhorAcao = null;
    let melhorDescricao = '', melhorSolucao = '';

    for (const [catKey, catData] of Object.entries(baseConhecimento)) {
      const relCat = this.calcularRelevancia(descricao, catData.keywords);
      if (relCat.matchCount === 0) continue;

      for (const [, probData] of Object.entries(catData.problemas)) {
        const relProb = this.calcularRelevancia(descricao, probData.keywords);
        if (relProb.matchCount === 0) continue;

        let confianca = probData.confiancaBase;
        confianca += relCat.score * 0.05;
        confianca += relProb.score * 0.08;
        if (descricao.length > 50) confianca += 0.02;
        if (descricao.length > 100) confianca += 0.02;
        confianca = Math.min(0.97, confianca);

        if (confianca > melhorConfianca) {
          melhorConfianca = confianca;
          melhorCategoria = catKey;
          melhorProblema = probData;
          melhorAcao = probData.acaoSugerida;
          melhorDescricao = probData.descricao;
          melhorSolucao = probData.solucao;
        }
      }
    }

    if (!melhorCategoria) {
      return {
        categoria: 'outro',
        problema: 'nao_identificado',
        confianca: 0.35,
        acao: null,
        acaoSugerida: null,
        justificativa: 'Problema não identificado automaticamente',
        diagnostico: 'Problema não identificado automaticamente',
        solucao: 'Requer análise manual pelo técnico de suporte.',
        automacaoPossivel: false,
        origem: 'Classificador Local (fallback)',
        fonte: 'Classificador Local (fallback)'
      };
    }

    return {
      categoria: melhorCategoria,
      problema: melhorProblema?.descricao || 'identificado',
      confianca: Math.round(melhorConfianca * 100) / 100,
      acao: melhorAcao,
      acaoSugerida: melhorAcao,
      justificativa: melhorDescricao,
      diagnostico: melhorDescricao,
      solucao: melhorSolucao,
      automacaoPossivel: !!melhorAcao,
      origem: 'Classificador Local (fallback)',
      fonte: 'Classificador Local (fallback)'
    };
  }
}

// ============================================================
// INTEGRAÇÃO REAL — GOOGLE GEMINI
// ============================================================
let geminiModel = null;

function initGemini() {
  if (!process.env.AI_API_KEY) return null;
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY);
    const modelName = process.env.AI_MODEL || 'gemini-1.5-flash';
    const model = genAI.getGenerativeModel({ model: modelName });
    console.log(`[AI] Google Gemini inicializado com modelo: ${modelName}`);
    return model;
  } catch (e) {
    console.warn('[AI] Falha ao inicializar Gemini:', e.message);
    return null;
  }
}

// Inicializar Gemini ao carregar o módulo
geminiModel = initGemini();

// ============================================================
// VALIDAÇÃO DA RESPOSTA DA IA
// ============================================================
const CATEGORIAS_VALIDAS = Object.keys(baseConhecimento).concat(['outro', 'software', 'hardware', 'email', 'sistema']);
const ACOES_VALIDAS = [
  'verificar_impressora', 'verificar_fila_impressao', 'limpar_fila_impressao',
  'verificar_servico_impressao', 'testar_impressao', 'reiniciar_fila_impressao',
  'verificar_conexao_rede', null
];

function validarRespostaIA(resposta) {
  if (!resposta || typeof resposta !== 'object') return false;
  if (!resposta.categoria || typeof resposta.categoria !== 'string') return false;
  if (typeof resposta.confianca !== 'number' || resposta.confianca < 0 || resposta.confianca > 1) return false;

  // Normalizar categoria para minúsculas
  resposta.categoria = resposta.categoria.toLowerCase().trim();

  // Validar categoria
  if (!CATEGORIAS_VALIDAS.includes(resposta.categoria)) {
    console.warn(`[AI] Categoria inválida recebida: "${resposta.categoria}" — usando "outro"`);
    resposta.categoria = 'outro';
  }

  // Validar ação sugerida — NUNCA confiar cegamente
  if (resposta.acao && !ACOES_VALIDAS.includes(resposta.acao)) {
    console.warn(`[AI] Ação inválida recebida: "${resposta.acao}" — ignorada`);
    resposta.acao = null;
    resposta.automacaoPossivel = false;
  }

  // Regra de negócio do MVP: problemas classificados como rede/DNS possuem
  // uma automação segura de diagnóstico. Se o Gemini reconhecer a categoria
  // como rede mas devolver ação nula, normalizamos para verificar_conexao_rede.
  // Isso evita encaminhar ao técnico apenas por variação de texto do modelo.
  const textoRede = `${resposta.problema || ''} ${resposta.justificativa || ''}`.toLowerCase();
  if (resposta.categoria === 'rede' && !resposta.acao) {
    resposta.acao = 'verificar_conexao_rede';
  }
  if (/\bdns\b|conectividade|sem internet|sem acesso.*internet|sites? não abrem|sites? nao abrem/i.test(textoRede) && !resposta.acao) {
    resposta.categoria = 'rede';
    resposta.acao = 'verificar_conexao_rede';
  }

  // Garantir campos obrigatórios mapeando para retrocompatibilidade
  resposta.problema = resposta.problema || 'identificado';
  const descricoesAcao = {
    verificar_impressora: 'Verificar o status e a conectividade da impressora.',
    verificar_fila_impressao: 'Verificar a fila de impressão.',
    limpar_fila_impressao: 'Limpar a fila de impressão e verificar o resultado.',
    verificar_servico_impressao: 'Verificar o serviço de impressão.',
    testar_impressao: 'Executar um teste de impressão.',
    reiniciar_fila_impressao: 'Reiniciar o serviço de impressão após aprovação.',
    verificar_conexao_rede: 'Verificar a conectividade, latência e disponibilidade da rede.'
  };
  const solucaoPedeTecnico = typeof resposta.solucao === 'string' && /aguardar.*t[eé]cnic|an[aá]lise t[eé]cnic|interven[cç][aã]o humana/i.test(resposta.solucao);
  if (resposta.acao && (!resposta.solucao || solucaoPedeTecnico)) {
    resposta.solucao = descricoesAcao[resposta.acao] || 'Executar a automação autorizada e verificar o resultado.';
  } else if (!resposta.solucao) {
    resposta.solucao = 'Aguardar análise técnica.';
  }
  resposta.acaoSugerida = resposta.acao;
  resposta.diagnostico = resposta.justificativa || resposta.diagnostico;
  resposta.automacaoPossivel = !!resposta.acaoSugerida;
  resposta.origem = 'gemini';
  resposta.fonte = 'gemini';

  return true;
}

// ============================================================
// PROMPT DE SEGURANÇA PARA A IA
// ============================================================
function buildPrompt(descricao) {
  // Sanitizar a entrada do usuário — remover caracteres de controle e limitar tamanho
  const textoLimpo = String(descricao)
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .substring(0, 500)
    .trim();

  return `Você é um sistema especializado em suporte técnico de TI. Analise a descrição do problema abaixo e retorne APENAS um objeto JSON válido, sem markdown, sem explicações extras.

REGRAS IMPORTANTES:
1. Você NUNCA deve executar comandos, apenas analisar e sugerir.
2. O campo "acao" deve ser EXATAMENTE um destes valores ou null:
   - "verificar_impressora"
   - "verificar_fila_impressao"
   - "limpar_fila_impressao"
   - "verificar_servico_impressao"
   - "testar_impressao"
   - "reiniciar_fila_impressao"
   - "verificar_conexao_rede"
   - null (se nenhuma automação disponível)
3. A campo "categoria" deve ser um destes: impressora, rede, vpn, acesso, software, hardware, email, outro
4. O campo "confianca" deve ser um número decimal entre 0.0 e 1.0
5. REGRA DE MAPEAMENTO: se o problema envolver internet, rede, conectividade, DNS, sites que não abrem ou falha de conexão local, use categoria "rede" e ação "verificar_conexao_rede". Não retorne null nesses casos, pois essa automação existe no sistema.

DESCRIÇÃO DO PROBLEMA:
${textoLimpo}

Responda SOMENTE com o JSON no formato exato abaixo:
{
  "categoria": "string",
  "problema": "string descrevendo o problema identificado",
  "confianca": 0.00,
  "justificativa": "string com o motivo da decisão",
  "acao": "string ou null",
  "origem": "gemini"
}`;
}

// ============================================================
// AISERVICE PRINCIPAL
// ============================================================
class AIService {
  constructor() {
    this.classificadorLocal = new ClassificadorLocal();
  }

  async diagnosticar(descricao) {
    console.log('[AI] Iniciando diagnóstico...');

    let resultado = null;

    // Tentar Gemini real primeiro
    if (geminiModel) {
      try {
        resultado = await this._diagnosticarComGemini(descricao);
        console.log('[AI] Diagnóstico via Gemini concluído. Confiança:', resultado?.confianca);
      } catch (err) {
        console.warn('[AI] Gemini falhou, usando fallback local:', err.message);
        resultado = null;
      }
    } else {
      console.log('[AI] Chave AI_API_KEY não configurada — usando classificador local.');
    }

    // Fallback: classificação local
    if (!resultado) {
      resultado = this.classificadorLocal.classificar(descricao);
      console.log('[AI] Diagnóstico via classificador local. Confiança:', resultado?.confianca);
    }

    if (!resultado) {
      return {
        categoria: 'outro',
        problema: 'Não identificado',
        confianca: 0.30,
        diagnostico: 'Não foi possível classificar automaticamente este chamado.',
        acaoSugerida: null,
        automacaoPossivel: false,
        prioridade: 'media',
        sla: 4,
        fonte: 'fallback',
        justificativa: 'Sistema sem chave de API e sem correspondência por palavras-chave.'
      };
    }

    // Determinar prioridade e SLA baseado no diagnóstico
    const prioridade = this._determinarPrioridade(resultado, descricao);
    const sla = this._determinarSLA(prioridade);

    const justificativaTexto = resultado.justificativa || resultado.diagnostico || `Classificado como "${resultado.categoria}" — Confiança: ${Math.round(resultado.confianca * 100)}% — Fonte: ${resultado.fonte || 'local'}`;
    return {
      ...resultado,
      prioridade,
      sla,
      justificativa: justificativaTexto,
      origem: resultado.origem || resultado.fonte,
      fonte: resultado.fonte || resultado.origem
    };
  }

  async _diagnosticarComGemini(descricao) {
    const prompt = buildPrompt(descricao);

    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text().trim();

    // Extrair JSON da resposta (remover markdown se presente)
    let jsonText = text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      throw new Error(`Resposta da IA não é JSON válido: ${text.substring(0, 200)}`);
    }

    // Validação rigorosa
    if (!validarRespostaIA(parsed)) {
      throw new Error('Resposta da IA não passou na validação de campos obrigatórios');
    }

    return parsed;
  }

  _determinarPrioridade(diagnostico, descricao) {
    const textoNorm = this.classificadorLocal.normalizar(descricao || '');
    const urgente = ['urgente', 'critico', 'critica', 'parado', 'producao', 'servidor', 'ninguem consegue', 'todos parados'];
    const alta = ['importante', 'bloqueado', 'nao consigo trabalhar', 'parou', 'nao funciona nada'];

    for (const u of urgente) {
      if (textoNorm.includes(u)) return 'critica';
    }
    for (const a of alta) {
      if (textoNorm.includes(a)) return 'alta';
    }

    if (diagnostico?.categoria === 'rede' && diagnostico?.problema?.includes('sem')) return 'alta';
    if (diagnostico?.categoria === 'acesso') return 'alta';
    if (diagnostico?.confianca < 0.55) return 'alta';

    return 'media';
  }

  _determinarSLA(prioridade) {
    const slaMap = { critica: 1, alta: 2, media: 4, baixa: 8 };
    return slaMap[prioridade] || 4;
  }

  // Expor normalizar para uso externo
  normalizar(texto) {
    return this.classificadorLocal.normalizar(texto);
  }
}

module.exports = new AIService();
