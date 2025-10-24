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

// Listar orçamentos
router.get('/', async (req, res) => {
  try {
    const { account_id, period } = req.query;
    
    let query = `
      SELECT b.*, 
             c.name as category_name,
             c.type as category_type,
             c.color as category_color
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      INNER JOIN account_members am ON b.account_id = am.account_id
      WHERE am.user_id = $1 
        AND am.status = 'accepted'
        AND b.is_active = true
    `;
    
    const params = [req.userId];
    let paramIndex = 2;
    
    if (account_id && account_id !== 'all') {
      query += ` AND b.account_id = $${paramIndex++}`;
      params.push(account_id);
    }
    
    if (period) {
      query += ` AND b.period = $${paramIndex++}`;
      params.push(period);
    }
    
    query += ' ORDER BY b.created_at DESC';
    
    const result = await db.query(query, params);
    
    // Formatar resposta
    const budgets = result.rows.map(b => ({
      ...b,
      categories: b.category_name ? {
        name: b.category_name,
        type: b.category_type,
        color: b.category_color
      } : null
    }));
    
    res.json({ budgets });
  } catch (error) {
    console.error('Erro ao listar orçamentos:', error);
    res.status(500).json({ error: 'Erro ao listar orçamentos' });
  }
});

// Criar orçamento
router.post('/',
  [
    body('account_id').isUUID(),
    body('name').trim().notEmpty(),
    body('amount').isNumeric(),
    body('period').isIn(['monthly', 'yearly']),
    body('start_date').isISO8601(),
    body('category_id').optional().isUUID(),
    body('alert_threshold').optional().isInt({ min: 0, max: 100 })
  ],
  validate,
  async (req, res) => {
    try {
      const { 
        account_id, 
        category_id,
        name,
        amount,
        period,
        start_date,
        end_date,
        alert_threshold
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
        return res.status(403).json({ error: 'Sem permissão para criar orçamento' });
      }
      
      const result = await db.query(
        `INSERT INTO budgets 
         (account_id, category_id, name, amount, period, start_date, end_date, alert_threshold)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [account_id, category_id, name, amount, period, start_date, end_date, alert_threshold]
      );
      
      res.status(201).json({
        message: 'Orçamento criado com sucesso',
        budget: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao criar orçamento:', error);
      res.status(500).json({ error: 'Erro ao criar orçamento' });
    }
  }
);

// Atualizar orçamento
router.put('/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('amount').optional().isNumeric(),
    body('alert_threshold').optional().isInt({ min: 0, max: 100 }),
    body('is_active').optional().isBoolean()
  ],
  validate,
  async (req, res) => {
    try {
      // Verificar permissão
      const budgetCheck = await db.query(
        `SELECT b.account_id 
         FROM budgets b
         INNER JOIN account_members am ON b.account_id = am.account_id
         WHERE b.id = $1 AND am.user_id = $2 AND am.status = 'accepted'`,
        [req.params.id, req.userId]
      );
      
      if (budgetCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Orçamento não encontrado' });
      }
      
      const updates = [];
      const values = [];
      let valueIndex = 1;
      
      const allowedFields = ['name', 'amount', 'alert_threshold', 'end_date', 'is_active'];
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
        `UPDATE budgets 
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${valueIndex}
         RETURNING *`,
        values
      );
      
      res.json({
        message: 'Orçamento atualizado com sucesso',
        budget: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao atualizar orçamento:', error);
      res.status(500).json({ error: 'Erro ao atualizar orçamento' });
    }
  }
);

// Deletar orçamento
router.delete('/:id', async (req, res) => {
  try {
    const budgetCheck = await db.query(
      `SELECT b.account_id 
       FROM budgets b
       INNER JOIN account_members am ON b.account_id = am.account_id
       WHERE b.id = $1 AND am.user_id = $2 AND am.status = 'accepted'`,
      [req.params.id, req.userId]
    );
    
    if (budgetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }
    
    await db.query('DELETE FROM budgets WHERE id = $1', [req.params.id]);
    
    res.json({ message: 'Orçamento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir orçamento:', error);
    res.status(500).json({ error: 'Erro ao excluir orçamento' });
  }
});

module.exports = router;
