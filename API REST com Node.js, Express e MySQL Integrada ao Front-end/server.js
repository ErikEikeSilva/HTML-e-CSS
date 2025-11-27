// server.js
const express = require('express');
const cors = require('cors');
const { pool, testConnection } = require('./config/db');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static('.')); // Servir arquivos estáticos

// Middleware de logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// --- VALIDAÇÕES ---
const validarEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validarUsuario = (nome, email) => {
    const errors = [];
    
    if (!nome || nome.trim().length < 2) {
        errors.push('Nome deve ter pelo menos 2 caracteres');
    }
    
    if (!email || !validarEmail(email)) {
        errors.push('Email deve ser válido');
    }
    
    return errors;
};

// --- ROTAS DA API ---

// Health Check da API e Database
app.get('/health', async (req, res) => {
    try {
        const dbStatus = await testConnection();
        res.json({
            status: 'OK',
            message: 'API está funcionando',
            database: dbStatus ? 'Conectado' : 'Desconectado',
            timestamp: new Date().toISOString(),
            uptime: `${process.uptime().toFixed(2)}s`,
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.status(503).json({
            status: 'ERROR',
            message: 'Problema na API',
            error: error.message
        });
    }
});

// Rota GET - Listar todos os usuários
app.get('/usuarios', async (req, res) => {
    console.log('GET /usuarios - Buscando todos os usuários');
    
    try {
        const [results] = await pool.query('SELECT * FROM usuarios ORDER BY id DESC');
        
        res.json({
            success: true,
            message: "Lista de usuários recuperada com sucesso",
            data: results,
            total: results.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Erro no GET /usuarios:", error);
        res.status(500).json({ 
            success: false,
            message: "Erro interno do servidor", 
            error: error.message 
        });
    }
});

// Rota GET - Buscar usuário por ID
app.get('/usuarios/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ 
            success: false,
            message: "ID deve ser um número válido", 
        });
    }
    
    console.log(`GET /usuarios/${id} - Buscando usuário específico`);
    
    try {
        const [results] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);
        
        if (results.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: "Usuário não encontrado" 
            });
        }
        
        res.json({
            success: true,
            message: "Usuário encontrado com sucesso",
            data: results[0]
        });
    } catch (error) {
        console.error(`Erro no GET /usuarios/${id}:`, error);
        res.status(500).json({ 
            success: false,
            message: "Erro interno do servidor", 
            error: error.message 
        });
    }
});

// Rota POST - Criar novo usuário
app.post('/usuarios', async (req, res) => {
    console.log('POST /usuarios - Criando novo usuário');
    const { nome, email } = req.body;

    // Validações
    const errors = validarUsuario(nome, email);
    if (errors.length > 0) {
        return res.status(400).json({ 
            success: false,
            message: "Dados inválidos", 
            errors: errors 
        });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO usuarios (nome, email) VALUES (?, ?)', 
            [nome.trim(), email.trim().toLowerCase()]
        );

        const novoUsuario = { 
            id: result.insertId, 
            nome: nome.trim(), 
            email: email.trim().toLowerCase() 
        };

        res.status(201).json({ 
            success: true,
            message: 'Usuário criado com sucesso', 
            data: novoUsuario 
        });
    } catch (error) {
        console.error("Erro no POST /usuarios:", error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ 
                success: false,
                message: 'Email já cadastrado' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: "Erro interno do servidor", 
            error: error.message 
        });
    }
});

// Rota PUT - Atualizar usuário
app.put('/usuarios/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ 
            success: false,
            message: "ID deve ser um número válido" 
        });
    }
    
    console.log(`PUT /usuarios/${id} - Atualizando usuário`);
    
    const { nome, email } = req.body;
    
    // Validações
    const errors = validarUsuario(nome, email);
    if (errors.length > 0) {
        return res.status(400).json({ 
            success: false,
            message: "Dados inválidos", 
            errors: errors 
        });
    }
    
    try {
        // Verificar se usuário existe
        const [existingUser] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);
        if (existingUser.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: "Usuário não encontrado" 
            });
        }

        const [result] = await pool.query(
            'UPDATE usuarios SET nome = ?, email = ? WHERE id = ?',
            [nome.trim(), email.trim().toLowerCase(), id]
        );
        
        const usuarioAtualizado = { 
            id, 
            nome: nome.trim(), 
            email: email.trim().toLowerCase() 
        };
        
        res.json({
            success: true,
            message: "Usuário atualizado com sucesso",
            data: usuarioAtualizado
        });
    } catch (error) {
        console.error(`Erro no PUT /usuarios/${id}:`, error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ 
                success: false,
                message: 'Email já está em uso por outro usuário' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: "Erro interno do servidor", 
            error: error.message 
        });
    }
});

// Rota DELETE - Remover usuário
app.delete('/usuarios/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ 
            success: false,
            message: "ID deve ser um número válido" 
        });
    }
    
    console.log(`DELETE /usuarios/${id} - Removendo usuário`);
    
    try {
        // Buscar usuário antes de deletar
        const [usuarioBuscado] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);
        
        if (usuarioBuscado.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: "Usuário não encontrado" 
            });
        }
        
        // Remover usuário
        await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: "Usuário removido com sucesso",
            data: usuarioBuscado[0]
        });
    } catch (error) {
        console.error(`Erro no DELETE /usuarios/${id}:`, error);
        res.status(500).json({ 
            success: false,
            message: "Erro interno do servidor", 
            error: error.message 
        });
    }
});

// Rota raiz - Info da API
app.get('/', (req, res) => {
    res.json({
        message: "🚀 API RESTful de Usuários - Node.js + Express + MySQL",
        version: "2.0.0",
        timestamp: new Date().toISOString(),
        endpoints: {
            health: "/health",
            listUsers: "GET /usuarios",
            getUser: "GET /usuarios/:id",
            createUser: "POST /usuarios",
            updateUser: "PUT /usuarios/:id",
            deleteUser: "DELETE /usuarios/:id"
        },
        documentation: "Acesse /index.html para interface web"
    });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: "Rota não encontrada",
        path: req.originalUrl
    });
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
    console.error('Erro não tratado:', error);
    res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
        error: process.env.NODE_ENV === 'development' ? error.message : 'Algo deu errado'
    });
});

// Iniciar servidor
app.listen(PORT, async () => {
    console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📊 Health Check: http://localhost:${PORT}/health`);
    console.log(`👥 API Usuários: http://localhost:${PORT}/usuarios`);
    console.log(`💻 Front-end: http://localhost:${PORT}/index.html`);
    console.log(`⏰ Iniciado em: ${new Date().toLocaleString()}`);
    console.log(`🔧 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    
    // Testar conexão com banco
    await testConnection();
});

module.exports = app;