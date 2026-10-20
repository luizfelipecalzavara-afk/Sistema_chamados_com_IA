// backend/routes/apiRoutes.js

const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/chamadoController');
const authCtrl = require('../controllers/authController');
const adminCtrl = require('../controllers/adminController');
const perfilCtrl = require('../controllers/perfilController');
const passwordResetCtrl = require('../controllers/passwordResetController');

const {
  autenticar,
  autenticarOpcional,
  autorizarAdmin,
  autorizarTecnicoOuAdmin
} = require('../middlewares/authMiddleware');

// ============================================================
// 1. AUTENTICAÇÃO PÚBLICA & SESSÃO
// ============================================================
router.post('/auth/register', authCtrl.register);
router.post('/auth/login', authCtrl.login);
router.get('/auth/me', autenticar, authCtrl.me);
router.post('/auth/esqueci-senha', passwordResetCtrl.solicitar);
router.post('/auth/redefinir-senha', passwordResetCtrl.redefinir);

// ============================================================
// 2. MEU PERFIL (Usuário autenticado)
// ============================================================
router.get('/perfil', autenticar, perfilCtrl.obterPerfil);
router.put('/perfil', autenticar, perfilCtrl.atualizarPerfil);
router.put('/perfil/senha', autenticar, perfilCtrl.alterarSenha);

// ============================================================
// 3. ÁREA ADMINISTRATIVA (Exclusivo para perfil "administrador")
// ============================================================
router.get('/admin/metricas-usuarios', autenticar, autorizarAdmin, adminCtrl.metricas);
router.get('/admin/usuarios', autenticar, autorizarAdmin, adminCtrl.listarUsuarios);
router.get('/admin/usuarios/:id', autenticar, autorizarAdmin, adminCtrl.obterUsuario);
router.post('/admin/usuarios', autenticar, autorizarAdmin, adminCtrl.criarUsuario);
router.put('/admin/usuarios/:id', autenticar, autorizarAdmin, adminCtrl.atualizarUsuario);
router.patch('/admin/usuarios/:id/status', autenticar, autorizarAdmin, adminCtrl.alterarStatus);
router.put('/admin/usuarios/:id/status', autenticar, autorizarAdmin, adminCtrl.alterarStatus);
router.delete('/admin/usuarios/:id', autenticar, autorizarAdmin, adminCtrl.excluirUsuario);
router.post('/admin/usuarios/:id/redefinir-senha', autenticar, autorizarAdmin, passwordResetCtrl.solicitarAdmin);

// ============================================================
// 4. DADOS AUXILIARES
// ============================================================
router.get('/usuarios', ctrl.listarUsuarios);
router.get('/tecnicos', ctrl.listarTecnicos);
router.get('/categorias', ctrl.listarCategorias);
router.get('/setores', ctrl.listarSetores);
router.get('/prioridades', ctrl.listarPrioridades);
router.get('/automacoes', ctrl.listarAutomacoes);
router.get('/metricas', autenticarOpcional, ctrl.listarMetricas);

// ============================================================
// 5. CHAMADOS CRUD (Com controle de acesso baseado em perfil)
// ============================================================
router.get('/chamados', autenticar, ctrl.listar);
router.post('/chamados', autenticar, ctrl.criar);
router.get('/chamados/:id', autenticar, ctrl.buscar);
router.put('/chamados/:id', autenticar, ctrl.atualizar);
router.post('/chamados/:id/diagnosticar', autenticar, ctrl.diagnosticar);
router.delete('/chamados/:id', autenticar, autorizarAdmin, ctrl.excluir);
// Compatibilidade para ambientes onde DELETE é interceptado/cacheado pelo servidor estático.
router.post('/chamados/:id/excluir-admin', autenticar, autorizarAdmin, ctrl.excluir);

// ============================================================
// 6. FLUXO DE CHAMADOS & AÇÕES TÉCNICAS
// ============================================================
router.post('/chamados/:id/aprovar', autenticar, ctrl.aprovar);
router.post('/chamados/:id/resolver', autenticar, ctrl.resolver);
router.post('/chamados/:id/reabrir', autenticar, ctrl.reabrir);
router.post('/chamados/:id/atribuir', autenticar, ctrl.atribuir);

// ============================================================
// 7. HISTÓRICO E RESPOSTAS
// ============================================================
router.get('/chamados/:id/historico', autenticar, ctrl.listarHistorico);
router.get('/chamados/:id/respostas', autenticar, ctrl.listarRespostas);
router.post('/chamados/:id/respostas', autenticar, ctrl.adicionarResposta);

// Compatibilidade
router.post('/chamados/:id/responder', autenticar, async (req, res) => {
  req.body.autor_nome = req.body.autor_nome || (req.usuario ? req.usuario.nome : 'Técnico');
  req.body.autor_id = req.body.autor_id || (req.usuario ? req.usuario.id : 't1');
  return ctrl.adicionarResposta(req, res);
});

module.exports = router;
