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

// Listar investimentos
router.get('/', async (req, res) => {
  try {
    const { account_id } = req.query;
    
    let query = `
      SELECT i.*
      FROM investment_assets i
      INNER JOIN account_members am ON i.account_id = am.account_id
      WHERE am.user_id = $1 
        AND am.status = 'accepted'
    `;
    
    const params = [req.userId];
    
    if (account_id && account_id !== 'all') {
      query += ' AND i.account_id = $2';
      params.push(account_id);
    }
    
    query += ' ORDER BY i.created_at DESC';
    
    const result = await db.query(query, params);
    
    // Calcular saldo atual (quantity * current_price)
    const investments = result.rows.map(inv => ({
      ...inv,
      balance: inv.quantity && inv.current_price 
        ? parseFloat(inv.quantity) * parseFloat(inv.current_price)
        : 0
    }));
    
    res.json({ investments });
  } catch (error) {
    console.error('Erro ao listar investimentos:', error);
    res.status(500).json({ error: 'Erro ao listar investimentos' });
  }
});

// Criar investimento
router.post('/',
  [
    body('account_id').isUUID(),
    body('name').trim().notEmpty(),
    body('type').isIn(['renda_fixa', 'fundo', 'acao', 'outro']),
    body('quantity').optional().isNumeric(),
    body('purchase_price').optional().isNumeric(),
    body('current_price').optional().isNumeric(),
    body('ticker').optional().trim()
  ],
  validate,
  async (req, res) => {
    try {
      const { 
        account_id, 
        name,
        type,
        ticker,
        quantity,
        purchase_price,
        current_price,
        purchase_date,
        notes
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
        return res.status(403).json({ error: 'Sem permissão para criar investimento' });
      }
      
      const result = await db.query(
        `INSERT INTO investment_assets 
         (account_id, name, type, ticker, quantity, purchase_price, current_price, purchase_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [account_id, name, type, ticker, quantity, purchase_price, current_price, purchase_date, notes]
      );
      
      res.status(201).json({
        message: 'Investimento criado com sucesso',
        investment: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao criar investimento:', error);
      res.status(500).json({ error: 'Erro ao criar investimento' });
    }
  }
);

// Atualizar investimento
router.put('/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('quantity').optional().isNumeric(),
    body('current_price').optional().isNumeric()
  ],
  validate,
  async (req, res) => {
    try {
      // Verificar permissão
      const investmentCheck = await db.query(
        `SELECT i.account_id 
         FROM investment_assets i
         INNER JOIN account_members am ON i.account_id = am.account_id
         WHERE i.id = $1 AND am.user_id = $2 AND am.status = 'accepted'`,
        [req.params.id, req.userId]
      );
      
      if (investmentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Investimento não encontrado' });
      }
      
      const updates = [];
      const values = [];
      let valueIndex = 1;
      
      const allowedFields = ['name', 'ticker', 'quantity', 'purchase_price', 'current_price', 'purchase_date', 'notes'];
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
        `UPDATE investment_assets 
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${valueIndex}
         RETURNING *`,
        values
      );
      
      res.json({
        message: 'Investimento atualizado com sucesso',
        investment: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao atualizar investimento:', error);
      res.status(500).json({ error: 'Erro ao atualizar investimento' });
    }
  }
);

// Deletar investimento
router.delete('/:id', async (req, res) => {
  try {
    const investmentCheck = await db.query(
      `SELECT i.account_id 
       FROM investment_assets i
       INNER JOIN account_members am ON i.account_id = am.account_id
       WHERE i.id = $1 AND am.user_id = $2 AND am.status = 'accepted'`,
      [req.params.id, req.userId]
    );
    
    if (investmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Investimento não encontrado' });
    }
    
    await db.query('DELETE FROM investment_assets WHERE id = $1', [req.params.id]);
    
    res.json({ message: 'Investimento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir investimento:', error);
    res.status(500).json({ error: 'Erro ao excluir investimento' });
  }
});

module.exports = router;
