// backend/init_db.js
// Script de inicialização e migração do banco MySQL
// Execute: node backend/init_db.js

require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT) || 3306,
    multipleStatements: true
  });

  const dbName = process.env.DB_NAME || 'chamados_ia';

  try {
    console.log('[DB] Conectando ao MySQL...');
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${dbName}\``);
    console.log(`[DB] Banco de dados "${dbName}" garantido.`);

    // ============================================================
    // TABELAS BASE
    // ============================================================

    await connection.query(`
      CREATE TABLE IF NOT EXISTS setores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        descricao TEXT,
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS prioridades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(50) NOT NULL,
        sla_horas INT NOT NULL DEFAULT 4,
        ativo TINYINT(1) NOT NULL DEFAULT 1
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE,
        senha VARCHAR(255) NOT NULL,
        setor VARCHAR(100),
        tipo ENUM('usuario','tecnico','administrador') NOT NULL DEFAULT 'usuario',
        avatar VARCHAR(10),
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS tecnicos (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50),
        nome VARCHAR(100) NOT NULL,
        especialidade VARCHAR(100),
        avatar VARCHAR(10),
        ativo TINYINT(1) NOT NULL DEFAULT 1
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS automacoes_catalogo (
        id VARCHAR(100) PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        descricao TEXT,
        nivel ENUM('automatico','aprovacao','tecnico') NOT NULL DEFAULT 'automatico',
        categoria VARCHAR(100),
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS chamados (
        id INT AUTO_INCREMENT PRIMARY KEY,
        numero VARCHAR(20) UNIQUE,
        usuario_id VARCHAR(50),
        tecnico_id VARCHAR(50),
        titulo VARCHAR(255) NOT NULL,
        descricao TEXT NOT NULL,
        categoria VARCHAR(100),
        prioridade VARCHAR(50),
        status VARCHAR(50) NOT NULL DEFAULT 'aberto',
        sla INT DEFAULT 4,
        diagnostico JSON,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        resolvido_em TIMESTAMP NULL DEFAULT NULL,
        reaberto_em TIMESTAMP NULL DEFAULT NULL,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
        FOREIGN KEY (tecnico_id) REFERENCES tecnicos(id)
      )
    `);

    // Adicionar coluna numero se não existir (migration segura)
    try {
      await connection.query(`ALTER TABLE chamados ADD COLUMN numero VARCHAR(20) UNIQUE AFTER id`);
      console.log('[DB] Coluna "numero" adicionada à tabela chamados.');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) {
        // Já existe, ignorar
      }
    }

    // Adicionar coluna reaberto_em se não existir
    try {
      await connection.query(`ALTER TABLE chamados ADD COLUMN reaberto_em TIMESTAMP NULL DEFAULT NULL AFTER resolvido_em`);
      console.log('[DB] Coluna "reaberto_em" adicionada.');
    } catch (e) {
      // Já existe, ignorar
    }

    // Adicionar coluna senha se não existir
    try {
      await connection.query(`ALTER TABLE usuarios ADD COLUMN senha VARCHAR(255) NOT NULL DEFAULT '$2b$10$mvDT3hKqF6P19zfCc8RHGOkXvkBQJayTCjOXyMK2Le4AdD7yDu1mG' AFTER email`);
      console.log('[DB] Coluna "senha" adicionada a usuarios.');
    } catch (e) {
      // Já existe, ignorar
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        usuario_id VARCHAR(50) NOT NULL,
        token_hash CHAR(64) NOT NULL UNIQUE,
        expira_em DATETIME NOT NULL,
        usado_em DATETIME NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_reset_usuario (usuario_id),
        INDEX idx_reset_expira (expira_em),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS historico_eventos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chamado_id INT NOT NULL,
        tipo VARCHAR(100) NOT NULL,
        descricao TEXT NOT NULL,
        autor VARCHAR(100),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
      )
    `);

    // Adicionar coluna autor se não existir
    try {
      await connection.query(`ALTER TABLE historico_eventos ADD COLUMN autor VARCHAR(100) AFTER descricao`);
    } catch (e) {
      // Já existe
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS respostas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chamado_id INT NOT NULL,
        autor_id VARCHAR(50),
        autor_nome VARCHAR(100),
        mensagem TEXT NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
      )
    `);

    console.log('[DB] Todas as tabelas criadas/verificadas.');

    // ============================================================
    // SEEDS
    // ============================================================

    // Setores
    const [setoresRows] = await connection.query('SELECT COUNT(*) as count FROM setores');
    if (setoresRows[0].count === 0) {
      await connection.query(`
        INSERT INTO setores (nome) VALUES
        ('TI'), ('Administrativo'), ('Financeiro'), ('RH'),
        ('Marketing'), ('Vendas'), ('Logística'), ('Operações')
      `);
      console.log('[DB] Seeds: setores inseridos.');
    }

    // Categorias
    const [catRows] = await connection.query('SELECT COUNT(*) as count FROM categorias');
    if (catRows[0].count === 0) {
      await connection.query(`
        INSERT INTO categorias (nome, descricao) VALUES
        ('impressora', 'Problemas com impressoras, filas de impressão e serviços relacionados'),
        ('rede', 'Problemas de conectividade, internet e infraestrutura de rede'),
        ('vpn', 'Problemas com VPN e acesso remoto'),
        ('acesso', 'Bloqueio de usuário, senhas e controle de acesso'),
        ('software', 'Problemas com softwares e aplicações'),
        ('hardware', 'Problemas com equipamentos físicos'),
        ('email', 'Problemas com e-mail e comunicação'),
        ('outro', 'Outros tipos de suporte')
      `);
      console.log('[DB] Seeds: categorias inseridas.');
    }

    // Prioridades
    const [prioRows] = await connection.query('SELECT COUNT(*) as count FROM prioridades');
    if (prioRows[0].count === 0) {
      await connection.query(`
        INSERT INTO prioridades (nome, sla_horas) VALUES
        ('baixa', 8), ('media', 4), ('alta', 2), ('critica', 1)
      `);
      console.log('[DB] Seeds: prioridades inseridas.');
    }

    // Usuários
    const [usuariosRows] = await connection.query('SELECT COUNT(*) as count FROM usuarios');
    if (usuariosRows[0].count === 0) {
      await connection.query(`
        INSERT INTO usuarios (id, nome, email, senha, setor, tipo, avatar) VALUES
        ('u1', 'João Silva', 'joao@empresa.com', '$2b$10$mvDT3hKqF6P19zfCc8RHGOkXvkBQJayTCjOXyMK2Le4AdD7yDu1mG', 'Financeiro', 'usuario', 'JS'),
        ('u2', 'Maria Santos', 'maria@empresa.com', '$2b$10$mvDT3hKqF6P19zfCc8RHGOkXvkBQJayTCjOXyMK2Le4AdD7yDu1mG', 'RH', 'usuario', 'MS'),
        ('u3', 'Carlos Oliveira', 'carlos@empresa.com', '$2b$10$mvDT3hKqF6P19zfCc8RHGOkXvkBQJayTCjOXyMK2Le4AdD7yDu1mG', 'TI', 'administrador', 'CO'),
        ('u4', 'Ana Costa', 'ana@empresa.com', '$2b$10$mvDT3hKqF6P19zfCc8RHGOkXvkBQJayTCjOXyMK2Le4AdD7yDu1mG', 'Marketing', 'usuario', 'AC'),
        ('u5', 'Pedro Lima', 'pedro@empresa.com', '$2b$10$mvDT3hKqF6P19zfCc8RHGOkXvkBQJayTCjOXyMK2Le4AdD7yDu1mG', 'Vendas', 'usuario', 'PL'),
        ('u6', 'Fernanda Rocha', 'fernanda@empresa.com', '$2b$10$mvDT3hKqF6P19zfCc8RHGOkXvkBQJayTCjOXyMK2Le4AdD7yDu1mG', 'Logística', 'usuario', 'FR')
      `);
      console.log('[DB] Seeds: usuários inseridos.');
    }

    // Técnicos
    const [tecnicosRows] = await connection.query('SELECT COUNT(*) as count FROM tecnicos');
    if (tecnicosRows[0].count === 0) {
      await connection.query(`
        INSERT INTO tecnicos (id, nome, especialidade, avatar) VALUES
        ('t1', 'Rafael Mendes', 'Infraestrutura', 'RM'),
        ('t2', 'Juliana Alves', 'Redes e Impressão', 'JA'),
        ('t3', 'Bruno Ferreira', 'Suporte Geral', 'BF')
      `);
      console.log('[DB] Seeds: técnicos inseridos.');
    }

    // Automações no catálogo do DB
    const [autoRows] = await connection.query('SELECT COUNT(*) as count FROM automacoes_catalogo');
    if (autoRows[0].count === 0) {
      await connection.query(`
        INSERT INTO automacoes_catalogo (id, nome, descricao, nivel, categoria) VALUES
        ('verificar_impressora', 'Verificar Impressora', 'Verifica o status da impressora (online, acessível, respondendo).', 'automatico', 'impressora'),
        ('verificar_fila_impressao', 'Verificar Fila de Impressão', 'Consulta a fila de impressão em busca de documentos travados.', 'automatico', 'impressora'),
        ('limpar_fila_impressao', 'Limpar Fila de Impressão', 'Remove documentos travados da fila e reinicia o serviço de impressão.', 'automatico', 'impressora'),
        ('verificar_servico_impressao', 'Verificar Serviço de Impressão', 'Verifica se o serviço Print Spooler está rodando corretamente.', 'automatico', 'impressora'),
        ('testar_impressao', 'Testar Impressão', 'Envia uma página de teste para confirmar o funcionamento.', 'automatico', 'impressora'),
        ('reiniciar_fila_impressao', 'Reiniciar Serviço de Impressão', 'Reinicia o serviço Print Spooler. Requer aprovação técnica.', 'aprovacao', 'impressora'),
        ('verificar_conexao_rede', 'Verificar Conexão de Rede', 'Diagnóstico básico de conectividade e latência.', 'automatico', 'rede'),
        ('redefinir_servico_critico', 'Redefinir Serviço Crítico', 'Reinicia serviços críticos do sistema. Somente técnico.', 'tecnico', 'sistema')
      `);
      console.log('[DB] Seeds: automações inseridas.');
    }

    console.log('[DB] ✅ Banco de dados inicializado com sucesso!');
    console.log('[DB] Tabelas: setores, categorias, prioridades, usuarios, tecnicos, automacoes_catalogo, chamados, historico_eventos, respostas');

  } catch (error) {
    console.error('[DB] ❌ Erro ao inicializar banco de dados:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

run();
