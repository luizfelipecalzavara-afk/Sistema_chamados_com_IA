// backend/controllers/chamadoController.js

const ChamadoService = require('../services/ChamadoService');
const OrquestradorService = require('../services/OrquestradorService');
const pool = require('../config/database');

class ChamadoController {

  // ============================================================
  // CHAMADOS
  // ============================================================

  async listar(req, res) {
    try {
      let filtroUsuario = null;
      // Se autenticado como usuário comum, só visualiza os próprios chamados
      if (req.usuario && req.usuario.tipo === 'usuario') {
        filtroUsuario = req.usuario.id;
      } else if (req.query.usuario_id) {
        filtroUsuario = req.query.usuario_id;
      }

      const chamados = await ChamadoService.getChamados(filtroUsuario);
      res.json(chamados);
    } catch (e) {
      console.error('[CONTROLLER] Erro ao listar chamados:', e.message);
      res.status(500).json({ error: 'Erro ao listar chamados', detalhes: e.message });
    }
  }

  async buscar(req, res) {
    try {
      const chamado = await ChamadoService.getChamadoById(req.params.id);
      if (!chamado) return res.status(404).json({ error: `Chamado #${req.params.id} não encontrado` });

      // Se for usuário comum, impedir visualização de chamados de outros usuários
      if (req.usuario && req.usuario.tipo === 'usuario' && chamado.usuario_id !== req.usuario.id) {
        return res.status(403).json({ error: 'Acesso negado. Você só tem permissão para visualizar seus próprios chamados.' });
      }

      res.json(chamado);
    } catch (e) {
      console.error('[CONTROLLER] Erro ao buscar chamado:', e.message);
      res.status(500).json({ error: 'Erro ao buscar chamado', detalhes: e.message });
    }
  }

  async criar(req, res) {
    try {
      let { titulo, descricao, usuario_id, categoria, prioridade } = req.body;

      // Validação de campos
      if (!titulo || !titulo.trim()) {
        return res.status(400).json({ error: 'Campo "titulo" é obrigatório.' });
      }
      if (!descricao || !descricao.trim()) {
        return res.status(400).json({ error: 'Campo "descricao" é obrigatório.' });
      }

      // Se autenticado, forçar o usuário associado para evitar impersonação
      if (req.usuario && req.usuario.tipo === 'usuario') {
        usuario_id = req.usuario.id;
      } else if (!usuario_id && req.usuario) {
        usuario_id = req.usuario.id;
      }

      if (!usuario_id) {
        return res.status(400).json({ error: 'Campo "usuario_id" é obrigatório.' });
      }

      const chamado = await ChamadoService.criarChamado({
        usuario_id: usuario_id.trim(),
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        categoria: categoria && categoria.trim() && categoria !== 'auto' ? categoria.trim() : null,
        prioridade: prioridade && prioridade.trim() && prioridade !== 'auto' ? prioridade.trim() : null
      });

      // Processamento assíncrono pela IA (não bloqueia a resposta)
      setTimeout(async () => {
        try {
          await OrquestradorService.processarNovoChamado(chamado.id);
        } catch (err) {
          console.error(`[CONTROLLER] Erro no orquestrador para chamado ${chamado.id}:`, err.message);
        }
      }, 300);

      res.status(201).json(chamado);
    } catch (e) {
      console.error('[CONTROLLER] Erro ao criar chamado:', e.message, '\nStack:', e.stack);
      
      if (e.code === 'ER_NO_REFERENCED_ROW_2' || e.message.includes('não encontrado')) {
        return res.status(400).json({ error: `Usuário não encontrado. Verifique o ID informado. (${e.message})` });
      }
      if (e.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Chamado duplicado.' });
      }

      res.status(500).json({ error: 'Erro interno ao criar chamado.', detalhes: e.message });
    }
  }

