const crypto = require('crypto');
const bcrypt = require('bcrypt');
const pool = require('../config/database');
const EmailService = require('../services/EmailService');

function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
async function criarToken(usuario) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expira = new Date(Date.now() + 30 * 60 * 1000);
  await pool.query('UPDATE password_reset_tokens SET usado_em = NOW() WHERE usuario_id = ? AND usado_em IS NULL', [usuario.id]);
  await pool.query('INSERT INTO password_reset_tokens (usuario_id, token_hash, expira_em) VALUES (?, ?, ?)', [usuario.id, tokenHash, expira]);
  return token;
}

class PasswordResetController {
  async solicitar(req, res) {
    try {
      const email = String(req.body.email || '').trim().toLowerCase();
      if (!email) return res.status(400).json({ error: 'Informe o e-mail.' });
      const [rows] = await pool.query('SELECT id,nome,email,ativo FROM usuarios WHERE email = ?', [email]);
      // Resposta neutra evita revelar quais e-mails estão cadastrados.
      if (!rows.length || !rows[0].ativo) return res.json({ mensagem: 'Se o e-mail estiver cadastrado e ativo, enviaremos as instruções.' });
      const token = await criarToken(rows[0]);
      await EmailService.enviarRedefinicao(rows[0].email, rows[0].nome, token);
      res.json({ mensagem: 'Se o e-mail estiver cadastrado e ativo, enviaremos as instruções.' });
    } catch (e) {
      console.error('[PASSWORD RESET] Falha:', e.message);
      if (e.code === 'EMAIL_NOT_CONFIGURED') return res.status(503).json({ error: 'Envio de e-mail ainda não configurado no servidor.' });
      res.status(500).json({ error: 'Não foi possível enviar a redefinição agora.' });
    }
  }

  async solicitarAdmin(req, res) {
    try {
      const [rows] = await pool.query('SELECT id,nome,email,ativo FROM usuarios WHERE id = ?', [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado.' });
      if (!rows[0].ativo) return res.status(400).json({ error: 'Ative a conta antes de solicitar redefinição.' });
      const token = await criarToken(rows[0]);
      await EmailService.enviarRedefinicao(rows[0].email, rows[0].nome, token);
      res.json({ mensagem: `Link de redefinição enviado para ${rows[0].email}.` });
    } catch (e) {
      console.error('[ADMIN PASSWORD RESET] Falha:', e.message);
      if (e.code === 'EMAIL_NOT_CONFIGURED') return res.status(503).json({ error: 'Configure RESEND_API_KEY e EMAIL_FROM no .env.' });
      res.status(500).json({ error: 'Não foi possível enviar a redefinição.' });
    }
  }

  async redefinir(req, res) {
    try {
      const token = String(req.body.token || '');
      const senha = String(req.body.senha || '');
      const confirmacao = String(req.body.confirmacaoSenha || '');
      if (!token || !senha) return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });
      if (senha.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
      if (senha !== confirmacao) return res.status(400).json({ error: 'A confirmação da senha não confere.' });
      const [rows] = await pool.query(`SELECT prt.id, prt.usuario_id FROM password_reset_tokens prt JOIN usuarios u ON u.id=prt.usuario_id WHERE prt.token_hash=? AND prt.usado_em IS NULL AND prt.expira_em > NOW() AND u.ativo=1 LIMIT 1`, [hashToken(token)]);
      if (!rows.length) return res.status(400).json({ error: 'Link inválido, expirado ou já utilizado.' });
      const hash = await bcrypt.hash(senha, 10);
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query('UPDATE usuarios SET senha=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [hash, rows[0].usuario_id]);
        await conn.query('UPDATE password_reset_tokens SET usado_em=NOW() WHERE id=?', [rows[0].id]);
        await conn.commit();
      } catch(e) { await conn.rollback(); throw e; } finally { conn.release(); }
      res.json({ mensagem: 'Senha redefinida com sucesso. Você já pode entrar.' });
    } catch(e) { console.error('[PASSWORD RESET] Erro:', e.message); res.status(500).json({ error: 'Erro ao redefinir senha.' }); }
  }
}
module.exports = new PasswordResetController();
