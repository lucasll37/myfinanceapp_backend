const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

// Middleware de validação de erros
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Registro de usuário
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('full_name').trim().notEmpty()
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password, full_name } = req.body;

      // Verificar se usuário já existe
      const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Email já cadastrado' });
      }

      // Hash da senha
      const password_hash = await bcrypt.hash(password, 10);

      // Inserir usuário
      const result = await db.query(
        `INSERT INTO users (email, password_hash, full_name) 
         VALUES ($1, $2, $3) 
         RETURNING id, email, full_name, created_at`,
        [email, password_hash, full_name]
      );

      const user = result.rows[0];

      // Criar preferências padrão
      await db.query(
        'INSERT INTO user_preferences (user_id) VALUES ($1)',
        [user.id]
      );

      // Criar subscription padrão
      await db.query(
        'INSERT INTO subscriptions (user_id, plan, status) VALUES ($1, $2, $3)',
        [user.id, 'free', 'active']
      );

      // Gerar token JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'Usuário criado com sucesso',
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name
        },
        token
      });
    } catch (error) {
      console.error('Erro no registro:', error);
      res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  }
);

// Login
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Buscar usuário
      const result = await db.query(
        `SELECT id, email, password_hash, full_name, is_active 
         FROM users WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Email ou senha inválidos' });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return res.status(403).json({ error: 'Conta desativada' });
      }

      // Verificar senha
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Email ou senha inválidos' });
      }

      // Atualizar last_login
      await db.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );

      // Gerar token JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login realizado com sucesso',
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name
        },
        token
      });
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({ error: 'Erro ao fazer login' });
    }
  }
);

// Middleware de autenticação (exportado para uso em outras rotas)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  });
};

// Obter perfil do usuário autenticado
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.full_name, u.avatar_url, u.created_at,
              up.language, up.theme, up.currency, up.notifications_enabled,
              s.plan, s.status
       FROM users u
       LEFT JOIN user_preferences up ON u.id = up.user_id
       LEFT JOIN subscriptions s ON u.id = s.user_id
       WHERE u.id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;