  async atualizar(req, res) {
    try {
      const chamado = await ChamadoService.atualizarChamado(req.params.id, req.body);
      res.json(chamado);
    } catch (e) {
      console.error('[CONTROLLER] Erro ao atualizar chamado:', e.message);
      res.status(500).json({ error: 'Erro ao atualizar chamado', detalhes: e.message });
    }
  }

  // ============================================================
  // AÇÕES DO FLUXO
  // ============================================================

  async aprovar(req, res) {
    try {
      if (req.usuario && req.usuario.tipo === 'usuario') {
        return res.status(403).json({ error: 'Acesso negado. Apenas técnicos e administradores podem aprovar automações.' });
      }

      const { id } = req.params;
      const chamado = await ChamadoService.getChamadoById(id);

      if (!chamado) return res.status(404).json({ error: 'Chamado não encontrado' });
      if (chamado.status !== 'aguardando_aprovacao') {
        return res.status(400).json({ error: `Chamado não está aguardando aprovação (status atual: ${chamado.status})` });
      }

      // Execução assíncrona após aprovação
      setTimeout(async () => {
        try {
          await OrquestradorService.executarAposAprovacao(parseInt(id));
        } catch (err) {
          console.error(`[CONTROLLER] Erro ao executar pós-aprovação para chamado ${id}:`, err.message);
        }
      }, 300);

      res.json({ message: 'Aprovação registrada. Executando automação...' });
    } catch (e) {
      console.error('[CONTROLLER] Erro ao aprovar:', e.message);
      res.status(500).json({ error: 'Erro ao aprovar automação', detalhes: e.message });
    }
  }

  async resolver(req, res) {
    try {
      if (req.usuario && req.usuario.tipo === 'usuario') {
        return res.status(403).json({ error: 'Acesso negado. Apenas técnicos e administradores podem resolver chamados.' });
      }

      const { id } = req.params;
      const { mensagem, tecnico_id } = req.body;
      const tecId = (req.usuario && req.usuario.id) ? req.usuario.id : (tecnico_id || 'tecnico');
      const tecNome = (req.usuario && req.usuario.nome) ? req.usuario.nome : 'Técnico';

      await ChamadoService.adicionarHistorico(
        id,
        'resolucao_manual',
        `Resolvido manualmente por ${tecNome}. ${mensagem || ''}`.trim(),
        tecId
      );
      await ChamadoService.atualizarChamado(id, { status: 'resolvido', resolvido_em: new Date() });

      const chamado = await ChamadoService.getChamadoById(id);
      res.json({ message: 'Chamado resolvido', chamado });
    } catch (e) {
      console.error('[CONTROLLER] Erro ao resolver chamado:', e.message);
      res.status(500).json({ error: 'Erro ao resolver chamado', detalhes: e.message });
    }
  }

  async reabrir(req, res) {
    try {
      const { id } = req.params;
      const chamado = await ChamadoService.getChamadoById(id);
      if (!chamado) return res.status(404).json({ error: 'Chamado não encontrado' });

      // Se for usuário comum, só pode reabrir seu próprio chamado
      if (req.usuario && req.usuario.tipo === 'usuario' && chamado.usuario_id !== req.usuario.id) {
        return res.status(403).json({ error: 'Acesso negado. Você só pode reabrir seus próprios chamados.' });
      }

      const autorNome = req.usuario ? req.usuario.nome : 'Usuário';
      const autorId = req.usuario ? req.usuario.id : 'usuario';

      await ChamadoService.adicionarHistorico(id, 'reabertura', `Chamado reaberto por ${autorNome}.`, autorId);
      await ChamadoService.atualizarChamado(id, {
        status: 'aberto',
        resolvido_em: null,
        reaberto_em: new Date()
      });

      const chamadoAtualizado = await ChamadoService.getChamadoById(id);
      res.json({ message: 'Chamado reaberto', chamado: chamadoAtualizado });
    } catch (e) {
      console.error('[CONTROLLER] Erro ao reabrir chamado:', e.message);
      res.status(500).json({ error: 'Erro ao reabrir chamado', detalhes: e.message });
    }
  }

