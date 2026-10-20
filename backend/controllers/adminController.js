// backend/controllers/adminController.js
const pool = require('../config/database');
const bcrypt = require('bcrypt');

class AdminController {

  // ============================================================
  // MÉTRICAS DE USUÁRIOS
  // ============================================================
  async metricas(req, res) {
    try {
      const [totalRows] = await pool.query('SELECT COUNT(*) as count FROM usuarios');
      const [ativosRows] = await pool.query('SELECT COUNT(*) as count FROM usuarios WHERE ativo = 1');
      const [inativosRows] = await pool.query('SELECT COUNT(*) as count FROM usuarios WHERE ativo = 0');
      const [adminsRows] = await pool.query('SELECT COUNT(*) as count FROM usuarios WHERE tipo = "administrador"');
      const [tecnicosRows] = await pool.query('SELECT COUNT(*) as count FROM usuarios WHERE tipo = "tecnico"');
      const [comunsRows] = await pool.query('SELECT COUNT(*) as count FROM usuarios WHERE tipo = "usuario"');

      res.json({
        total: totalRows[0].count,
        ativos: ativosRows[0].count,
        inativos: inativosRows[0].count,
        administradores: adminsRows[0].count,
        tecnicos: tecnicosRows[0].count,
        usuariosComuns: comunsRows[0].count
      });
    } catch (e) {
      console.error('[ADMIN] Erro ao obter métricas de usuários:', e.message);
      res.status(500).json({ error: 'Erro ao carregar métricas de usuários.', detalhes: e.message });
    }
  }

  // ============================================================
  // LISTAR USUÁRIOS COM FILTROS
  // ============================================================
  async listarUsuarios(req, res) {
    try {
      const { busca, setor, tipo, ativo } = req.query;

      let sql = `
        SELECT 
          u.id, 
          u.nome, 
          u.email, 
          u.setor, 
          u.tipo, 
          u.avatar, 
          u.ativo, 
          u.created_at, 
          u.updated_at,
          COALESCE(c.total_chamados, 0) as total_chamados
        FROM usuarios u
        LEFT JOIN (
          SELECT usuario_id, COUNT(*) as total_chamados 
          FROM chamados 
          GROUP BY usuario_id
        ) c ON c.usuario_id = u.id
        WHERE 1 = 1
      `;
      const params = [];

      // Filtro de busca (nome ou email)
      if (busca && busca.trim()) {
        sql += ` AND (u.nome LIKE ? OR u.email LIKE ?)`;
        const termo = `%${busca.trim()}%`;
        params.push(termo, termo);
      }

      // Filtro de setor
      if (setor && setor.trim()) {
        sql += ` AND u.setor = ?`;
        params.push(setor.trim());
      }

      // Filtro de tipo/perfil
      if (tipo && tipo.trim()) {
        sql += ` AND u.tipo = ?`;
        params.push(tipo.trim());
      }

      // Filtro de situação (ativo/inativo)
      if (ativo !== undefined && ativo !== null && ativo !== '' && ativo !== 'todos') {
        const ativoVal = (ativo === '1' || ativo === 'true' || ativo === 1) ? 1 : 0;
        sql += ` AND u.ativo = ?`;
        params.push(ativoVal);
      }

      sql += ` ORDER BY u.created_at DESC, u.nome ASC`;

      const [rows] = await pool.query(sql, params);
      res.json(rows);
    } catch (e) {
      console.error('[ADMIN] Erro ao listar usuários:', e.message);
      res.status(500).json({ error: 'Erro ao listar usuários.', detalhes: e.message });
    }
  }

