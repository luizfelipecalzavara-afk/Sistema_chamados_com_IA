// backend/test_chamados_lifecycle.js
// Teste de ciclo de vida completo de chamados com IA, respostas, técnico e métricas

const http = require('http');
const pool = require('./config/database');

const API_PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${API_PORT}/api`;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : {} });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function esperar(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('===============================================================');
  console.log('🧪 TESTE DE CICLO DE VIDA COMPLETO — CHAMADOIA');
  console.log('===============================================================');

  // 1. Login Usuário Comum
  const loginUser = await request('POST', '/auth/login', { email: 'joao@empresa.com', senha: 'admin123' });
  if (loginUser.status !== 200) throw new Error('Falha no login do usuário João: ' + JSON.stringify(loginUser.data));
  const tokenUser = loginUser.data.token;
  console.log('✅ [1] Login do usuário solicitante (João): OK');

  // 2. Login Técnico
  const loginTec = await request('POST', '/auth/login', { email: 'rafael@empresa.com', senha: 'admin123' });
  if (loginTec.status !== 200) throw new Error('Falha no login do técnico Rafael: ' + JSON.stringify(loginTec.data));
  const tokenTec = loginTec.data.token;
  console.log('✅ [2] Login do técnico (Rafael): OK');

  // 3. Login Administrador
  const loginAdmin = await request('POST', '/auth/login', { email: 'carlos@empresa.com', senha: 'admin123' });
  if (loginAdmin.status !== 200) throw new Error('Falha no login do administrador Carlos: ' + JSON.stringify(loginAdmin.data));
  const tokenAdmin = loginAdmin.data.token;
  console.log('✅ [3] Login do administrador (Carlos): OK');

  // 4. Criação de chamado com categoria e prioridade customizadas
  const novoChamado = await request('POST', '/chamados', {
    titulo: 'Impressora Fiscal HP travada no setor Financeiro',
    descricao: 'A impressora HP LaserJet travou a fila de impressão e não imprime notas fiscais urgentes desde as 8h.',
    categoria: 'impressora',
    prioridade: 'alta'
  }, tokenUser);

  if (novoChamado.status !== 201) throw new Error('Falha ao abrir chamado: ' + JSON.stringify(novoChamado.data));
  const chamadoId = novoChamado.data.id;
  console.log(`✅ [4] Chamado aberto com sucesso: ID=${chamadoId}, Número=${novoChamado.data.numero}, Categoria=${novoChamado.data.categoria}, Prioridade=${novoChamado.data.prioridade}`);

  // 5. Aguardar processamento da IA (Orquestrador + Gemini / Fallback)
  console.log('⏳ [5] Aguardando processamento da IA (diagnóstico e automação)...');
  await esperar(2500);

  // 6. Consultar detalhes do chamado
  const detalhe = await request('GET', `/chamados/${chamadoId}`, null, tokenUser);
  if (detalhe.status !== 200) throw new Error('Falha ao buscar detalhes: ' + JSON.stringify(detalhe.data));
  const ch = detalhe.data;
  console.log(`✅ [6] Detalhes do chamado recuperados: Status=${ch.status}, SLA=${ch.sla}h, Histórico=${(ch.historico || []).length} eventos`);
  if (ch.diagnostico) {
    console.log(`   🤖 Diagnóstico IA: Fonte=${ch.diagnostico.fonte || ch.diagnostico.origem}, Confiança=${Math.round(ch.diagnostico.confianca * 100)}%, Ação=${ch.diagnostico.acaoSugerida}`);
  }

  // 7. Usuário adiciona resposta / mensagem
  const respUser = await request('POST', `/chamados/${chamadoId}/respostas`, {
    mensagem: 'Consegui reiniciar a impressora na tomada, mas ainda consta erro no computador.'
  }, tokenUser);
  if (respUser.status !== 201) throw new Error('Falha ao adicionar resposta do usuário: ' + JSON.stringify(respUser.data));
  console.log('✅ [7] Resposta do usuário registrada no chamado: OK');

  // 8. Técnico responde ao chamado
  const respTec = await request('POST', `/chamados/${chamadoId}/respostas`, {
    mensagem: 'Olá João, estou assumindo o chamado. Vou verificar o spooler de impressão na rede.'
  }, tokenTec);
  if (respTec.status !== 201) throw new Error('Falha ao adicionar resposta do técnico: ' + JSON.stringify(respTec.data));
  console.log('✅ [8] Resposta do técnico registrada no chamado: OK');

  // 9. Técnico assume / atribui o chamado
  const atrib = await request('POST', `/chamados/${chamadoId}/atribuir`, {
    tecnico_id: 't1'
  }, tokenTec);
  if (atrib.status !== 200) throw new Error('Falha ao atribuir técnico: ' + JSON.stringify(atrib.data));
  console.log('✅ [9] Técnico atribuído com sucesso: OK');

  // 10. Bloqueio de segurança: usuário comum NÃO pode atribuir técnico (403)
  const atribFail = await request('POST', `/chamados/${chamadoId}/atribuir`, {
    tecnico_id: 't1'
  }, tokenUser);
  if (atribFail.status === 403) {
    console.log('✅ [10] Bloqueio de segurança: Usuário comum impedido de atribuir técnico (403 Forbidden): OK');
  } else {
    throw new Error('Falha na segurança: usuário comum conseguiu atribuir técnico!');
  }

  // 11. Bloqueio de segurança: usuário comum NÃO pode resolver chamado (403)
  const resFail = await request('POST', `/chamados/${chamadoId}/resolver`, {
    mensagem: 'Tentando resolver'
  }, tokenUser);
  if (resFail.status === 403) {
    console.log('✅ [11] Bloqueio de segurança: Usuário comum impedido de resolver chamado (403 Forbidden): OK');
  } else {
    throw new Error('Falha na segurança: usuário comum conseguiu resolver chamado!');
  }

  // 12. Técnico resolve o chamado
  const resTec = await request('POST', `/chamados/${chamadoId}/resolver`, {
    mensagem: 'Serviço do Spooler de impressão reiniciado e fila limpa com sucesso.'
  }, tokenTec);
  if (resTec.status !== 200) throw new Error('Falha ao resolver chamado pelo técnico: ' + JSON.stringify(resTec.data));
  console.log('✅ [12] Técnico resolveu chamado com sucesso: OK');

  // 13. Reabertura do chamado
  const reabrir = await request('POST', `/chamados/${chamadoId}/reabrir`, null, tokenUser);
  if (reabrir.status !== 200) throw new Error('Falha ao reabrir chamado: ' + JSON.stringify(reabrir.data));
  console.log('✅ [13] Chamado reaberto pelo usuário com sucesso: OK');

  // 14. Consulta de métricas reais do banco com distribuição
  const metricas = await request('GET', '/metricas', null, tokenAdmin);
  if (metricas.status !== 200) throw new Error('Falha ao carregar métricas: ' + JSON.stringify(metricas.data));
  console.log(`✅ [14] Métricas reais do banco calculadas: Total=${metricas.data.total}, Abertos=${metricas.data.abertos}, Resolvidos=${metricas.data.totalResolvidos || metricas.data.resolvidos}`);
  console.log('   Distribuição por Prioridade:', metricas.data.porPrioridade);
  console.log('   Distribuição por Status:', metricas.data.porStatus);

  console.log('===============================================================');
  console.log('🎉 TODOS OS 14 TESTES DE FLUXO DE CHAMADOS PASSARAM COM SUCESSO!');
  console.log('===============================================================');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ ERRO NO TESTE:', err.message);
  process.exit(1);
});