  async atribuir(req, res) {
    try {
      if (req.usuario && req.usuario.tipo === 'usuario') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores e técnicos podem atribuir chamados.' });
      }

      const { id } = req.params;
      const { tecnico_id } = req.body;

      if (!tecnico_id) return res.status(400).json({ error: 'tecnico_id é obrigatório' });

      let [tecRows] = await pool.query('SELECT * FROM tecnicos WHERE id = ? OR user_id = ?', [tecnico_id, tecnico_id]);
      let tec = tecRows[0];
      if (!tec) {
        const [userRows] = await pool.query('SELECT * FROM usuarios WHERE id = ? AND tipo IN ("tecnico", "administrador")', [tecnico_id]);
        if (userRows.length > 0) {
          const u = userRows[0];
          const newTecId = 't_' + u.id;
          await pool.query(
            'INSERT INTO tecnicos (id, user_id, nome, especialidade, avatar, ativo) VALUES (?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE nome = VALUES(nome)',
            [newTecId, u.id, u.nome, u.setor || 'Suporte TI', u.avatar || u.nome.substring(0, 2).toUpperCase()]
          );
          tec = { id: newTecId, nome: u.nome };
        } else {
          return res.status(404).json({ error: `Técnico "${tecnico_id}" não encontrado` });
        }
      }
      await ChamadoService.atualizarChamado(id, { tecnico_id: tec.id, status: 'em_atendimento' });
      await ChamadoService.adicionarHistorico(
        id,
        'tecnico_atribuido',
        `Técnico ${tec.nome} atribuído ao chamado.`,
        tec.id
      );

      const chamado = await ChamadoService.getChamadoById(id);
      res.json({ message: 'Técnico atribuído', chamado });
    } catch (e) {
      console.error('[CONTROLLER] Erro ao atribuir técnico:', e.message);
      res.status(500).json({ error: 'Erro ao atribuir técnico', detalhes: e.message });
    }
  }

  // ============================================================
  // RESPOSTAS
  // ============================================================

  async listarRespostas(req, res) {
    try {
      const chamado = await ChamadoService.getChamadoById(req.params.id);
      if (!chamado) return res.status(404).json({ error: 'Chamado não encontrado' });

      if (req.usuario && req.usuario.tipo === 'usuario' && chamado.usuario_id !== req.usuario.id) {
        return res.status(403).json({ error: 'Acesso negado.' });
      }

      const respostas = await ChamadoService.getRespostas(req.params.id);
      res.json(respostas);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao listar respostas', detalhes: e.message });
    }
  }

  async adicionarResposta(req, res) {
    try {
      const { id } = req.params;
      const chamado = await ChamadoService.getChamadoById(id);
      if (!chamado) return res.status(404).json({ error: 'Chamado não encontrado' });

      if (req.usuario && req.usuario.tipo === 'usuario' && chamado.usuario_id !== req.usuario.id) {
        return res.status(403).json({ error: 'Acesso negado. Você só pode responder aos seus próprios chamados.' });
      }

      const { mensagem } = req.body;
      if (!mensagem || !mensagem.trim()) {
        return res.status(400).json({ error: 'Mensagem é obrigatória' });
      }

      const autor_id = req.usuario ? req.usuario.id : (req.body.autor_id || 'usuario');
      const autor_nome = req.usuario ? req.usuario.nome : (req.body.autor_nome || 'Usuário');

      const resposta = await ChamadoService.adicionarResposta(
        id,
        autor_id,
        autor_nome,
        mensagem.trim()
      );

      await ChamadoService.adicionarHistorico(
        id,
        'comentario',
        `${autor_nome}: ${mensagem.trim()}`,
        autor_id
      );

      res.status(201).json(resposta);
    } catch (e) {
      console.error('[CONTROLLER] Erro ao adicionar resposta:', e.message);
      res.status(500).json({ error: 'Erro ao adicionar resposta', detalhes: e.message });
    }
  }

  // ============================================================
  // HISTÓRICO
  // ============================================================

  async listarHistorico(req, res) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM historico_eventos WHERE chamado_id = ? ORDER BY timestamp ASC',
        [req.params.id]
      );
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao listar histórico', detalhes: e.message });
    }
  }

  // ============================================================
  // DADOS AUXILIARES
  // ============================================================

  async listarUsuarios(req, res) {
    try {
      const [rows] = await pool.query('SELECT * FROM usuarios WHERE ativo = 1 ORDER BY nome');
      res.json(rows);
    } catch (e) {
      console.error('[CONTROLLER] Erro ao listar usuários:', e.message);
      res.status(500).json({ error: 'Erro ao listar usuários', detalhes: e.message });
    }
  }

  async listarTecnicos(req, res) {
    try {
      const [rows] = await pool.query('SELECT * FROM tecnicos WHERE ativo = 1 ORDER BY nome');
      res.json(rows);
    } catch (e) {
      console.error('[CONTROLLER] Erro ao listar técnicos:', e.message);
      res.status(500).json({ error: 'Erro ao listar técnicos', detalhes: e.message });
    }
  }

  async listarCategorias(req, res) {
    try {
      const [rows] = await pool.query('SELECT * FROM categorias WHERE ativo = 1 ORDER BY nome');
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao listar categorias', detalhes: e.message });
    }
  }

  async listarSetores(req, res) {
    try {
      const [rows] = await pool.query('SELECT * FROM setores WHERE ativo = 1 ORDER BY nome');
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao listar setores', detalhes: e.message });
    }
  }

  async listarPrioridades(req, res) {
    try {
      const [rows] = await pool.query('SELECT * FROM prioridades WHERE ativo = 1 ORDER BY sla_horas DESC');
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao listar prioridades', detalhes: e.message });
    }
  }

  async listarAutomacoes(req, res) {
    try {
      const [rows] = await pool.query('SELECT * FROM automacoes_catalogo WHERE ativo = 1 ORDER BY nivel, nome');
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao listar automações', detalhes: e.message });
    }
  }

  async listarMetricas(req, res) {
    try {
      let whereClause = '';
      const params = [];
      if (req.usuario && req.usuario.tipo === 'usuario') {
        whereClause = ' WHERE usuario_id = ?';
        params.push(req.usuario.id);
      }

      const [total] = await pool.query(`SELECT COUNT(*) as count FROM chamados${whereClause}`, params);
      const [abertos] = await pool.query(`SELECT COUNT(*) as count FROM chamados WHERE status = 'aberto'${whereClause ? ' AND usuario_id = ?' : ''}`, params);
      const [emAnalise] = await pool.query(`SELECT COUNT(*) as count FROM chamados WHERE status = 'em_analise'${whereClause ? ' AND usuario_id = ?' : ''}`, params);
      const [emDiagnostico] = await pool.query(`SELECT COUNT(*) as count FROM chamados WHERE status = 'em_diagnostico'${whereClause ? ' AND usuario_id = ?' : ''}`, params);
      const [emAtendimento] = await pool.query(`SELECT COUNT(*) as count FROM chamados WHERE status IN ('em_atendimento','tecnico_necessario','automacao','verificacao','em_andamento')${whereClause ? ' AND usuario_id = ?' : ''}`, params);
      const [resolvidosIA] = await pool.query(`SELECT COUNT(*) as count FROM chamados WHERE status = 'resolvido_ia'${whereClause ? ' AND usuario_id = ?' : ''}`, params);
      const [resolvidos] = await pool.query(`SELECT COUNT(*) as count FROM chamados WHERE status = 'resolvido'${whereClause ? ' AND usuario_id = ?' : ''}`, params);
      const [aguardando] = await pool.query(`SELECT COUNT(*) as count FROM chamados WHERE status = 'aguardando_aprovacao'${whereClause ? ' AND usuario_id = ?' : ''}`, params);
      const [criticos] = await pool.query(`SELECT COUNT(*) as count FROM chamados WHERE prioridade = 'critica' AND status NOT IN ('resolvido','resolvido_ia')${whereClause ? ' AND usuario_id = ?' : ''}`, params);

      // Distribuição real por prioridade calculada do banco
      const [prioRows] = await pool.query(
        `SELECT LOWER(COALESCE(prioridade, 'media')) as prioridade, COUNT(*) as count FROM chamados ${whereClause} GROUP BY prioridade`,
        params
      );
      const porPrioridade = { critica: 0, alta: 0, media: 0, baixa: 0 };
      prioRows.forEach(r => {
        if (r.prioridade && porPrioridade.hasOwnProperty(r.prioridade)) {
          porPrioridade[r.prioridade] = r.count;
        }
      });

      // Distribuição real por status calculada do banco
      const [statusRows] = await pool.query(
        `SELECT status, COUNT(*) as count FROM chamados ${whereClause} GROUP BY status`,
        params
      );
      const porStatus = {};
      statusRows.forEach(r => {
        if (r.status) porStatus[r.status] = r.count;
      });

      const totalCount = total[0].count;
      const totalResolvidos = resolvidosIA[0].count + resolvidos[0].count;

      res.json({
        total: totalCount,
        abertos: abertos[0].count,
        emAnalise: emAnalise[0].count,
        emDiagnostico: emDiagnostico[0].count,
        emAtendimento: emAtendimento[0].count,
        resolvidosIA: resolvidosIA[0].count,
        resolvidos: resolvidos[0].count,
        totalResolvidos,
        aguardandoAprovacao: aguardando[0].count,
        criticos: criticos[0].count,
        taxaResolucaoIA: totalCount > 0 ? Math.round((resolvidosIA[0].count / totalCount) * 100) : 0,
        pendentes: abertos[0].count + emAnalise[0].count + emDiagnostico[0].count + emAtendimento[0].count + aguardando[0].count,
        porPrioridade,
        porStatus
      });
    } catch (e) {
      console.error('[CONTROLLER] Erro ao obter métricas:', e.message);
      res.status(500).json({ error: 'Erro ao obter métricas', detalhes: e.message });
    }
  }

  async diagnosticar(req, res) {
    try {
      const { id } = req.params;
      const chamado = await ChamadoService.getChamadoById(id);
      if (!chamado) return res.status(404).json({ error: 'Chamado não encontrado' });

      if (req.usuario && req.usuario.tipo === 'usuario' && chamado.usuario_id !== req.usuario.id) {
        return res.status(403).json({ error: 'Acesso negado.' });
      }

      // Executar diagnóstico assíncrono
      OrquestradorService.processarNovoChamado(parseInt(id)).catch(err => {
        console.error(`[CONTROLLER] Erro no reprocessamento do chamado ${id}:`, err);
      });

      res.json({ message: 'Diagnóstico iniciado com sucesso.' });
    } catch (e) {
      res.status(500).json({ error: 'Erro ao executar diagnóstico', detalhes: e.message });
    }
  }
  // Exclusão permanente de chamado de teste — SOMENTE ADMINISTRADOR (rota protegida).
  async excluir(req, res) {
    try {
      const { id } = req.params;
      const chamado = await ChamadoService.getChamadoById(id);
      if (!chamado) return res.status(404).json({ error: 'Chamado não encontrado.' });
      const [result] = await pool.query('DELETE FROM chamados WHERE id = ?', [id]);
      if (!result.affectedRows) return res.status(404).json({ error: 'Chamado não encontrado.' });
      console.log(`[ADMIN] Chamado ${chamado.numero || id} excluído por ${req.usuario?.email || req.usuario?.id || 'administrador'}.`);
      return res.json({ mensagem: `Chamado ${chamado.numero || '#'+id} excluído com sucesso.` });
    } catch (e) {
      console.error('[ADMIN] Erro ao excluir chamado:', e.message);
      return res.status(500).json({ error: 'Erro ao excluir chamado.', detalhes: e.message });
    }
  }

}

module.exports = new ChamadoController();
