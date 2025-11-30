import express from 'express';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const db = new sqlite3.Database('./database/ivegan.db');
const JWT_SECRET = 'seu_segredo_super_secreto_aqui';

// Configurar Helmet com CSP personalizado para desenvolvimento
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    // Headers adicionais para arquivos estáticos
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
app.use(limiter);

// ===========================
// CONFIGURAÇÃO DE UPLOAD (MULTER)
// ===========================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public/uploads/profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Apenas imagens são permitidas!'));
  }
});

// ===========================
// MIDDLEWARE DE AUTENTICAÇÃO
// ===========================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  // Implementação simplificada: permitir se autenticado.
  // Em produção, verificar role do usuário no banco.
  if (req.user) {
    next();
  } else {
    res.status(403).json({ error: 'Acesso negado' });
  }
};

// ===========================
// SISTEMA DE LOGIN/REGISTRO
// ===========================

// Registrar novo usuário
app.post('/api/register', async (req, res) => {
  const { nome, email, telefone, endereco, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  try {
    // Verificar se usuário já existe
    db.get('SELECT id FROM usuarios WHERE email = ?', [email], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Erro no servidor' });
      }

      if (row) {
        return res.status(409).json({ error: 'Email já cadastrado' });
      }

      // Hash da senha
      const hashSenha = await bcrypt.hash(senha, 12);

      // Inserir novo usuário
      db.run(
        `INSERT INTO usuarios (nome, email, telefone, endereco, hash_senha, foto_perfil) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nome, email, telefone, endereco, hashSenha, '/img/default-profile.png'],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Erro ao criar usuário' });
          }

          // Gerar token JWT
          const token = jwt.sign(
            { id: this.lastID, email: email },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

          res.status(201).json({
            message: 'Usuário criado com sucesso',
            token,
            user: {
              id: this.lastID,
              nome,
              email,
              telefone,
              endereco,
              foto_perfil: '/img/default-profile.png'
            }
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Login
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  // Buscar usuário
  db.get(
    'SELECT * FROM usuarios WHERE email = ?',
    [email],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Erro no servidor' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Verificar senha
      const senhaValida = await bcrypt.compare(senha, user.hash_senha);
      if (!senhaValida) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Gerar token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login realizado com sucesso',
        token,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          telefone: user.telefone,
          endereco: user.endereco,
          foto_perfil: user.foto_perfil || '/img/default-profile.png'
        }
      });
    }
  );
});

// ===========================
// PERFIL DO USUÁRIO
// ===========================
app.get('/api/perfil', authenticateToken, (req, res) => {
  db.get(
    'SELECT id, nome, email, telefone, endereco, foto_perfil, data_criacao FROM usuarios WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) {
        console.error('Erro ao buscar perfil:', err);
        return res.status(500).json({ error: 'Erro no servidor' });
      }
      if (user) {
        user.foto_perfil = user.foto_perfil || '/img/default-profile.png';
      }
      res.json(user);
    }
  );
});

app.put('/api/perfil', authenticateToken, (req, res) => {
  const { nome, telefone, endereco } = req.body;
  const userId = req.user.id;

  db.run(
    'UPDATE usuarios SET nome = ?, telefone = ?, endereco = ? WHERE id = ?',
    [nome, telefone, endereco, userId],
    function (err) {
      if (err) {
        console.error('Erro ao atualizar perfil:', err);
        return res.status(500).json({ error: 'Erro ao atualizar perfil' });
      }
      res.json({ message: 'Perfil atualizado com sucesso' });
    }
  );
});

app.post('/api/perfil/foto', authenticateToken, upload.single('foto'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const userId = req.user.id;
  const fotoUrl = `/uploads/profiles/${req.file.filename}`;

  db.run(
    'UPDATE usuarios SET foto_perfil = ? WHERE id = ?',
    [fotoUrl, userId],
    function (err) {
      if (err) {
        console.error('Erro ao atualizar foto:', err);
        return res.status(500).json({ error: 'Erro ao atualizar foto de perfil' });
      }
      res.json({ message: 'Foto de perfil atualizada com sucesso', fotoUrl });
    }
  );
});

// ===========================
// ROTAS PÚBLICAS (APP CLIENTE)
// ===========================

// Listar restaurantes (público)
app.get('/api/public/restaurantes', (req, res) => {
  db.all(
    'SELECT id, nome_publico, categoria, avaliacao_media, endereco, telefone FROM restaurantes ORDER BY nome_publico',
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar restaurantes' });
      res.json(rows || []);
    }
  );
});

// Detalhes do restaurante (público)
app.get('/api/public/restaurantes/:id', (req, res) => {
  const { id } = req.params;
  db.get(
    'SELECT id, nome_publico, categoria, avaliacao_media, endereco, telefone FROM restaurantes WHERE id = ?',
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar restaurante' });
      if (!row) return res.status(404).json({ error: 'Restaurante não encontrado' });
      res.json(row);
    }
  );
});

// Listar pratos do restaurante (público)
app.get('/api/public/restaurantes/:id/pratos', (req, res) => {
  const { id } = req.params;
  db.all(
    `SELECT p.*, c.nome as categoria_nome
     FROM pratos p
     LEFT JOIN categorias_mercado c ON p.categoria_id = c.id
     WHERE p.restaurante_id = ?
     ORDER BY p.categoria_id, p.nome`,
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar pratos' });
      res.json(rows || []);
    }
  );
});

// Listar todos os produtos de mercado (público)
app.get('/api/public/mercado/produtos', (req, res) => {
  db.all(
    `SELECT p.*, r.nome_publico as restaurante_nome
     FROM pratos p
     JOIN restaurantes r ON p.restaurante_id = r.id
     WHERE r.categoria = 'mercado'
     ORDER BY p.nome`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar produtos de mercado' });
      res.json(rows || []);
    }
  );
});

// Manter rota antiga para compatibilidade com admin.js
app.get('/api/restaurantes/:id/pratos', (req, res) => {
  const { id } = req.params;
  db.all(
    `SELECT p.*, c.nome as categoria_nome 
     FROM pratos p 
     LEFT JOIN categorias_mercado c ON p.categoria_id = c.id 
     WHERE p.restaurante_id = ?
     ORDER BY p.nome`,
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar pratos' });
      res.json(rows || []);
    }
  );
});

// ===========================
// ROTAS DO CLIENTE (AUTENTICADAS)
// ===========================

// Criar novo pedido (Cliente)
app.post('/api/pedidos', authenticateToken, (req, res) => {
  const { restaurante_id, endereco_entrega, metodo_pagamento, itens, total } = req.body;
  const usuario_id = req.user.id; // Pega o ID do usuário do token

  // Validações
  if (!restaurante_id || !endereco_entrega || !metodo_pagamento || !itens || !total) {
    return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos' });
  }

  if (!Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: 'O pedido deve conter pelo menos um item' });
  }

  // Iniciar transação
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 1. Inserir o pedido
    db.run(
      `INSERT INTO pedidos (usuario_id, restaurante_id, endereco_entrega, status) 
       VALUES (?, ?, ?, 'em preparação')`,
      [usuario_id, restaurante_id, endereco_entrega],
      function (err) {
        if (err) {
          db.run('ROLLBACK');
          console.error('Erro ao criar pedido:', err);
          return res.status(500).json({ error: 'Erro ao criar pedido' });
        }

        const pedido_id = this.lastID;
        let itensProcessados = 0;

        // 2. Inserir itens do pedido
        itens.forEach(item => {
          db.run(
            `INSERT INTO itens_pedido (pedido_id, prato_id, quantidade, preco) 
             VALUES (?, ?, ?, ?)`,
            [pedido_id, item.prato_id, item.quantidade, item.preco],
            function (err) {
              if (err) {
                db.run('ROLLBACK');
                console.error('Erro ao adicionar item ao pedido:', err);
                return res.status(500).json({ error: 'Erro ao adicionar item ao pedido' });
              }

              itensProcessados++;

              // 3. Quando todos os itens forem processados, inserir pagamento
              if (itensProcessados === itens.length) {
                db.run(
                  `INSERT INTO pagamentos (pedido_id, valor, metodo, status) 
                   VALUES (?, ?, ?, 'pendente')`,
                  [pedido_id, total, metodo_pagamento],
                  function (err) {
                    if (err) {
                      db.run('ROLLBACK');
                      console.error('Erro ao processar pagamento:', err);
                      return res.status(500).json({ error: 'Erro ao processar pagamento' });
                    }

                    // Commit da transação
                    db.run('COMMIT', (err) => {
                      if (err) {
                        db.run('ROLLBACK');
                        console.error('Erro ao finalizar pedido:', err);
                        return res.status(500).json({ error: 'Erro ao finalizar pedido' });
                      }

                      res.status(201).json({
                        message: 'Pedido criado com sucesso',
                        pedido_id: pedido_id,
                        total: total
                      });
                    });
                  }
                );
              }
            }
          );
        });
      }
    );
  });
});

// Listar pedidos do usuário (autenticado)
app.get('/api/pedidos', authenticateToken, (req, res) => {
  const usuario_id = req.user.id;

  db.all(
    `SELECT p.id, p.data_criacao, p.status, p.endereco_entrega, 
            r.nome_publico as restaurante_nome,
            (SELECT SUM(valor) FROM pagamentos WHERE pedido_id = p.id) as total
     FROM pedidos p
     JOIN restaurantes r ON p.restaurante_id = r.id
     WHERE p.usuario_id = ?
     ORDER BY p.data_criacao DESC`,
    [usuario_id],
    (err, rows) => {
      if (err) {
        console.error('Erro ao buscar pedidos:', err);
        return res.status(500).json({ error: 'Erro ao buscar pedidos' });
      }
      res.json(rows || []);
    }
  );
});

// ===========================
// ROTAS DE ADMIN
// ===========================

// Estatísticas
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
  const stats = {};
  db.get('SELECT COUNT(*) as count FROM usuarios', (err, row) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    stats.totalUsuarios = row.count;

    // Contar restaurantes
    db.get('SELECT COUNT(*) as count FROM restaurantes', (err, row) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
      stats.totalRestaurantes = row.count;

      // Contar pedidos de hoje
      const hoje = new Date().toISOString().split('T')[0];
      db.get('SELECT COUNT(*) as count FROM pedidos WHERE DATE(data_criacao) = ?', [hoje], (err, row) => {
        if (err) stats.pedidosHoje = 0;
        else stats.pedidosHoje = row.count;

        // Contar entregadores
        db.get('SELECT COUNT(*) as count FROM entregadores', (err, row) => {
          if (err) stats.totalEntregadores = 0;
          else stats.totalEntregadores = row.count;

          // Contar pratos
          db.get('SELECT COUNT(*) as count FROM pratos', (err, row) => {
            if (err) stats.totalPratos = 0;
            else stats.totalPratos = row.count;

            // Receita total
            db.get('SELECT SUM(valor) as total FROM pagamentos WHERE status = "pago"', (err, row) => {
              if (err) stats.receitaTotal = 0;
              else stats.receitaTotal = row.total || 0;

              res.json(stats);
            });
          });
        });
      });
    });
  });
});

// ===== CRUD COMPLETO USUÁRIOS =====
app.get('/api/admin/usuarios', authenticateToken, requireAdmin, (req, res) => {
  db.all(
    'SELECT id, nome, email, telefone, endereco, data_criacao FROM usuarios ORDER BY id DESC',
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar usuários' });
      res.json(rows || []);
    }
  );
});

app.get('/api/admin/usuarios/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  db.get(
    'SELECT id, nome, email, telefone, endereco FROM usuarios WHERE id = ?',
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar usuário' });
      if (!row) return res.status(404).json({ error: 'Usuário não encontrado' });
      res.json(row);
    }
  );
});

app.post('/api/admin/usuarios', authenticateToken, requireAdmin, async (req, res) => {
  const { nome, email, telefone, endereco, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  try {
    db.get('SELECT id FROM usuarios WHERE email = ?', [email], async (err, row) => {
      if (err) return res.status(500).json({ error: 'Erro no servidor' });
      if (row) return res.status(409).json({ error: 'Email já cadastrado' });

      const hashSenha = await bcrypt.hash(senha, 12);

      db.run(
        'INSERT INTO usuarios (nome, email, telefone, endereco, hash_senha) VALUES (?, ?, ?, ?, ?)',
        [nome, email, telefone, endereco, hashSenha],
        function (err) {
          if (err) return res.status(500).json({ error: 'Erro ao criar usuário' });
          res.status(201).json({ message: 'Usuário criado com sucesso', id: this.lastID });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.put('/api/admin/usuarios/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { nome, email, telefone, endereco, senha } = req.body;

  let query = 'UPDATE usuarios SET nome = ?, email = ?, telefone = ?, endereco = ?';
  let params = [nome, email, telefone, endereco];

  if (senha) {
    const hashSenha = await bcrypt.hash(senha, 12);
    query += ', hash_senha = ?';
    params.push(hashSenha);
  }

  query += ' WHERE id = ?';
  params.push(id);

  db.run(query, params, function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao atualizar usuário' });
    if (this.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ message: 'Usuário atualizado com sucesso' });
  });
});

app.delete('/api/admin/usuarios/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM usuarios WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao excluir usuário' });
    if (this.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ message: 'Usuário excluído com sucesso' });
  });
});

// ===== CRUD COMPLETO RESTAURANTES =====
app.get('/api/admin/restaurantes', authenticateToken, requireAdmin, (req, res) => {
  db.all(
    'SELECT id, nome_publico, nome_legal, cnpj, telefone, endereco, categoria, avaliacao_media FROM restaurantes ORDER BY id DESC',
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar restaurantes' });
      res.json(rows || []);
    }
  );
});

app.get('/api/admin/restaurantes/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  db.get(
    'SELECT id, nome_publico, nome_legal, cnpj, telefone, endereco, categoria FROM restaurantes WHERE id = ?',
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar restaurante' });
      if (!row) return res.status(404).json({ error: 'Restaurante não encontrado' });
      res.json(row);
    }
  );
});

app.post('/api/admin/restaurantes', authenticateToken, requireAdmin, (req, res) => {
  const { nome_publico, nome_legal, cnpj, telefone, endereco, categoria } = req.body;

  if (!nome_publico || !nome_legal || !cnpj) {
    return res.status(400).json({ error: 'Nome público, nome legal e CNPJ são obrigatórios' });
  }

  db.run(
    'INSERT INTO restaurantes (nome_publico, nome_legal, cnpj, telefone, endereco, categoria) VALUES (?, ?, ?, ?, ?, ?)',
    [nome_publico, nome_legal, cnpj, telefone, endereco, categoria || 'restaurante'],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'CNPJ já cadastrado' });
        return res.status(500).json({ error: 'Erro ao criar restaurante' });
      }
      res.status(201).json({ message: 'Restaurante criado com sucesso', id: this.lastID });
    }
  );
});

app.put('/api/admin/restaurantes/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { nome_publico, nome_legal, cnpj, telefone, endereco, categoria } = req.body;

  db.run(
    'UPDATE restaurantes SET nome_publico = ?, nome_legal = ?, cnpj = ?, telefone = ?, endereco = ?, categoria = ? WHERE id = ?',
    [nome_publico, nome_legal, cnpj, telefone, endereco, categoria, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao atualizar restaurante' });
      if (this.changes === 0) return res.status(404).json({ error: 'Restaurante não encontrado' });
      res.json({ message: 'Restaurante atualizado com sucesso' });
    }
  );
});

app.delete('/api/admin/restaurantes/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM restaurantes WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao excluir restaurante' });
    if (this.changes === 0) return res.status(404).json({ error: 'Restaurante não encontrado' });
    res.json({ message: 'Restaurante excluído com sucesso' });
  });
});

// ===== CRUD COMPLETO PRATOS =====
app.get('/api/admin/pratos', authenticateToken, requireAdmin, (req, res) => {
  db.all(
    `SELECT p.*, r.nome_publico as restaurante_nome, c.nome as categoria_nome
     FROM pratos p 
     LEFT JOIN restaurantes r ON p.restaurante_id = r.id 
     LEFT JOIN categorias_mercado c ON p.categoria_id = c.id
     ORDER BY p.id DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar pratos' });
      res.json(rows || []);
    }
  );
});

app.get('/api/admin/pratos/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  db.get(
    'SELECT * FROM pratos WHERE id = ?',
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar prato' });
      if (!row) return res.status(404).json({ error: 'Prato não encontrado' });
      res.json(row);
    }
  );
});

