// Servidor Express responsável pelo backend da aplicação Pomodoro

const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');

const app = express();

// Middleware para aceitar requisições de outras origens (ex: localhost:3000 para front)
app.use(cors());

// Middleware para transformar o body em JSON
app.use(bodyParser.json());

// Servir arquivos estáticos da aplicação (HTML, CSS, JS, imagens)
app.use(express.static(path.join(__dirname, '../telas'))); // HTML principal
app.use('/assets', express.static(path.join(__dirname, '../assets'))); // Imagens e ícones
app.use('/js', express.static(path.join(__dirname, '../js'))); // Scripts JS

// Configurações de conexão com o MySQL
const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    port: 3306,
    password: 'root',
    database: 'pomodoro',
};

// Função para inicializar o banco e garantir que a tabela "tarefas" exista
async function initializeDB() {
    const conn = await mysql.createConnection(dbConfig);
    await conn.query(`
        CREATE TABLE IF NOT EXISTS tarefas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titulo VARCHAR(255),
            descricao TEXT,
            imagens TEXT,           -- Armazena imagens em formato JSON
            subtarefas TEXT,        -- Armazena subtarefas em formato JSON
            dataAtualizado TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    await conn.query(`
        CREATE TABLE IF NOT EXISTS tarefas_concluidas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titulo VARCHAR(255),
            descricao TEXT,
            imagens TEXT,
            subtarefas TEXT,
            dataConcluido TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await conn.end();
}

// Inicializa o banco assim que o servidor inicia
initializeDB().catch(console.error);

// Rota padrão de verificação
app.get('/', (req, res) => {
    res.send('Servidor rodando!');
});

// Rota para salvar (inserir ou atualizar) uma tarefa
app.post('/api/salvar-tarefa', async (req, res) => {
    const { id, titulo, descricao, imagens, subtarefas } = req.body;

    try {
        const conn = await mysql.createConnection(dbConfig);

        // Converte arrays de imagens e subtarefas para JSON antes de salvar
        const imagensJSON = imagens ? JSON.stringify(imagens) : null;
        const subtarefasJSON = subtarefas ? JSON.stringify(subtarefas) : null;

        if (id) {
            // Atualização de tarefa existente
            await conn.query(
                'UPDATE tarefas SET titulo = ?, descricao = ?, imagens = ?, subtarefas = ? WHERE id = ?',
                [titulo, descricao, imagensJSON, subtarefasJSON, id]
            );
            res.json({ status: 'atualizado' });
        } else {
            // Criação de nova tarefa
            const [result] = await conn.query(
                'INSERT INTO tarefas (titulo, descricao, imagens, subtarefas) VALUES (?, ?, ?, ?)',
                [titulo, descricao, imagensJSON, subtarefasJSON]
            );
            res.json({ status: 'criado', id: result.insertId });
        }

        await conn.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao salvar tarefa' });
    }
});

// Rota para concluir uma tarefa
app.post('/api/concluir-tarefa', async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ erro: 'ID da tarefa é obrigatório' });
    }

    try {
        const conn = await mysql.createConnection(dbConfig);

        // Busca os dados da tarefa
        const [rows] = await conn.query('SELECT * FROM tarefas WHERE id = ?', [id]);

        if (rows.length === 0) {
            await conn.end();
            return res.status(404).json({ erro: 'Tarefa não encontrada' });
        }

        const tarefa = rows[0];

        // Insere na tabela tarefas_concluidas
        await conn.query(
            'INSERT INTO tarefas_concluidas (titulo, descricao, imagens, subtarefas) VALUES (?, ?, ?, ?)',
            [tarefa.titulo, tarefa.descricao, tarefa.imagens, tarefa.subtarefas]
        );

        // Remove da tabela tarefas
        await conn.query('DELETE FROM tarefas WHERE id = ?', [id]);

        await conn.end();

        res.json({ status: 'concluida', id: id });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao concluir tarefa' });
    }
});


// Inicializa o servidor Express na porta 3000 (ou porta configurada no ambiente)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
