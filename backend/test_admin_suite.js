// backend/test_admin_suite.js
// Bateria de testes automatizados para validar todos os 15 requisitos obrigatórios da Área Administrativa

require('dotenv').config();
const http = require('http');
const pool = require('./config/database');
const bcrypt = require('bcrypt');

const BASE_URL = 'http://localhost:3000/api';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 INICIANDO BATERIA DE TESTES OBRIGATÓRIOS — ÁREA ADMINISTRATIVA');
  console.log('===============================================================\n');

  let passes = 0;
  let fails = 0;

  function assert(condition, testNum, testName, details = '') {
    if (condition) {
      console.log(`✅ [TESTE ${testNum}] PASSOU: ${testName} ${details ? '— ' + details : ''}`);
      passes++;
    } else {
      console.error(`❌ [TESTE ${testNum}] FALHOU: ${testName} ${details ? '— ' + details : ''}`);
      fails++;
    }
  }

  try {
    // 0. Preparação: Login como Administrador (Carlos) e como Usuário Comum (João)
    const adminLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'carlos@empresa.com', senha: 'admin123' }
    });
    const adminToken = adminLoginRes.data.token;
    assert(adminLoginRes.status === 200 && !!adminToken, 'SETUP', 'Login do administrador Carlos');

    const userLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'joao@empresa.com', senha: 'admin123' }
    });
    const userToken = userLoginRes.data.token;
    assert(userLoginRes.status === 200 && !!userToken, 'SETUP', 'Login do usuário comum João');

    // -------------------------------------------------------------------------
    // TESTE 1: Cadastro de usuário válido
    // -------------------------------------------------------------------------
    const emailTeste1 = `usuario_teste_${Date.now()}@teste.com`;
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: {
        nome: 'Usuario Teste 1',
        email: emailTeste1,
        senha: 'senha123456',
        confirmacaoSenha: 'senha123456',
        setor: 'TI'
      }
    });
    assert(
      regRes.status === 201 && regRes.data.user && regRes.data.user.email === emailTeste1 && !!regRes.data.token,
      '1',
      'Cadastro de usuário válido via fluxo público',
      `ID: ${regRes.data.user?.id}`
    );

    // -------------------------------------------------------------------------
    // TESTE 2: Rejeição de e-mail duplicado
    // -------------------------------------------------------------------------
    const dupRes = await request('/auth/register', {
      method: 'POST',
      body: {
        nome: 'Usuario Repetido',
        email: emailTeste1,
        senha: 'senha123456',
        confirmacaoSenha: 'senha123456',
        setor: 'RH'
      }
    });
    assert(
      dupRes.status === 400 && dupRes.data.error.includes('já está em uso'),
      '2',
      'Rejeição de e-mail duplicado',
      `Status: ${dupRes.status}, Mensagem: "${dupRes.data.error}"`
    );

    // -------------------------------------------------------------------------
    // TESTE 3: Login válido e inválido
    // -------------------------------------------------------------------------
    const loginOk = await request('/auth/login', {
      method: 'POST',
      body: { email: emailTeste1, senha: 'senha123456' }
    });
    const loginFail = await request('/auth/login', {
      method: 'POST',
      body: { email: emailTeste1, senha: 'senha_errada_123' }
    });
    assert(
      loginOk.status === 200 && !!loginOk.data.token && loginFail.status === 401,
      '3',
      'Login válido com token e rejeição de login com credenciais inválidas',
      `Ok status: ${loginOk.status}, Fail status: ${loginFail.status}`
    );

    // -------------------------------------------------------------------------
    // TESTE 4: Logout (Verificação de ciclo de vida de sessão)
    // -------------------------------------------------------------------------
    // No modelo JWT client-side, o logout limpa o token local. Validamos que uma requisição
    // sem o header Authorization é recusada na rota autenticada /auth/me
    const meSemToken = await request('/auth/me');
    assert(
      meSemToken.status === 401,
      '4',
      'Logout / Sessão invalidada sem token',
      `Status retornado sem credencial: ${meSemToken.status}`
    );

    // -------------------------------------------------------------------------
    // TESTE 5: Bloqueio de páginas e APIs privadas sem autenticação
    // -------------------------------------------------------------------------
    const adminSemAuth = await request('/admin/usuarios');
    const perfilSemAuth = await request('/perfil');
    assert(
      adminSemAuth.status === 401 && perfilSemAuth.status === 401,
      '5',
      'Bloqueio de APIs privadas sem autenticação',
      `/admin/usuarios: ${adminSemAuth.status}, /perfil: ${perfilSemAuth.status}`
    );

    // -------------------------------------------------------------------------
    // TESTE 6: Bloqueio de usuário comum tentando acessar a administração
    // -------------------------------------------------------------------------
    const adminComUserToken = await request('/admin/usuarios', {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(
      adminComUserToken.status === 403,
      '6',
      'Bloqueio de usuário comum acessando rotas de administração (403 Forbidden)',
      `Status: ${adminComUserToken.status}, Mensagem: "${adminComUserToken.data.error}"`
    );

    // -------------------------------------------------------------------------
    // TESTE 7: Administrador criando um usuário
    // -------------------------------------------------------------------------
    const emailAdminCriado = `criado_por_admin_${Date.now()}@empresa.com`;
    const adminCriaUser = await request('/admin/usuarios', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        nome: 'Usuario Criado Pelo Admin',
        email: emailAdminCriado,
        senha: 'senhaAdmin123',
        confirmacaoSenha: 'senhaAdmin123',
        setor: 'Financeiro',
        tipo: 'usuario',
        ativo: 1
      }
    });
    const novoUserId = adminCriaUser.data.usuario?.id;
    assert(
      adminCriaUser.status === 201 && !!novoUserId,
      '7',
      'Administrador criando novo usuário com sucesso',
      `ID criado: ${novoUserId}`
    );

    // -------------------------------------------------------------------------
    // TESTE 8: Administrador editando um usuário
    // -------------------------------------------------------------------------
    const editRes = await request(`/admin/usuarios/${novoUserId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        nome: 'Usuario Editado com Sucesso',
        email: emailAdminCriado,
        setor: 'Marketing'
      }
    });
    assert(
      editRes.status === 200 && editRes.data.usuario?.nome === 'Usuario Editado com Sucesso' && editRes.data.usuario?.setor === 'Marketing',
      '8',
      'Administrador editando dados do usuário',
      `Novo nome: "${editRes.data.usuario?.nome}", Setor: "${editRes.data.usuario?.setor}"`
    );

    // -------------------------------------------------------------------------
    // TESTE 9: Administrador alterando perfil com autorização
    // -------------------------------------------------------------------------
    const perfilAltRes = await request(`/admin/usuarios/${novoUserId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        tipo: 'tecnico'
      }
    });
    assert(
      perfilAltRes.status === 200 && perfilAltRes.data.usuario?.tipo === 'tecnico',
      '9',
      'Administrador promovendo usuário para o perfil técnico com sucesso',
      `Perfil atualizado para: ${perfilAltRes.data.usuario?.tipo}`
    );

    // -------------------------------------------------------------------------
    // TESTE 10: Administrador ativando e desativando contas
    // -------------------------------------------------------------------------
    const desativarRes = await request(`/admin/usuarios/${novoUserId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { ativo: 0 }
    });
    const ativarRes = await request(`/admin/usuarios/${novoUserId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { ativo: 1 }
    });
    assert(
      desativarRes.status === 200 && desativarRes.data.ativo === 0 &&
      ativarRes.status === 200 && ativarRes.data.ativo === 1,
      '10',
      'Administrador desativando e reativando conta',
      `Desativado: ativo=${desativarRes.data.ativo}, Reativado: ativo=${ativarRes.data.ativo}`
    );

    // -------------------------------------------------------------------------
    // TESTE 11: Exclusão ou desativação segura de usuário
    // 11.A: Usuário COM chamados vinculados -> Deve sofrer desativação lógica (soft delete)
    // 11.B: Usuário SEM chamados vinculados -> Deve ser excluído fisicamente
    // -------------------------------------------------------------------------
    // João Silva (u1) possui chamados no banco
    const delComVinculoRes = await request('/admin/usuarios/u1', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Usuário novoUserId não possui nenhum chamado aberto
    const delSemVinculoRes = await request(`/admin/usuarios/${novoUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(
      delComVinculoRes.status === 200 && delComVinculoRes.data.desativado === true &&
      delSemVinculoRes.status === 200 && delSemVinculoRes.data.excluidoFisicamente === true,
      '11',
      'Exclusão e desativação segura: preservação de auditoria em contas vinculadas e exclusão física em contas sem vínculos',
      `Conta vinculada: desativado=${delComVinculoRes.data.desativado}; Conta sem vinculo: excluido=${delSemVinculoRes.data.excluidoFisicamente}`
    );

    // Reativar João para não interferir em outros testes
    await pool.query('UPDATE usuarios SET ativo = 1 WHERE id = "u1"');

    // -------------------------------------------------------------------------
    // TESTE 12: Proteção do último administrador ativo
    // -------------------------------------------------------------------------
    // Deixar apenas Carlos Oliveira como administrador ativo temporariamente
    await pool.query('UPDATE usuarios SET ativo = 0 WHERE tipo = "administrador" AND email != "carlos@empresa.com"');

    // Tentar excluir Carlos Oliveira (único admin ativo)
    const delLastAdmin = await request('/admin/usuarios/u3', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Tentar desativar Carlos Oliveira
    const deactLastAdmin = await request('/admin/usuarios/u3/status', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { ativo: 0 }
    });

    // Tentar rebaixar Carlos Oliveira para 'usuario'
    const demoteLastAdmin = await request('/admin/usuarios/u3', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { tipo: 'usuario' }
    });

    assert(
      delLastAdmin.status === 400 && deactLastAdmin.status === 400 && demoteLastAdmin.status === 400,
      '12',
      'Proteção do último administrador ativo contra exclusão, desativação e rebaixamento',
      `Delete: ${delLastAdmin.status}, Desativar: ${deactLastAdmin.status}, Rebaixar: ${demoteLastAdmin.status}`
    );

    // Restaurar outro admin
    await pool.query('UPDATE usuarios SET ativo = 1 WHERE email = "admin@empresa.com"');

    // -------------------------------------------------------------------------
    // TESTE 13: Usuário alterando o próprio perfil e senha
    // -------------------------------------------------------------------------
    // Usuário Teste 1 altera seu próprio nome e setor
    const test1Login = await request('/auth/login', {
      method: 'POST',
      body: { email: emailTeste1, senha: 'senha123456' }
    });
    const test1Token = test1Login.data.token;

    const perfilUpdate = await request('/perfil', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${test1Token}` },
      body: { nome: 'Usuario Teste 1 Atualizado', setor: 'RH' }
    });

    // Alterar senha com senha atual correta
    const senhaUpdateOk = await request('/perfil/senha', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${test1Token}` },
      body: {
        senhaAtual: 'senha123456',
        novaSenha: 'novaSenhaSegura999',
        confirmacaoNovaSenha: 'novaSenhaSegura999'
      }
    });

    // Testar se login funciona com a nova senha
    const loginNovaSenha = await request('/auth/login', {
      method: 'POST',
      body: { email: emailTeste1, senha: 'novaSenhaSegura999' }
    });

    assert(
      perfilUpdate.status === 200 && senhaUpdateOk.status === 200 && loginNovaSenha.status === 200,
      '13',
      'Usuário comum alterando o próprio perfil e alterando senha com verificação da senha antiga',
      `Perfil status: ${perfilUpdate.status}, Senha status: ${senhaUpdateOk.status}, Novo login: ${loginNovaSenha.status}`
    );

    // -------------------------------------------------------------------------
    // TESTE 14: Persistência dos dados no MySQL
    // -------------------------------------------------------------------------
    const [dbRows] = await pool.query('SELECT nome, setor FROM usuarios WHERE email = ?', [emailTeste1]);
    assert(
      dbRows.length > 0 && dbRows[0].nome === 'Usuario Teste 1 Atualizado' && dbRows[0].setor === 'RH',
      '14',
      'Persistência confirmada diretamente no banco de dados MySQL',
      `Nome no DB: "${dbRows[0]?.nome}", Setor no DB: "${dbRows[0]?.setor}"`
    );

    // Limpar usuário de teste
    await pool.query('DELETE FROM usuarios WHERE email = ?', [emailTeste1]);

    // -------------------------------------------------------------------------
    // TESTE 15: Funcionamento das operações de chamados e integridade do sistema
    // -------------------------------------------------------------------------
    const listChamadosRes = await request('/chamados', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const categoriasRes = await request('/categorias');
    const tecnicosRes = await request('/tecnicos');
    const metricasChamados = await request('/metricas');

    assert(
      listChamadosRes.status === 200 && Array.isArray(listChamadosRes.data) &&
      categoriasRes.status === 200 && tecnicosRes.status === 200 && metricasChamados.status === 200,
      '15',
      'Integridade preservada: Chamados, Categorias, Técnicos e Métricas funcionando perfeitamente',
      `Total chamados: ${listChamadosRes.data?.length}, Categorias: ${categoriasRes.data?.length}, Tecnicos: ${tecnicosRes.data?.length}`
    );

  } catch (error) {
    console.error('❌ Erro inesperado durante execução da suite de testes:', error);
    fails++;
  }

  console.log('\n===============================================================');
  console.log(`📊 RESULTADO FINAL DA BATERIA DE TESTES:`);
  console.log(`   ✅ PASSARAM: ${passes}`);
  console.log(`   ❌ FALHARAM: ${fails}`);
  console.log('===============================================================\n');

  process.exit(fails > 0 ? 1 : 0);
}

runTests();
