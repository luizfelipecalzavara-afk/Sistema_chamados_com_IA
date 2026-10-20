// backend/services/ChamadoService.js
// Serviço de acesso ao banco para chamados, histórico e respostas

const pool = require('../config/database');

class ChamadoService {

  // ============================================================
  // Gerar número único CH-XXXXXX
  // ============================================================
  async gerarNumero() {
    const [rows] = await pool.query('SELECT MAX(id) as maxId FROM chamados');
    const nextId = (rows[0].maxId || 0) + 1;
    return `CH-${String(nextId).padStart(6, '0')}`;
  }

  // ============================================================
  // Listar todos os chamados (com JOIN para nome de usuário e técnico)
  // ============================================================
  async getChamados(filtroUsuarioId = null) {
    let query = `
      SELECT 
        c.*,
        u.nome as usuario_nome,
        u.email as usuario_email,
        u.setor as usuario_setor,
        u.avatar as usuario_avatar,
        t.nome as tecnico_nome,
        t.especialidade as tecnico_especialidade,
        t.avatar as tecnico_avatar
      FROM chamados c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      LEFT JOIN tecnicos t ON c.tecnico_id = t.id
    `;
    const params = [];
    if (filtroUsuarioId) {
      query += ` WHERE c.usuario_id = ?`;
      params.push(filtroUsuarioId);
    }
    query += ` ORDER BY c.id DESC`;

    const [rows] = await pool.query(query, params);
    return rows.map(r => this._normalizar(r));
  }

  // ============================================================
  // Buscar chamado por ID (com histórico e respostas)
  // ============================================================
  async getChamadoById(id) {
    const [rows] = await pool.query(`
      SELECT 
        c.*,
        u.nome as usuario_nome,
        u.email as usuario_email,
        u.setor as usuario_setor,
        u.avatar as usuario_avatar,
        t.nome as tecnico_nome,
        t.especialidade as tecnico_especialidade,
        t.avatar as tecnico_avatar
      FROM chamados c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      LEFT JOIN tecnicos t ON c.tecnico_id = t.id
      WHERE c.id = ?
    `, [id]);

    if (rows.length === 0) return null;
    const chamado = this._normalizar(rows[0]);

    const [historico] = await pool.query(
      'SELECT * FROM historico_eventos WHERE chamado_id = ? ORDER BY timestamp ASC',
      [id]
    );
    chamado.historico = historico;

    const [respostas] = await pool.query(
      'SELECT * FROM respostas WHERE chamado_id = ? ORDER BY criado_em ASC',
      [id]
    );
    chamado.respostas = respostas;

    return chamado;
  }

  // ============================================================
  // Criar chamado
  // ============================================================
  async criarChamado({ usuario_id, titulo, descricao, categoria = null, prioridade = null }) {
    // Verificar se usuário existe
    const [usuarioRows] = await pool.query('SELECT id FROM usuarios WHERE id = ?', [usuario_id]);
    if (usuarioRows.length === 0) {
      throw new Error(`Usuário "${usuario_id}" não encontrado no banco de dados.`);
    }

    const numero = await this.gerarNumero();

    const [result] = await pool.query(
      'INSERT INTO chamados (numero, usuario_id, tecnico_id, titulo, descricao, categoria, prioridade, status) VALUES (?, ?, NULL, ?, ?, ?, ?, ?)',
      [numero, usuario_id, titulo, descricao, categoria || null, prioridade || null, 'aberto']
    );
    const chamadoId = result.insertId;

    await this.adicionarHistorico(chamadoId, 'abertura', `Chamado ${numero} aberto pelo usuário.`, 'sistema');
    console.log(`[TICKET] ${numero} criado (ID: ${chamadoId})`);

    return await this.getChamadoById(chamadoId);
  }

  // ============================================================
  // Atualizar chamado
  // ============================================================
  async atualizarChamado(id, updates) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(
        typeof value === 'object' && value !== null && !(value instanceof Date)
          ? JSON.stringify(value)
          : value
      );
    }

    if (fields.length === 0) return await this.getChamadoById(id);

    values.push(id);
    const query = `UPDATE chamados SET ${fields.join(', ')} WHERE id = ?`;
    await pool.query(query, values);

    return await this.getChamadoById(id);
  }

  // ============================================================
  // Histórico de eventos
  // ============================================================
  async adicionarHistorico(chamado_id, tipo, descricao, autor = 'sistema') {
    await pool.query(
      'INSERT INTO historico_eventos (chamado_id, tipo, descricao, autor) VALUES (?, ?, ?, ?)',
      [chamado_id, tipo, descricao, autor]
    );
  }

  // ============================================================
  // Respostas
  // ============================================================
  async adicionarResposta(chamado_id, autor_id, autor_nome, mensagem) {
    const [result] = await pool.query(
      'INSERT INTO respostas (chamado_id, autor_id, autor_nome, mensagem) VALUES (?, ?, ?, ?)',
      [chamado_id, autor_id, autor_nome, mensagem]
    );
    const [rows] = await pool.query('SELECT * FROM respostas WHERE id = ?', [result.insertId]);
    return rows[0];
  }

  async getRespostas(chamado_id) {
    const [rows] = await pool.query(
      'SELECT * FROM respostas WHERE chamado_id = ? ORDER BY criado_em ASC',
      [chamado_id]
    );
    return rows;
  }

  // ============================================================
  // Normalização de campos para o frontend
  // ============================================================
  _normalizar(row) {
    // Parse JSON do diagnóstico
    if (typeof row.diagnostico === 'string') {
      try { row.diagnostico = JSON.parse(row.diagnostico); } catch (e) { row.diagnostico = null; }
    }

    // Aliases para compatibilidade com frontend existente
    return {
      ...row,
      // Compatibilidade frontend (usa criadoEm, usuario, tecnico)
      criadoEm: row.criado_em,
      atualizadoEm: row.atualizado_em,
      resolvidoEm: row.resolvido_em,
      reabertoEm: row.reaberto_em,
      usuario: row.usuario_id,
      tecnico: row.tecnico_id,
      usuario_info: row.usuario_nome ? {
        id: row.usuario_id,
        nome: row.usuario_nome,
        email: row.usuario_email,
        setor: row.usuario_setor,
        avatar: row.usuario_avatar || row.usuario_nome?.substring(0, 2).toUpperCase() || '??'
      } : null,
      tecnico_info: row.tecnico_nome ? {
        id: row.tecnico_id,
        nome: row.tecnico_nome,
        especialidade: row.tecnico_especialidade,
        avatar: row.tecnico_avatar || row.tecnico_nome?.substring(0, 2).toUpperCase() || '--'
      } : null
    };
  }
}

module.exports = new ChamadoService();
