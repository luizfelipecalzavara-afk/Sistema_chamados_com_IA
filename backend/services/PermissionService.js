// backend/services/PermissionService.js
// Responsável por verificar se uma automação pode ser executada.
// O frontend NUNCA pode bypass estas verificações.

const pool = require('../config/database');

const CONFIDENCE_AUTO = parseFloat(process.env.AI_CONFIDENCE_AUTO) || 0.75;
const CONFIDENCE_REVIEW = parseFloat(process.env.AI_CONFIDENCE_REVIEW) || 0.50;

class PermissionService {
  /**
   * Verifica se uma automação pode ser executada automaticamente.
   * @param {string} automacaoId - ID da automação no catálogo
   * @param {number} confianca - Nível de confiança da IA (0-1)
   * @param {boolean} aprovadoManualmente - Se um técnico aprovou manualmente
   * @returns {{ permitido: boolean, requerAprovacao: boolean, requerTecnico: boolean, motivo: string }}
   */
  async verificar(automacaoId, confianca = 0, aprovadoManualmente = false) {
    // 1. Verificar se a automação existe no catálogo do banco
    const [rows] = await pool.query(
      'SELECT * FROM automacoes_catalogo WHERE id = ? AND ativo = 1',
      [automacaoId]
    );

    if (rows.length === 0) {
      console.warn(`[PERMISSION] Automação "${automacaoId}" não encontrada no catálogo.`);
      return {
        permitido: false,
        requerAprovacao: false,
        requerTecnico: false,
        automacao: null,
        motivo: `Automação "${automacaoId}" não existe ou não está ativa no sistema.`
      };
    }

    const automacao = rows[0];
    console.log(`[PERMISSION] Verificando: ${automacaoId} | Nível: ${automacao.nivel} | Confiança IA: ${confianca}`);

    // 2. Automação nível "tecnico" — nunca automático
    if (automacao.nivel === 'tecnico') {
      return {
        permitido: false,
        requerAprovacao: false,
        requerTecnico: true,
        automacao,
        motivo: `Automação "${automacao.nome}" requer intervenção de técnico (nível 🔴).`
      };
    }

    // 3. Automação nível "aprovacao" — permitir somente se aprovado manualmente
    if (automacao.nivel === 'aprovacao') {
      if (aprovadoManualmente) {
        return {
          permitido: true,
          requerAprovacao: false,
          requerTecnico: false,
          automacao,
          motivo: `Automação "${automacao.nome}" aprovada manualmente pelo técnico.`
        };
      }
      return {
        permitido: false,
        requerAprovacao: true,
        requerTecnico: false,
        automacao,
        motivo: `Automação "${automacao.nome}" requer aprovação do técnico (nível 🟡).`
      };
    }

    // 4. Automação nível "automatico"
    if (automacao.nivel === 'automatico') {
      // Verificar confiança mínima (apenas informativa, não é autorização de segurança)
      if (confianca >= CONFIDENCE_AUTO) {
        return {
          permitido: true,
          requerAprovacao: false,
          requerTecnico: false,
          automacao,
          motivo: `Automação "${automacao.nome}" autorizada. Confiança: ${Math.round(confianca * 100)}% (mínimo: ${Math.round(CONFIDENCE_AUTO * 100)}%).`
        };
      }

      if (confianca >= CONFIDENCE_REVIEW) {
        return {
          permitido: false,
          requerAprovacao: true,
          requerTecnico: false,
          automacao,
          motivo: `Confiança intermediária (${Math.round(confianca * 100)}%). Requer revisão antes da execução automática.`
        };
      }

      return {
        permitido: false,
        requerAprovacao: false,
        requerTecnico: true,
        automacao,
        motivo: `Confiança baixa (${Math.round(confianca * 100)}%). Encaminhado para análise técnica.`
      };
    }

    return {
      permitido: false,
      requerAprovacao: false,
      requerTecnico: false,
      automacao,
      motivo: 'Nível de automação desconhecido.'
    };
  }
}

module.exports = new PermissionService();
