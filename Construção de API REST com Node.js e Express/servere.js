const express = require('express');
const app = express();
const PORT = 3000;

// Middleware para parsing JSON
app.use(express.json());

// Array temporário para simular banco de dados
let usuarios = [
  { id: 1, nome: "Erik Eike", email: "Eike@email.com" },
  { id: 2, nome: "Maria Santos", email: "maria@email.com" }
];

// Rota GET - Listar todos os usuários
app.get('/usuarios', (req, res) => {
  console.log('GET /usuarios - Listando todos os usuários');
  res.json({
    mensagem: "Lista de usuários recuperada com sucesso",
    data: usuarios,
    total: usuarios.length
  });
});

// Rota GET - Buscar usuário por ID
app.get('/usuarios/:id', (req, res) => {
  const id = parseInt(req.params.id);
  console.log(`GET /usuarios/${id} - Buscando usuário específico`);
  
  const usuario = usuarios.find(u => u.id === id);
  
  if (!usuario) {
    return res.status(404).json({
      mensagem: "Usuário não encontrado",
      error: true
    });
  }
  
  res.json({
    mensagem: "Usuário encontrado com sucesso",
    data: usuario
  });
});

// Rota POST - Criar novo usuário
app.post('/usuarios', (req, res) => {
  console.log('POST /usuarios - Criando novo usuário');
  const { nome, email } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ mensagem: 'Nome e email são obrigatórios', error: true });
  }

  const novoId = usuarios.length ? Math.max(...usuarios.map(u => u.id)) + 1 : 1;
  const novoUsuario = { id: novoId, nome, email };
  usuarios.push(novoUsuario);

  res.status(201).json({ mensagem: 'Usuário criado com sucesso', data: novoUsuario });
});

// Rota PUT - Atualizar usuário completo
app.put('/usuarios/:id', (req, res) => {
  const id = parseInt(req.params.id);
  console.log(`PUT /usuarios/${id} - Atualizando usuário`);
  
  const usuarioIndex = usuarios.findIndex(u => u.id === id);
  
  if (usuarioIndex === -1) {
    return res.status(404).json({
      mensagem: "Usuário não encontrado",
      error: true
    });
  }
  
  const { nome, email } = req.body;
  
  if (!nome || !email) {
    return res.status(400).json({
      mensagem: "Nome e email são obrigatórios",
      error: true
    });
  }
  
  // Atualizar usuário
  usuarios[usuarioIndex] = { id, nome, email };
  
  res.json({
    mensagem: "Usuário atualizado com sucesso",
    data: usuarios[usuarioIndex]
  });
});
// Rota DELETE - Remover usuário
app.delete('/usuarios/:id', (req, res) => {
  const id = parseInt(req.params.id);
  console.log(`DELETE /usuarios/${id} - Removendo usuário`);
  
  const usuarioIndex = usuarios.findIndex(u => u.id === id);
  
  if (usuarioIndex === -1) {
    return res.status(404).json({
      mensagem: "Usuário não encontrado",
      error: true
    });
  }
  
  // Remover usuário
  const usuarioRemovido = usuarios.splice(usuarioIndex, 1)[0];
  
  res.json({
    mensagem: "Usuário removido com sucesso",
    data: usuarioRemovido
  });
});

// Rota raiz - Health Check
app.get('/', (req, res) => {
  res.json({
    mensagem: "API está funcionando! 🚀",
    versao: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📚 Endpoints disponíveis:`);
  console.log(`   GET  http://localhost:${PORT}/usuarios`);
  console.log(`   GET  http://localhost:${PORT}/usuarios/1`);
});