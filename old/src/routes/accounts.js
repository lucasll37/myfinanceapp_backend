const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('./auth');

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Validação
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Listar todas as contas do usuário
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, am.role
       FROM accounts a
       INNER JOIN account_members am ON a.id = am.account_id
       WHERE am.user_id = $1 
         AND am.status = 'accepted'
         AND a.deleted_at IS NULL
       ORDER BY a.created_at DESC`,
      [req.userId]
    );

    res.json({ accounts: result.rows });
  } catch (error) {
    console.error('Erro ao listar contas:', error);
    res.status(500).json({ error: 'Erro ao listar contas' });
  }
});

// Criar nova conta
router.post('/',
  [
    body('name').trim().notEmpty(),
    body('type').isIn(['pessoal', 'casa', 'empresa', 'conjugal', 'outro']),
    body('initial_balance').optional().isNumeric(),
    body('currency').optional().isLength({ min: 3, max: 3 })
  ],
  validate,
  async (req, res) => {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const { name, type, initial_balance = 0, currency = 'BRL', color, icon } = req.body;

      // Criar conta
      const accountResult = await client.query(
        `INSERT INTO accounts (name, type, initial_balance, current_balance, currency, color, icon)
         VALUES ($1, $2, $3, $3, $4, $5, $6)
         RETURNING *`,
        [name, type, initial_balance, currency, color, icon]
      );

      const account = accountResult.rows[0];

      // Adicionar usuário como owner
      await client.query(
        `INSERT INTO account_members (account_id, user_id, role, status)
         VALUES ($1, $2, 'owner', 'accepted')`,
        [account.id, req.userId]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Conta criada com sucesso',
        account
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao criar conta:', error);
      res.status(500).json({ error: 'Erro ao criar conta' });
    } finally {
      client.release();
    }
  }
);

// Obter detalhes de uma conta
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, am.role
       FROM accounts a
       INNER JOIN account_members am ON a.id = am.account_id
       WHERE a.id = $1 
         AND am.user_id = $2
         AND am.status = 'accepted'
         AND a.deleted_at IS NULL`,
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    res.json({ account: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar conta:', error);
    res.status(500).json({ error: 'Erro ao buscar conta' });
  }
});

// Atualizar conta
router.put('/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('type').optional().isIn(['pessoal', 'casa', 'empresa', 'conjugal', 'outro']),
    body('currency').optional().isLength({ min: 3, max: 3 })
  ],
  validate,
  async (req, res) => {
    try {
      // Verificar permissão
      const permCheck = await db.query(
        `SELECT role FROM account_members 
         WHERE account_id = $1 AND user_id = $2 AND status = 'accepted'`,
        [req.params.id, req.userId]
      );

      if (permCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Conta não encontrada' });
      }

      if (permCheck.rows[0].role === 'viewer') {
        return res.status(403).json({ error: 'Sem permissão para editar' });
      }

      const updates = [];
      const values = [];
      let valueIndex = 1;

      const allowedFields = ['name', 'type', 'currency', 'color', 'icon', 'is_active'];
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = $${valueIndex++}`);
          values.push(req.body[field]);
        }
      });

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
      }

      values.push(req.params.id);

      const result = await db.query(
        `UPDATE accounts 
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${valueIndex}
         RETURNING *`,
        values
      );

      res.json({
        message: 'Conta atualizada com sucesso',
        account: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      res.status(500).json({ error: 'Erro ao atualizar conta' });
    }
  }
);

// Deletar conta (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    // Verificar se é owner
    const permCheck = await db.query(
      `SELECT role FROM account_members 
       WHERE account_id = $1 AND user_id = $2 AND status = 'accepted'`,
      [req.params.id, req.userId]
    );

    if (permCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    if (permCheck.rows[0].role !== 'owner') {
      return res.status(403).json({ error: 'Apenas o dono pode deletar a conta' });
    }

    await db.query(
      'UPDATE accounts SET deleted_at = NOW() WHERE id = $1',
      [req.params.id]
    );

    res.json({ message: 'Conta deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar conta:', error);
    res.status(500).json({ error: 'Erro ao deletar conta' });
  }
});

module.exports = router;
