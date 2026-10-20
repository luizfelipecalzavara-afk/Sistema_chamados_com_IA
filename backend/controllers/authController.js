// backend/controllers/authController.js
const pool = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'chamadoia_secret_key';

class AuthController {
  // ============================================================
  // CADASTRO PÚBLICO (Apenas perfil "usuario" comum)
  // ============================================================
  async register(req, res) {
    try {
      const { nome, email, senha, confirmacaoSenha, setor } = req.body;

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
        return res.status(400).json({ error: 'A senha deve conter no mínimo 6 caracteres.', campo: 'senha' });
      }

      if (confirmacaoSenha && senha !== confirmacaoSenha) {
        return res.status(400).json({ error: 'A confirmação de senha não confere.', campo: 'confirmacaoSenha' });
      }

      if (!setor || !setor.trim()) {
        return res.status(400).json({ error: 'O setor é obrigatório.', campo: 'setor' });
      }

      // Check if email exists
      const [existing] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email.trim().toLowerCase()]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Este e-mail já está em uso.', campo: 'email' });
      }

      // Generate ID and Hash
      const id = 'u_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      const hash = await bcrypt.hash(senha, 10);

      const partes = nome.trim().split(' ').filter(Boolean);
      const avatar = (partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : partes[0].substring(0, 2)).toUpperCase();

      // Cadastro público sempre atribui perfil 'usuario' e ativo 1 (segurança)
      await pool.query(
        'INSERT INTO usuarios (id, nome, email, senha, setor, tipo, avatar, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, nome.trim(), email.trim().toLowerCase(), hash, setor.trim(), 'usuario', avatar, 1]
      );

      const [userRows] = await pool.query('SELECT id, nome, email, setor, tipo, avatar, ativo FROM usuarios WHERE id = ?', [id]);
      const user = userRows[0];
      
      const token = jwt.sign({ id: user.id, tipo: user.tipo }, JWT_SECRET, { expiresIn: '7d' });
      
      res.status(201).json({
        mensagem: 'Conta criada com sucesso!',
        user,
        token
      });
    } catch (e) {
      console.error('[AUTH] Erro ao registrar:', e.message);
      res.status(500).json({ error: 'Erro ao registrar usuário.', detalhes: e.message });
    }
  }

  // ============================================================
  // LOGIN
  // ============================================================
  async login(req, res) {
    try {
      const { email, senha } = req.body;
      if (!email || !senha) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
      }

      const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email.trim().toLowerCase()]);
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
      }

      const user = rows[0];

      // Verificar status da conta
      if (!user.ativo) {
        return res.status(403).json({ error: 'Conta de usuário desativada. Entre em contato com a administração.' });
      }

      const match = await bcrypt.compare(senha, user.senha);
      if (!match) {
        return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
      }

      const token = jwt.sign({ id: user.id, tipo: user.tipo }, JWT_SECRET, { expiresIn: '7d' });
      
      delete user.senha; // hide password hash
      res.json({
        mensagem: 'Login realizado com sucesso!',
        user,
        token
      });
    } catch (e) {
      console.error('[AUTH] Erro no login:', e.message);
      res.status(500).json({ error: 'Erro ao realizar login.', detalhes: e.message });
    }
  }

  // ============================================================
  // OBTER USUÁRIO ATUAL (SESSÃO)
  // ============================================================
  async me(req, res) {
    try {
      res.json({ user: req.usuario });
    } catch (e) {
      res.status(500).json({ error: 'Erro ao validar sessão.' });
    }
  }
}

module.exports = new AuthController();
