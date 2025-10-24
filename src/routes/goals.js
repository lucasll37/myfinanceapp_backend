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

// Listar metas
router.get('/', async (req, res) => {
  try {
    const { account_id } = req.query;
    
    let query = `
      SELECT g.*
      FROM goals g
      INNER JOIN account_members am ON g.account_id = am.account_id
      WHERE am.user_id = $1 
        AND am.status = 'accepted'
    `;
    
    const params = [req.userId];
    
    if (account_id && account_id !== 'all') {
      query += ' AND g.account_id = $2';
      params.push(account_id);
    }
    
    query += ' ORDER BY g.is_achieved ASC, g.target_date ASC, g.created_at DESC';
    
    const result = await db.query(query, params);
    res.json({ goals: result.rows });
  } catch (error) {
    console.error('Erro ao listar metas:', error);
    res.status(500).json({ error: 'Erro ao listar metas' });
  }
});

// Criar meta
router.post('/',
  [
    body('account_id').isUUID(),
    body('name').trim().notEmpty(),
    body('target_amount').isNumeric(),
    body('current_amount').optional().isNumeric(),
    body('target_date').optional().isISO8601(),
    body('description').optional().trim()
  ],
  validate,
  async (req, res) => {
    try {
      const { 
        account_id, 
        name,
        description,
        target_amount,
        current_amount = 0,
        target_date
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
        return res.status(403).json({ error: 'Sem permissão para criar meta' });
      }
      
      const result = await db.query(
        `INSERT INTO goals 
         (account_id, name, description, target_amount, current_amount, target_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [account_id, name, description, target_amount, current_amount, target_date]
      );
      
      res.status(201).json({
        message: 'Meta criada com sucesso',
        goal: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao criar meta:', error);
      res.status(500).json({ error: 'Erro ao criar meta' });
    }
  }
);

// Atualizar meta
router.put('/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('target_amount').optional().isNumeric(),
    body('current_amount').optional().isNumeric(),
    body('target_date').optional().isISO8601(),
    body('is_achieved').optional().isBoolean()
  ],
  validate,
  async (req, res) => {
    try {
      // Verificar permissão
      const goalCheck = await db.query(
        `SELECT g.account_id 
         FROM goals g
         INNER JOIN account_members am ON g.account_id = am.account_id
         WHERE g.id = $1 AND am.user_id = $2 AND am.status = 'accepted'`,
        [req.params.id, req.userId]
      );
      
      if (goalCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Meta não encontrada' });
      }
      
      const updates = [];
      const values = [];
      let valueIndex = 1;
      
      const allowedFields = ['name', 'description', 'target_amount', 'current_amount', 'target_date', 'is_achieved'];
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
        `UPDATE goals 
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${valueIndex}
         RETURNING *`,
        values
      );
      
      res.json({
        message: 'Meta atualizada com sucesso',
        goal: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao atualizar meta:', error);
      res.status(500).json({ error: 'Erro ao atualizar meta' });
    }
  }
);

// Deletar meta
router.delete('/:id', async (req, res) => {
  try {
    const goalCheck = await db.query(
      `SELECT g.account_id 
       FROM goals g
       INNER JOIN account_members am ON g.account_id = am.account_id
       WHERE g.id = $1 AND am.user_id = $2 AND am.status = 'accepted'`,
      [req.params.id, req.userId]
    );
    
    if (goalCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }
    
    await db.query('DELETE FROM goals WHERE id = $1', [req.params.id]);
    
    res.json({ message: 'Meta excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir meta:', error);
    res.status(500).json({ error: 'Erro ao excluir meta' });
  }
});

module.exports = router;