app.post('/api/admin/pratos', authenticateToken, requireAdmin, (req, res) => {
  const { restaurante_id, categoria_id, nome, descricao, preco, tipo, url_imagem } = req.body;

  if (!restaurante_id || !nome || !preco || !tipo) {
    return res.status(400).json({ error: 'Restaurante, nome, preço e tipo são obrigatórios' });
  }

  db.run(
    'INSERT INTO pratos (restaurante_id, categoria_id, nome, descricao, preco, tipo, url_imagem) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [restaurante_id, categoria_id, nome, descricao, preco, tipo, url_imagem],
    function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao criar prato' });
      res.status(201).json({ message: 'Prato criado com sucesso', id: this.lastID });
    }
  );
});

app.put('/api/admin/pratos/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { restaurante_id, categoria_id, nome, descricao, preco, tipo, url_imagem } = req.body;

  db.run(
    'UPDATE pratos SET restaurante_id = ?, categoria_id = ?, nome = ?, descricao = ?, preco = ?, tipo = ?, url_imagem = ? WHERE id = ?',
    [restaurante_id, categoria_id, nome, descricao, preco, tipo, url_imagem, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao atualizar prato' });
      if (this.changes === 0) return res.status(404).json({ error: 'Prato não encontrado' });
      res.json({ message: 'Prato atualizado com sucesso' });
    }
  );
});

