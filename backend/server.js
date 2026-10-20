// backend/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
// Porta exclusiva da V4 para não colidir com cópias antigas ainda rodando na porta 3000.
const PORT = process.env.CHAMADOIA_PORT || 3101;

// Configuração explícita de CORS para permitir requisições de qualquer origem local ou porta
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir frontend estático
app.use(express.static(path.join(__dirname, '../')));

// Rotas da API
const apiRoutes = require('./routes/apiRoutes');
app.get('/api/versao', (req, res) => res.json({ versao: 'V4-FINAL-REDE-EXCLUSAO', ok: true, porta: PORT }));
app.use('/api', apiRoutes);

// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   ChamadoIA — Sistema de Suporte com IA  ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`[SERVER] Rodando em http://localhost:${PORT}`);
  console.log(`[DB] Host: ${process.env.DB_HOST}:${process.env.DB_PORT} | Banco: ${process.env.DB_NAME}`);
  console.log(`[AI] Chave configurada: ${process.env.AI_API_KEY ? '✅ SIM (Gemini)' : '⚠️ NÃO (usando fallback local)'}`);
  console.log('');

  // Testar conexão com banco
  try {
    const pool = require('./config/database');
    await pool.query('SELECT 1');
    console.log('[DB] ✅ Conexão com MySQL estabelecida com sucesso.');
  } catch (e) {
    console.error('[DB] ❌ Falha na conexão com MySQL:', e.message);
    console.error('[DB] Verifique as variáveis DB_HOST, DB_USER, DB_PASSWORD, DB_NAME no .env');
  }
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVER] UnhandledRejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[SERVER] UncaughtException:', err.message);
});
