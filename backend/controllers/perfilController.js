// backend/controllers/perfilController.js
const pool = require('../config/database');
const bcrypt = require('bcrypt');

class PerfilController {

  // ============================================================
  // OBTER DADOS DO PRÓPRIO PERFIL
  // ============================================================
  async obterPerfil(req, res) {
    try {
      const usuarioId = req.usuario.id;

      const [rows] = await pool.query(`
        SELECT id, nome, email, setor, tipo, avatar, ativo, created_at, updated_at
        FROM usuarios
        WHERE id = ?
      `, [usuarioId]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Perfil não encontrado.' });
      }

      const usuario = rows[0];

      // Estatísticas de chamados do próprio usuário
      const [stats] = await pool.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('resolvido', 'resolvido_ia') THEN 1 ELSE 0 END) as resolvidos,
          SUM(CASE WHEN status NOT IN ('resolvido', 'resolvido_ia', 'fechado') THEN 1 ELSE 0 END) as pendentes
        FROM chamados
        WHERE usuario_id = ?
      `, [usuarioId]);

      usuario.estatisticas = {
        total: stats[0].total || 0,
        resolvidos: stats[0].resolvidos || 0,
        pendentes: stats[0].pendentes || 0
      };

      res.json(usuario);
    } catch (e) {
      console.error('[PERFIL] Erro ao obter perfil:', e.message);
      res.status(500).json({ error: 'Erro ao carregar dados do perfil.', detalhes: e.message });
    }
  }

  // ============================================================
  // ATUALIZAR DADOS PERMITIDOS DO PRÓPRIO PERFIL
  // (Usuário comum NÃO pode alterar seu próprio tipo/perfil nem ativo)
  // ============================================================
  async atualizarPerfil(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { nome, setor } = req.body;

      if (!nome || !nome.trim()) {
        return res.status(400).json({ error: 'O nome completo é obrigatório.', campo: 'nome' });
      }

      if (!setor || !setor.trim()) {
        return res.status(400).json({ error: 'O setor é obrigatório.', campo: 'setor' });
      }

      // Recalcular avatar com iniciais
      const partesNome = nome.trim().split(' ').filter(Boolean);
      const novoAvatar = (partesNome.length > 1 
        ? partesNome[0][0] + partesNome[partesNome.length - 1][0] 
        : partesNome[0].substring(0, 2)).toUpperCase();

      await pool.query(`
        UPDATE usuarios
        SET nome = ?, setor = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [nome.trim(), setor.trim(), novoAvatar, usuarioId]);

      // Sincronizar na tabela tecnicos se for técnico
      if (req.usuario.tipo === 'tecnico') {
        await pool.query(`
          UPDATE tecnicos
          SET nome = ?, avatar = ?
          WHERE user_id = ?
        `, [nome.trim(), novoAvatar, usuarioId]);
      }

      const [atualizado] = await pool.query(`
        SELECT id, nome, email, setor, tipo, avatar, ativo, created_at, updated_at
        FROM usuarios
        WHERE id = ?
      `, [usuarioId]);

      res.json({
        mensagem: 'Perfil atualizado com sucesso!',
        usuario: atualizado[0]
      });
    } catch (e) {
      console.error('[PERFIL] Erro ao atualizar perfil:', e.message);
      res.status(500).json({ error: 'Erro ao atualizar dados do perfil.', detalhes: e.message });
    }
  }

  // ============================================================
  // ALTERAR PRÓPRIA SENHA COM VALIDAÇÃO DA SENHA ATUAL
  // ============================================================
  async alterarSenha(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { senhaAtual, novaSenha, confirmacaoNovaSenha } = req.body;

      if (!senhaAtual) {
        return res.status(400).json({ error: 'A senha atual é obrigatória.', campo: 'senhaAtual' });
      }

      if (!novaSenha || novaSenha.length < 6) {
        return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.', campo: 'novaSenha' });
      }

      if (confirmacaoNovaSenha && novaSenha !== confirmacaoNovaSenha) {
        return res.status(400).json({ error: 'A confirmação da nova senha não confere.', campo: 'confirmacaoNovaSenha' });
      }

      // Buscar senha atual no banco
      const [rows] = await pool.query('SELECT senha FROM usuarios WHERE id = ?', [usuarioId]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      const senhaValida = await bcrypt.compare(senhaAtual, rows[0].senha);
      if (!senhaValida) {
        return res.status(400).json({ error: 'A senha atual informada está incorreta.', campo: 'senhaAtual' });
      }

      // Hash seguro da nova senha
      const novoHash = await bcrypt.hash(novaSenha, 10);

      await pool.query(`
        UPDATE usuarios
        SET senha = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [novoHash, usuarioId]);

      res.json({
        mensagem: 'Senha alterada com sucesso!'
      });
    } catch (e) {
      console.error('[PERFIL] Erro ao alterar senha:', e.message);
      res.status(500).json({ error: 'Erro ao alterar a senha.', detalhes: e.message });
    }
  }
}

module.exports = new PerfilController();
