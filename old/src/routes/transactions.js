const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('./auth');

router.use(authenticateToken);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Listar transações
router.get('/', async (req, res) => {
  try {
    const { account_id } = req.query;
    
    let query = `
      SELECT t.*, 
             c.name as category_name, 
             c.type as category_type, 
             c.color as category_color,
             a.name as account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      INNER JOIN accounts a ON t.account_id = a.id
      INNER JOIN account_members am ON t.account_id = am.account_id
      WHERE am.user_id = $1 
        AND am.status = 'accepted'
    `;
    
    const params = [req.userId];
    
    if (account_id && account_id !== 'all') {
      query += ' AND t.account_id = $2';
      params.push(account_id);
    }
    
    query += ' ORDER BY t.date DESC, t.created_at DESC';
    
    const result = await db.query(query, params);
    
    // Formatar resposta para incluir objeto categories
    const transactions = result.rows.map(t => ({
      ...t,
      categories: t.category_name ? {
        name: t.category_name,
        type: t.category_type,
        color: t.category_color
      } : null
    }));
    
    res.json({ transactions });
  } catch (error) {
    console.error('Erro ao listar transações:', error);
    res.status(500).json({ error: 'Erro ao listar transações' });
  }
});

// Criar transação
router.post('/',
  [
    body('account_id').isUUID(),
    body('date').isISO8601(),
    body('description').trim().notEmpty(),
    body('amount').isNumeric(),
    body('category_id').optional().isUUID(),
    body('payment_method').optional().trim(),
    body('notes').optional().trim(),
    body('is_recurring').optional().isBoolean()
  ],
  validate,
  async (req, res) => {
    try {
      const { 
        account_id, 
        date, 
        description, 
        amount, 
        category_id,
        payment_method,
        notes,
        tags,
        is_recurring
      } = req.body;
      
      // Verificar permissão
      const permCheck = await db.query(
        `SELECT role FROM account_members 
         WHERE account_id = $1 AND user_id = $2 AND status = 'accepted'`,
        [account_id, req.userId]
      );
      
      if (permCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Sem permissão' });
      }
      
      if (permCheck.rows[0].role === 'viewer') {
        return res.status(403).json({ error: 'Sem permissão para criar transação' });
      }
      
      // Determinar tipo baseado no valor
      const type = parseFloat(amount) >= 0 ? 'receita' : 'despesa';
      
      const result = await db.query(
        `INSERT INTO transactions 
         (account_id, date, description, amount, type, category_id, payment_method, notes, tags, is_recurring, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [account_id, date, description, amount, type, category_id, payment_method, notes, tags, is_recurring, req.userId]
      );
      
      res.status(201).json({
        message: 'Transação criada com sucesso',
        transaction: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      res.status(500).json({ error: 'Erro ao criar transação' });
    }
  }
);

// Atualizar transação
router.put('/:id',
  [
    body('date').optional().isISO8601(),
    body('description').optional().trim().notEmpty(),
    body('amount').optional().isNumeric(),
    body('category_id').optional().isUUID()
  ],
  validate,
  async (req, res) => {
    try {
      // Verificar se transação existe e foi criada pelo usuário
      const transactionCheck = await db.query(
        'SELECT * FROM transactions WHERE id = $1 AND created_by = $2',
        [req.params.id, req.userId]
      );
      
      if (transactionCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Transação não encontrada' });
      }
      
      const updates = [];
      const values = [];
      let valueIndex = 1;
      
      const allowedFields = ['date', 'description', 'amount', 'category_id', 'payment_method', 'notes', 'tags'];
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = $${valueIndex++}`);
          values.push(req.body[field]);
        }
      });
      
      // Atualizar tipo se amount foi alterado
      if (req.body.amount !== undefined) {
        const type = parseFloat(req.body.amount) >= 0 ? 'receita' : 'despesa';
        updates.push(`type = $${valueIndex++}`);
        values.push(type);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
      }
      
      values.push(req.params.id);
      
      const result = await db.query(
        `UPDATE transactions 
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${valueIndex}
         RETURNING *`,
        values
      );
      
      res.json({
        message: 'Transação atualizada com sucesso',
        transaction: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
      res.status(500).json({ error: 'Erro ao atualizar transação' });
    }
  }
);

// Deletar transação
router.delete('/:id', async (req, res) => {
  try {
    // Verificar se transação existe e foi criada pelo usuário
    const transactionCheck = await db.query(
      'SELECT * FROM transactions WHERE id = $1 AND created_by = $2',
      [req.params.id, req.userId]
    );
    
    if (transactionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }
    
    await db.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
    
    res.json({ message: 'Transação excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir transação:', error);
    res.status(500).json({ error: 'Erro ao excluir transação' });
  }
});

module.exports = router;
