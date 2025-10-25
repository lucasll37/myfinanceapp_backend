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

// Listar categorias
router.get('/', async (req, res) => {
  try {
    const { account_id } = req.query;
    
    let query = `
      SELECT c.* 
      FROM categories c
      INNER JOIN account_members am ON c.account_id = am.account_id
      WHERE am.user_id = $1 
        AND am.status = 'accepted'
        AND c.is_active = true
    `;
    
    const params = [req.userId];
    
    if (account_id && account_id !== 'all') {
      query += ' AND c.account_id = $2';
      params.push(account_id);
    }
    
    query += ' ORDER BY c.name ASC';
    
    const result = await db.query(query, params);
    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    res.status(500).json({ error: 'Erro ao listar categorias' });
  }
});

// Criar categoria
router.post('/',
  [
    body('account_id').isUUID(),
    body('name').trim().notEmpty(),
    body('type').isIn(['despesa', 'receita']),
    body('color').optional().matches(/^#[0-9A-F]{6}$/i),
    body('parent_id').optional().isUUID()
  ],
  validate,
  async (req, res) => {
    try {
      const { account_id, name, type, color, icon, parent_id } = req.body;
      
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
        return res.status(403).json({ error: 'Sem permissão para criar categoria' });
      }
      
      const result = await db.query(
        `INSERT INTO categories (account_id, name, type, color, icon, parent_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [account_id, name, type, color, icon, parent_id]
      );
      
      res.status(201).json({
        message: 'Categoria criada com sucesso',
        category: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      res.status(500).json({ error: 'Erro ao criar categoria' });
    }
  }
);

// Atualizar categoria
router.put('/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('color').optional().matches(/^#[0-9A-F]{6}$/i),
    body('is_active').optional().isBoolean()
  ],
  validate,
  async (req, res) => {
    try {
      // Verificar se categoria existe e usuário tem permissão
      const categoryCheck = await db.query(
        `SELECT c.account_id 
         FROM categories c
         INNER JOIN account_members am ON c.account_id = am.account_id
         WHERE c.id = $1 AND am.user_id = $2 AND am.status = 'accepted'`,
        [req.params.id, req.userId]
      );
      
      if (categoryCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Categoria não encontrada' });
      }
      
      const updates = [];
      const values = [];
      let valueIndex = 1;
      
      const allowedFields = ['name', 'color', 'icon', 'is_active'];
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
        `UPDATE categories 
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${valueIndex}
         RETURNING *`,
        values
      );
      
      res.json({
        message: 'Categoria atualizada com sucesso',
        category: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      res.status(500).json({ error: 'Erro ao atualizar categoria' });
    }
  }
);

// Deletar categoria
router.delete('/:id', async (req, res) => {
  try {
    // Verificar se categoria tem transações
    const transactionCheck = await db.query(
      'SELECT COUNT(*) as count FROM transactions WHERE category_id = $1',
      [req.params.id]
    );
    
    if (parseInt(transactionCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir categoria com transações vinculadas' 
      });
    }
    
    // Verificar permissão
    const categoryCheck = await db.query(
      `SELECT c.account_id 
       FROM categories c
       INNER JOIN account_members am ON c.account_id = am.account_id
       WHERE c.id = $1 AND am.user_id = $2 AND am.status = 'accepted'`,
      [req.params.id, req.userId]
    );
    
    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }
    
    await db.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    
    res.json({ message: 'Categoria excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    res.status(500).json({ error: 'Erro ao excluir categoria' });
  }
});

module.exports = router;