app.delete('/api/admin/pratos/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM pratos WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao excluir prato' });
    if (this.changes === 0) return res.status(404).json({ error: 'Prato não encontrado' });
    res.json({ message: 'Prato excluído com sucesso' });
  });
});

// ===== CRUD COMPLETO ENTREGADORES =====
app.get('/api/admin/entregadores', authenticateToken, requireAdmin, (req, res) => {
  db.all(
    'SELECT * FROM entregadores ORDER BY id DESC',
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar entregadores' });
      res.json(rows || []);
    }
  );
});

app.get('/api/admin/entregadores/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  db.get(
    'SELECT * FROM entregadores WHERE id = ?',
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar entregador' });
      if (!row) return res.status(404).json({ error: 'Entregador não encontrado' });
      res.json(row);
    }
  );
});

app.post('/api/admin/entregadores', authenticateToken, requireAdmin, (req, res) => {
  const { nome, cpf, tipo_veiculo, placa, status } = req.body;

  if (!nome || !cpf || !tipo_veiculo) {
    return res.status(400).json({ error: 'Nome, CPF e tipo de veículo são obrigatórios' });
  }

  db.run(
    'INSERT INTO entregadores (nome, cpf, tipo_veiculo, placa, status) VALUES (?, ?, ?, ?, ?)',
    [nome, cpf, tipo_veiculo, placa, status || 'disponivel'],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'CPF já cadastrado' });
        return res.status(500).json({ error: 'Erro ao criar entregador' });
      }
      res.status(201).json({ message: 'Entregador criado com sucesso', id: this.lastID });
    }
  );
});

