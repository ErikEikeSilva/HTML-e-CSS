// config/db.js
const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',      
    user: 'root',           
    password: 'senac',           
    database: 'api_usuarios',
    port: 3307,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    charset: 'utf8mb4'
};

// Cria o pool de conexões
const pool = mysql.createPool(dbConfig);

// Testar a conexão ao iniciar
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log("✅ Conexão com MySQL estabelecida com sucesso!");
        
        // Verificar se a tabela existe
        const [tables] = await connection.execute(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = 'api_usuarios' 
            AND TABLE_NAME = 'usuarios'
        `);
        
        if (tables.length === 0) {
            console.log("⚠️  Tabela 'usuarios' não encontrada. Criando estrutura...");
            
            await connection.execute(`
                CREATE TABLE usuarios (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nome VARCHAR(100) NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            
            console.log("✅ Tabela 'usuarios' criada com sucesso!");
        }
        
        connection.release();
        return true;
    } catch (err) {
        console.error("❌ ERRO: Falha ao conectar ao MySQL:", err.message);
        console.log("📋 Verifique:");
        console.log("  1. XAMPP está rodando?");
        console.log("  2. MySQL está na porta 3307?");
        console.log("  3. Banco 'api_usuarios' existe?");
        console.log("  4. Credenciais estão corretas?");
        return false;
    }
};

// Exportar pool e função de teste
module.exports = { pool, testConnection };