  // ============================================================
  // CONSULTAR USUÁRIO POR ID COM RESUMO DE ATIVIDADES
  // ============================================================
  async obterUsuario(req, res) {
    try {
      const { id } = req.params;

      const [rows] = await pool.query(`
        SELECT id, nome, email, setor, tipo, avatar, ativo, created_at, updated_at
        FROM usuarios
        WHERE id = ?
      `, [id]);

      if (rows.length === 0) {
        return res.status(404).json({ error: `Usuário com ID ${id} não encontrado.` });
      }

      const usuario = rows[0];

      // Estatísticas de chamados do usuário
      const [chamadosStats] = await pool.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('resolvido', 'resolvido_ia') THEN 1 ELSE 0 END) as resolvidos,
          SUM(CASE WHEN status NOT IN ('resolvido', 'resolvido_ia', 'fechado') THEN 1 ELSE 0 END) as abertos
        FROM chamados
        WHERE usuario_id = ?
      `, [id]);

      // Últimos chamados abertos
      const [ultimosChamados] = await pool.query(`
        SELECT id, numero, titulo, status, prioridade, criado_em
        FROM chamados
        WHERE usuario_id = ?
        ORDER BY id DESC
        LIMIT 5
      `, [id]);

      usuario.estatisticas = {
        totalChamados: chamadosStats[0].total || 0,
        resolvidos: chamadosStats[0].resolvidos || 0,
        abertos: chamadosStats[0].abertos || 0
      };
      usuario.ultimosChamados = ultimosChamados;

      res.json(usuario);
    } catch (e) {
      console.error('[ADMIN] Erro ao obter usuário:', e.message);
      res.status(500).json({ error: 'Erro ao buscar dados do usuário.', detalhes: e.message });
    }
  }

  // ============================================================
  // CADASTRAR NOVO USUÁRIO (ADMIN)
  // ============================================================
  async criarUsuario(req, res) {
    try {
      const { nome, email, senha, confirmacaoSenha, setor, tipo, ativo } = req.body;

      // Validações básicas de campos
      if (!nome || !nome.trim()) {
        return res.status(400).json({ error: 'O nome completo é obrigatório.', campo: 'nome' });
      }
      if (!email || !email.trim()) {
        return res.status(400).json({ error: 'O e-mail é obrigatório.', campo: 'email' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: 'Formato de e-mail inválido.', campo: 'email' });
      }

      if (!senha || senha.length < 6) {
        return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.', campo: 'senha' });
      }

      if (confirmacaoSenha && senha !== confirmacaoSenha) {
        return res.status(400).json({ error: 'A confirmação de senha não confere.', campo: 'confirmacaoSenha' });
      }

      if (!setor || !setor.trim()) {
        return res.status(400).json({ error: 'O setor é obrigatório.', campo: 'setor' });
      }

      const tiposValidos = ['usuario', 'tecnico', 'administrador'];
      const perfilFinal = tiposValidos.includes(tipo) ? tipo : 'usuario';
      const situacaoFinal = (ativo === 0 || ativo === false || ativo === '0') ? 0 : 1;

      // Verificar se e-mail já existe
      const [existente] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email.trim().toLowerCase()]);
      if (existente.length > 0) {
        return res.status(400).json({ error: 'Este e-mail já está cadastrado por outro usuário.', campo: 'email' });
      }

      // Gerar ID único e Hash seguro da senha com Bcrypt
      const id = 'u_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      const hash = await bcrypt.hash(senha, 10);

      // Gerar avatar com iniciais
      const partesNome = nome.trim().split(' ').filter(Boolean);
      const avatar = (partesNome.length > 1 
        ? partesNome[0][0] + partesNome[partesNome.length - 1][0] 
        : partesNome[0].substring(0, 2)).toUpperCase();

      await pool.query(`
        INSERT INTO usuarios (id, nome, email, senha, setor, tipo, avatar, ativo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, nome.trim(), email.trim().toLowerCase(), hash, setor.trim(), perfilFinal, avatar, situacaoFinal]);