app.put('/api/admin/entregadores/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { nome, cpf, tipo_veiculo, placa, status } = req.body;

  db.run(
    'UPDATE entregadores SET nome = ?, cpf = ?, tipo_veiculo = ?, placa = ?, status = ? WHERE id = ?',
    [nome, cpf, tipo_veiculo, placa, status, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao atualizar entregador' });
      if (this.changes === 0) return res.status(404).json({ error: 'Entregador não encontrado' });
      res.json({ message: 'Entregador atualizado com sucesso' });
    }
  );
});

app.delete('/api/admin/entregadores/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM entregadores WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao excluir entregador' });
    if (this.changes === 0) return res.status(404).json({ error: 'Entregador não encontrado' });
    res.json({ message: 'Entregador excluído com sucesso' });
  });
});

// ===== CRUD COMPLETO PEDIDOS =====
app.get('/api/admin/pedidos', authenticateToken, requireAdmin, (req, res) => {
  db.all(
    `SELECT p.id, p.data_criacao, p.status, p.endereco_entrega, 
            u.nome as usuario_nome, r.nome_publico as restaurante_nome,
            (SELECT SUM(valor) FROM pagamentos WHERE pedido_id = p.id) as total
     FROM pedidos p
     JOIN usuarios u ON p.usuario_id = u.id
     JOIN restaurantes r ON p.restaurante_id = r.id
     ORDER BY p.data_criacao DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar pedidos' });
      res.json(rows || []);
    }
  );
});

app.get('/api/admin/pedidos/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  db.get(
    `SELECT p.*, u.nome as usuario_nome, u.telefone as usuario_telefone, 
            r.nome_publico as restaurante_nome
     FROM pedidos p
     JOIN usuarios u ON p.usuario_id = u.id
     JOIN restaurantes r ON p.restaurante_id = r.id
     WHERE p.id = ?`,
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar pedido' });
      if (!row) return res.status(404).json({ error: 'Pedido não encontrado' });
      res.json(row);
    }
  );
});

app.get('/api/admin/pedidos/:id/itens', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  db.all(
    `SELECT ip.*, pr.nome as prato_nome
     FROM itens_pedido ip
     JOIN pratos pr ON ip.prato_id = pr.id
     WHERE ip.pedido_id = ?`,
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar itens do pedido' });
      res.json(rows || []);
    }
  );
});

app.put('/api/admin/pedidos/:id/status', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status é obrigatório' });
  }

  db.run(
    'UPDATE pedidos SET status = ? WHERE id = ?',
    [status, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao atualizar pedido' });
      if (this.changes === 0) return res.status(404).json({ error: 'Pedido não encontrado' });
      res.json({ message: 'Status do pedido atualizado com sucesso' });
    }
  );
});

app.put('/api/admin/pedidos/:id/entregador', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { entregador_id } = req.body;

  db.run(
    'UPDATE pedidos SET entregador_id = ? WHERE id = ?',
    [entregador_id, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao atribuir entregador' });
      if (this.changes === 0) return res.status(404).json({ error: 'Pedido não encontrado' });
      res.json({ message: 'Entregador atribuído com sucesso' });
    }
  );
});

// ===== AVALIAÇÕES =====
app.get('/api/admin/avaliacoes', authenticateToken, requireAdmin, (req, res) => {
  db.all(
    `SELECT a.*, u.nome as usuario_nome, r.nome_publico as restaurante_nome
     FROM avaliacoes a
     JOIN usuarios u ON a.usuario_id = u.id
     JOIN restaurantes r ON a.restaurante_id = r.id
     ORDER BY a.id DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar avaliações' });
      res.json(rows || []);
    }
  );
});

app.delete('/api/admin/avaliacoes/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM avaliacoes WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao excluir avaliação' });
    if (this.changes === 0) return res.status(404).json({ error: 'Avaliação não encontrada' });
    res.json({ message: 'Avaliação excluída com sucesso' });
  });
});

// Rota para servir a página admin
app.get('/admin.html', (req, res) => {
  res.sendFile(process.cwd() + '/public/admin.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iVegan rodando na porta ${PORT}`);
});