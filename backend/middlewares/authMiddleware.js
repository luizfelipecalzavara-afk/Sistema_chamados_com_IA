// backend/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'chamadoia_secret_key';

/**
 * Middleware para validar o token JWT e carregar o usuário autenticado do banco.
 */
async function autenticar(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Acesso negado. Token de autenticação não fornecido.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido ou expirado. Faça login novamente.' });
    }

    const [rows] = await pool.query(
      'SELECT id, nome, email, setor, tipo, avatar, ativo, created_at, updated_at FROM usuarios WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado.' });
    }

    const usuario = rows[0];

    // Verificar se o usuário está ativo
    if (!usuario.ativo) {
      return res.status(403).json({ error: 'Conta de usuário desativada. Entre em contato com a administração.' });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    console.error('[AUTH_MIDDLEWARE] Erro na autenticação:', error.message);
    res.status(500).json({ error: 'Erro interno na validação de autenticação.' });
  }
}

/**
 * Middleware opcional: se houver token, autentica; se não houver, prossegue normalmente.
 */
async function autenticarOpcional(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const [rows] = await pool.query(
          'SELECT id, nome, email, setor, tipo, avatar, ativo, created_at, updated_at FROM usuarios WHERE id = ?',
          [decoded.id]
        );
        if (rows.length > 0 && rows[0].ativo) {
          req.usuario = rows[0];
        }
      } catch (err) {
        // Token inválido, prossegue sem req.usuario
      }
    }
    next();
  } catch (err) {
    next();
  }
}

/**
 * Middleware para autorizar apenas determinados perfis de usuário.
 * @param  {...string} tiposPermitidos - Ex: 'administrador', 'tecnico'
 */
function autorizar(...tiposPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }

    if (!tiposPermitidos.includes(req.usuario.tipo)) {
      return res.status(403).json({
        error: `Acesso negado. Esta operação exige perfil: ${tiposPermitidos.join(' ou ')}. Seu perfil atual é: ${req.usuario.tipo}.`
      });
    }

    next();
  };
}

/**
 * Shorthand para autorizar exclusivamente administradores.
 */
const autorizarAdmin = autorizar('administrador');

/**
 * Shorthand para técnicos ou administradores.
 */
const autorizarTecnicoOuAdmin = autorizar('tecnico', 'administrador');

module.exports = {
  autenticar,
  autenticarOpcional,
  autorizar,
  autorizarAdmin,
  autorizarTecnicoOuAdmin,
  JWT_SECRET
};