      // Se for técnico, garantir registro na tabela tecnicos para atribuição de chamados
      if (perfilFinal === 'tecnico') {
        const [tecnicoExistente] = await pool.query('SELECT id FROM tecnicos WHERE user_id = ?', [id]);
        if (tecnicoExistente.length === 0) {
          const tecId = 't_' + id.replace('u_', '');
          await pool.query(`
            INSERT INTO tecnicos (id, user_id, nome, especialidade, avatar, ativo)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [tecId, id, nome.trim(), setor.trim(), avatar, situacaoFinal]);
        }
      }

      const [novoUsuario] = await pool.query(
        'SELECT id, nome, email, setor, tipo, avatar, ativo, created_at FROM usuarios WHERE id = ?',
        [id]
      );

      res.status(201).json({
        mensagem: 'Usuário cadastrado com sucesso!',
        usuario: novoUsuario[0]
      });
    } catch (e) {
      console.error('[ADMIN] Erro ao cadastrar usuário:', e.message);
      res.status(500).json({ error: 'Erro ao cadastrar usuário.', detalhes: e.message });
    }
  }

  // ============================================================
  // EDITAR USUÁRIO (ADMIN)
  // ============================================================
  async atualizarUsuario(req, res) {
    try {
      const { id } = req.params;
      const { nome, email, setor, tipo, ativo } = req.body;

      // Buscar usuário atual
      const [rows] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: `Usuário ${id} não encontrado.` });
      }
      const usuarioAtual = rows[0];

      // Validações
      if (nome !== undefined && !nome.trim()) {
        return res.status(400).json({ error: 'O nome não pode ficar em branco.', campo: 'nome' });
      }

      if (email !== undefined) {
        if (!email.trim()) {
          return res.status(400).json({ error: 'O e-mail não pode ficar em branco.', campo: 'email' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          return res.status(400).json({ error: 'Formato de e-mail inválido.', campo: 'email' });
        }

        // Verificar duplicidade com outro usuário
        const [duplicados] = await pool.query(
          'SELECT id FROM usuarios WHERE email = ? AND id != ?',
          [email.trim().toLowerCase(), id]
        );
        if (duplicados.length > 0) {
          return res.status(400).json({ error: 'Este e-mail já pertence a outro usuário.', campo: 'email' });
        }
      }

      const novoNome = nome !== undefined ? nome.trim() : usuarioAtual.nome;
      const novoEmail = email !== undefined ? email.trim().toLowerCase() : usuarioAtual.email;
      const novoSetor = setor !== undefined ? setor.trim() : usuarioAtual.setor;

      const tiposValidos = ['usuario', 'tecnico', 'administrador'];
      const novoTipo = (tipo && tiposValidos.includes(tipo)) ? tipo : usuarioAtual.tipo;

      const novoAtivo = ativo !== undefined 
        ? ((ativo === 1 || ativo === true || ativo === '1') ? 1 : 0) 
        : usuarioAtual.ativo;

      // ────────────────────────────────────────────────────────────
      // REGRA DE PROTEÇÃO: ÚLTIMO ADMINISTRADOR ATIVO
      // ────────────────────────────────────────────────────────────
      if (usuarioAtual.tipo === 'administrador' && usuarioAtual.ativo === 1) {
        const rebaixando = novoTipo !== 'administrador';
        const desativando = novoAtivo === 0;

        if (rebaixando || desativando) {
          const [outrosAdmins] = await pool.query(`
            SELECT COUNT(*) as count 
            FROM usuarios 
            WHERE tipo = 'administrador' AND ativo = 1 AND id != ?
          `, [id]);

          if (outrosAdmins[0].count === 0) {
            return res.status(400).json({
              error: 'Operação bloqueada: Não é permitido desativar ou rebaixar o único administrador ativo do sistema.'
            });
          }
        }
      }

      // Senhas de terceiros não são alteradas pela edição administrativa.
      // Use o fluxo de redefinição por e-mail.

      // Recalcular avatar
      const partesNome = novoNome.split(' ').filter(Boolean);
      const novoAvatar = (partesNome.length > 1 
        ? partesNome[0][0] + partesNome[partesNome.length - 1][0] 
        : partesNome[0].substring(0, 2)).toUpperCase();

      await pool.query(`
        UPDATE usuarios 
        SET nome = ?, email = ?, setor = ?, tipo = ?, ativo = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [novoNome, novoEmail, novoSetor, novoTipo, novoAtivo, novoAvatar, id]);

      // Atualizar também na tabela tecnicos se houver vínculo
      if (novoTipo === 'tecnico') {
        const [tec] = await pool.query('SELECT id FROM tecnicos WHERE user_id = ?', [id]);
        if (tec.length > 0) {
          await pool.query(`
            UPDATE tecnicos 
            SET nome = ?, especialidade = ?, avatar = ?, ativo = ? 
            WHERE user_id = ?
          `, [novoNome, novoSetor, novoAvatar, novoAtivo, id]);
        } else {
          const tecId = 't_' + id.replace('u_', '');
          await pool.query(`
            INSERT INTO tecnicos (id, user_id, nome, especialidade, avatar, ativo)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [tecId, id, novoNome, novoSetor, novoAvatar, novoAtivo]);
        }
      } else {
        // Se deixou de ser técnico, desativar na tabela de técnicos
        await pool.query('UPDATE tecnicos SET ativo = 0 WHERE user_id = ?', [id]);
      }

      const [atualizado] = await pool.query(
        'SELECT id, nome, email, setor, tipo, avatar, ativo, created_at, updated_at FROM usuarios WHERE id = ?',
        [id]
      );

      res.json({
        mensagem: 'Usuário atualizado com sucesso!',
        usuario: atualizado[0]
      });
    } catch (e) {
      console.error('[ADMIN] Erro ao atualizar usuário:', e.message);
      res.status(500).json({ error: 'Erro ao atualizar dados do usuário.', detalhes: e.message });
    }
  }

  // ============================================================
  // ATIVAR / DESATIVAR CONTA (ADMIN)
  // ============================================================
  async alterarStatus(req, res) {
    try {
      const { id } = req.params;
      const { ativo } = req.body;

      const [rows] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: `Usuário ${id} não encontrado.` });
      }
      const usuario = rows[0];

      // Determinar novo status
      const novoStatus = (ativo !== undefined) 
        ? ((ativo === 1 || ativo === true || ativo === '1') ? 1 : 0)
        : (usuario.ativo === 1 ? 0 : 1);

      // Proteção do último admin ativo
      if (usuario.tipo === 'administrador' && usuario.ativo === 1 && novoStatus === 0) {
        const [outrosAdmins] = await pool.query(`
          SELECT COUNT(*) as count 
          FROM usuarios 
          WHERE tipo = 'administrador' AND ativo = 1 AND id != ?
        `, [id]);

        if (outrosAdmins[0].count === 0) {
          return res.status(400).json({
            error: 'Operação bloqueada: Não é permitido desativar o único administrador ativo do sistema.'
          });
        }
      }

      await pool.query('UPDATE usuarios SET ativo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [novoStatus, id]);

      // Sincronizar status em tecnicos se aplicável
      await pool.query('UPDATE tecnicos SET ativo = ? WHERE user_id = ?', [novoStatus, id]);

      res.json({
        mensagem: novoStatus === 1 ? 'Conta ativada com sucesso!' : 'Conta desativada com sucesso!',
        id,
        ativo: novoStatus
      });
    } catch (e) {
      console.error('[ADMIN] Erro ao alterar status do usuário:', e.message);
      res.status(500).json({ error: 'Erro ao alterar situação da conta.', detalhes: e.message });
    }
  }

  // ============================================================
  // EXCLUIR USUÁRIO (TRATAMENTO SEGURO / EXCLUSÃO LÓGICA)
  // ============================================================
  async excluirUsuario(req, res) {
    try {
      const { id } = req.params;

      const [rows] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: `Usuário ${id} não encontrado.` });
      }
      const usuario = rows[0];

      // ────────────────────────────────────────────────────────────
      // 1. REGRA DE PROTEÇÃO: ÚLTIMO ADMINISTRADOR ATIVO
      // ────────────────────────────────────────────────────────────
      if (usuario.tipo === 'administrador' && usuario.ativo === 1) {
        const [outrosAdmins] = await pool.query(`
          SELECT COUNT(*) as count 
          FROM usuarios 
          WHERE tipo = 'administrador' AND ativo = 1 AND id != ?
        `, [id]);

        if (outrosAdmins[0].count === 0) {
          return res.status(400).json({
            error: 'Operação bloqueada: Não é permitido excluir o único administrador ativo do sistema.'
          });
        }
      }

      // ────────────────────────────────────────────────────────────
      // 2. VERIFICAÇÃO DE REGISTROS VINCULADOS (AUDITORIA E INTEGRIDADE)
      // ────────────────────────────────────────────────────────────
      const [chamadosRows] = await pool.query('SELECT COUNT(*) as count FROM chamados WHERE usuario_id = ?', [id]);
      const [respostasRows] = await pool.query('SELECT COUNT(*) as count FROM respostas WHERE autor_id = ?', [id]);
      const [tecnicosComChamados] = await pool.query(`
        SELECT COUNT(*) as count FROM chamados 
        WHERE tecnico_id IN (SELECT id FROM tecnicos WHERE user_id = ?)
      `, [id]);

      const qtdChamados = chamadosRows[0].count;
      const qtdRespostas = respostasRows[0].count;
      const qtdAtribuidos = tecnicosComChamados[0].count;
      const totalVinculos = qtdChamados + qtdRespostas + qtdAtribuidos;

      if (totalVinculos > 0) {
        // Exclusão física comprometeria histórico, foreign keys e auditoria.
        // Realizar exclusão lógica (desativação segura da conta).
        await pool.query('UPDATE usuarios SET ativo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
        await pool.query('UPDATE tecnicos SET ativo = 0 WHERE user_id = ?', [id]);

        return res.status(200).json({
          excluidoFisicamente: false,
          desativado: true,
          motivo: 'vinculos_existentes',
          mensagem: `O usuário possui ${qtdChamados} chamado(s) como solicitante, ${qtdAtribuidos} chamado(s) como técnico e ${qtdRespostas} resposta(s) vinculados. Para preservar a integridade dos relacionamentos e o histórico de auditoria, a conta foi desativada (exclusão lógica).`,
          detalhes: { qtdChamados, qtdRespostas, qtdAtribuidos }
        });
      }

      // Se não possui nenhum vínculo, realizar exclusão física com segurança
      await pool.query('DELETE FROM tecnicos WHERE user_id = ?', [id]);
      await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);

      res.status(200).json({
        excluidoFisicamente: true,
        desativado: false,
        mensagem: 'Usuário excluído definitivamente com sucesso.'
      });
    } catch (e) {
      console.error('[ADMIN] Erro ao excluir usuário:', e.message);
      res.status(500).json({ error: 'Erro ao excluir usuário.', detalhes: e.message });
    }
  }
}

module.exports = new AdminController();
