// backend/seed_admin.js
// Script para semear ou resetar as credenciais padrão dos usuários de teste e garantir o primeiro administrador

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function seed() {
  console.log('[SEED] Conectando ao MySQL...');
  const pool = require('./config/database');

  try {
    const senhaPadrao = 'admin123';
    const hash = await bcrypt.hash(senhaPadrao, 10);

    console.log('[SEED] Hash bcrypt gerado com sucesso.');

    // 1. Garantir Administrador (Carlos Oliveira / u3)
    const [carlosRows] = await pool.query('SELECT id FROM usuarios WHERE email = ?', ['carlos@empresa.com']);
    if (carlosRows.length > 0) {
      await pool.query(
        'UPDATE usuarios SET senha = ?, tipo = "administrador", ativo = 1 WHERE email = ?',
        [hash, 'carlos@empresa.com']
      );
      console.log('✅ Administrador [carlos@empresa.com] atualizado com senha "admin123" e perfil "administrador".');
    } else {
      await pool.query(`
        INSERT INTO usuarios (id, nome, email, senha, setor, tipo, avatar, ativo)
        VALUES ('u3', 'Carlos Oliveira', 'carlos@empresa.com', ?, 'TI', 'administrador', 'CO', 1)
      `, [hash]);
      console.log('✅ Administrador [carlos@empresa.com] criado com senha "admin123".');
    }

    // 2. Garantir Administrador Padrão (admin@empresa.com)
    const [adminRows] = await pool.query('SELECT id FROM usuarios WHERE email = ?', ['admin@empresa.com']);
    if (adminRows.length > 0) {
      await pool.query(
        'UPDATE usuarios SET senha = ?, tipo = "administrador", ativo = 1 WHERE email = ?',
        [hash, 'admin@empresa.com']
      );
      console.log('✅ Administrador [admin@empresa.com] atualizado com senha "admin123".');
    } else {
      await pool.query(`
        INSERT INTO usuarios (id, nome, email, senha, setor, tipo, avatar, ativo)
        VALUES ('u_admin', 'Administrador do Sistema', 'admin@empresa.com', ?, 'TI', 'administrador', 'AD', 1)
      `, [hash]);
      console.log('✅ Administrador [admin@empresa.com] criado com senha "admin123".');
    }

    // 3. Garantir Técnico (Rafael Mendes / rafael@empresa.com)
    const [rafaelRows] = await pool.query('SELECT id FROM usuarios WHERE email = ?', ['rafael@empresa.com']);
    if (rafaelRows.length > 0) {
      await pool.query(
        'UPDATE usuarios SET senha = ?, tipo = "tecnico", ativo = 1 WHERE email = ?',
        [hash, 'rafael@empresa.com']
      );
      console.log('✅ Técnico [rafael@empresa.com] atualizado com senha "admin123".');
    } else {
      await pool.query(`
        INSERT INTO usuarios (id, nome, email, senha, setor, tipo, avatar, ativo)
        VALUES ('u_tec1', 'Rafael Mendes', 'rafael@empresa.com', ?, 'Infraestrutura', 'tecnico', 'RM', 1)
      `, [hash]);
      console.log('✅ Técnico [rafael@empresa.com] criado com senha "admin123".');
    }

    // Vincular técnico na tabela tecnicos
    await pool.query(`
      UPDATE tecnicos SET user_id = 'u_tec1' WHERE id = 't1'
    `);

    // 4. Garantir Usuário Comum (João Silva / joao@empresa.com)
    const [joaoRows] = await pool.query('SELECT id FROM usuarios WHERE email = ?', ['joao@empresa.com']);
    if (joaoRows.length > 0) {
      await pool.query(
        'UPDATE usuarios SET senha = ?, tipo = "usuario", ativo = 1 WHERE email = ?',
        [hash, 'joao@empresa.com']
      );
      console.log('✅ Usuário comum [joao@empresa.com] atualizado com senha "admin123".');
    } else {
      await pool.query(`
        INSERT INTO usuarios (id, nome, email, senha, setor, tipo, avatar, ativo)
        VALUES ('u1', 'João Silva', 'joao@empresa.com', ?, 'Financeiro', 'usuario', 'JS', 1)
      `, [hash]);
      console.log('✅ Usuário comum [joao@empresa.com] criado com senha "admin123".');
    }

    console.log('\n======================================================');
    console.log('🎉 SEED CONCLUÍDO COM SUCESSO! CREDENCIAIS DE ACESSO:');
    console.log('------------------------------------------------------');
    console.log('👑 Administrador: carlos@empresa.com  | Senha: admin123');
    console.log('👑 Admin Padrão: admin@empresa.com   | Senha: admin123');
    console.log('🔧 Técnico:       rafael@empresa.com  | Senha: admin123');
    console.log('👤 Usuário Comum: joao@empresa.com    | Senha: admin123');
    console.log('======================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Erro no seed:', err.message);
    process.exit(1);
  }
}

seed();
