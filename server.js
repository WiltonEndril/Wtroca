const express = require('express');
const firebird = require('node-firebird');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const paginate = require ( 'express-paginate' ) ;
const app = express();
const port = 3000;

// Configurações de conexão com o banco de dados Firebird
const options = {
    host: 'localhost',
    port: 3050,
    database: 'C:/WFErp/WF-FDB/WF_BASE.FDB',
    user: 'SYSDBA',
    password: 'masterkey',
    lowercase_keys: false,
    role: null,
    pageSize: 4096
};

const SECRET_KEY = 'sua_chave_secreta_aqui';

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); // Servir arquivos estáticos

// Configura o express-paginate
app.use(paginate.middleware(10, 50)); // Limite de 10 itens por página, máximo de 50 itens por página

// Middleware para autenticação
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.sendStatus(401); // Sem token, acesso negado

    jwt.verify(token.replace('Bearer ', ''), SECRET_KEY, (err, user) => { // Remove 'Bearer ' do token
        if (err) {
            console.error('Token inválido:', err);
            return res.sendStatus(403); // Token inválido, acesso negado
        }
        req.user = user;
        next(); // Token válido, prossiga para a próxima função
    });
}

// Rota principal para servir o arquivo HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para verificar o login do usuário
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;

    firebird.attach(options, function(err, db) {
        if (err) {
            console.error('Erro ao conectar ao banco de dados:', err);
            res.status(500).send('Erro interno ao conectar ao banco de dados');
            return;
        }

        const query = 'SELECT * FROM USUARIOS WHERE NOME = ? AND SENHA = ?';
        db.query(query, [usuario, senha], function(err, result) {
            if (err) {
                console.error('Erro ao executar a consulta:', err);
                res.status(500).send('Erro interno ao executar a consulta no banco de dados');
                db.detach();
                return;
            }

            if (result.length > 0) {
                const token = jwt.sign({ usuario }, SECRET_KEY, { expiresIn: '1h' });
                res.json({ success: true, token });
            } else {
                res.json({ success: false });
            }

            db.detach();
        });
    });
});

// Rota para servir a página de produtos
app.get('/produtos', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'produtos.html'));
});

// Rota para buscar produtos com paginação
app.get('/api/produtos', authenticateToken, (req, res) => {
    const limit = req.query.limit || 20; // Número de produtos por página
    const offset = req.skip; // Deslocamento calculado pelo express-paginate

    firebird.attach(options, function(err, db) {
        if (err) {
            console.error('Erro ao conectar ao banco de dados:', err);
            return res.status(500).send('Erro interno ao conectar ao banco de dados');
        }

        const countQuery = 'SELECT COUNT(*) AS total FROM ITENS';
        db.query(countQuery, function(err, countResult) {
            if (err) {
                console.error('Erro ao contar produtos:', err);
                db.detach();
                return res.status(500).send('Erro interno ao contar produtos');
            }

            const total = countResult[0].TOTAL;

            const selectQuery = 'SELECT ID, DESCRICAO, VENDA FROM ITENS ORDER BY ID ROWS ? TO ?';
            db.query(selectQuery, [offset + 1, offset + limit], function(err, products) {
                if (err) {
                    console.error('Erro ao executar a consulta:', err);
                    db.detach();
                    return res.status(500).send('Erro interno ao executar a consulta no banco de dados');
                }

                const pageCount = Math.ceil(total / limit);
                res.json({
                    products,
                    total,
                    pageCount,
                    currentPage: req.query.page || 1,
                    hasNext: paginate.hasNextPages(req)(pageCount)
                });

                db.detach();
            });
        });
    });
});

// Rota para atualizar produtos
app.post('/api/produtos/atualizar', authenticateToken, (req, res) => {
    const produtos = req.body;

    firebird.attach(options, function(err, db) {
        if (err) {
            console.error('Erro ao conectar ao banco de dados:', err);
            res.status(500).send('Erro interno ao conectar ao banco de dados');
            return;
        }

        const promises = produtos.map(produto => {
            const query = 'UPDATE ITENS SET DESCRICAO = ?, VENDA = ?, QUANTIDADE = ? WHERE ID = ?';
            return new Promise((resolve, reject) => {
                db.query(query, [produto.descricao, produto.preco, produto.quantidade, produto.id], (err) => {
                    if (err) {
                        console.error('Erro ao atualizar o produto:', err);
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });

        Promise.all(promises)
            .then(() => {
                res.json({ success: true });
                db.detach();
            })
            .catch(err => {
                res.status(500).send('Erro interno ao atualizar produtos');
                db.detach();
            });
    });
});

// Rota para realizar logout
app.post('/logout', (req, res) => {
    // No lado do servidor, você pode simplesmente não fazer nada, pois o cliente deve remover o token
    res.json({ message: 'Logout realizado com sucesso' });
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor está rodando em http://localhost:${port}`);
});
