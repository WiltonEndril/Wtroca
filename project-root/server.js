const express = require('express');
const firebird = require('node-firebird');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const paginate = require('express-paginate');
const app = express();
const port = 3000;

// Configurações de conexão com o banco de dados Firebird
const options = {
    host: '127.0.0.1', // Use IPv4 address
    port: 3050,
    database: 'C:/WFErp/WF-FDB/WF_BASE.FDB',
    user: 'SYSDBA',
    password: 'masterkey',
    lowercase_keys: false,
    role: null,
    pageSize: 4096
};

const SECRET_KEY = '1234';

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); // Servir arquivos estáticos

// Configura o express-paginate
app.use(paginate.middleware(18, 50)); // Limite de 18 itens por página, máximo de 50 itens por página

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

    const usuarioUpper = usuario.toUpperCase();

    firebird.attach(options, function(err, db) {
        if (err) {
            console.error('Erro ao conectar ao banco de dados:', err);
            res.status(500).send('Erro interno ao conectar ao banco de dados');
            return;
        }

        const query = 'SELECT * FROM USUARIOS WHERE NOME = ? AND SENHA = ?';
        db.query(query, [usuarioUpper, senha], function(err, result) {
            if (err) {
                console.error('Erro ao executar a consulta:', err);
                res.status(500).send('Erro interno ao executar a consulta no banco de dados');
                db.detach();
                return;
            }

            if (result.length > 0) {
                const usuarioData = result[0]; // Supondo que a primeira linha contenha os dados do usuário
                const token = jwt.sign(
                    { usuario: usuarioData.NOME }, // Incluindo o nome do usuário no token
                    SECRET_KEY,
                    { expiresIn: '1h' }
                );
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

// Rota para buscar produtos com paginação e pesquisa
app.get('/api/produtos', authenticateToken, (req, res) => {
    const limit = parseInt(req.query.limit) || 18; // Número de produtos por página
    const offset = req.skip; // Deslocamento calculado pelo express-paginate
    const search = req.query.search ? `%${req.query.search.toUpperCase()}%` : '%'; // Termo de pesquisa em maiúsculas

    firebird.attach(options, function(err, db) {
        if (err) {
            console.error('Erro ao conectar ao banco de dados:', err);
            return res.status(500).send('Erro interno ao conectar ao banco de dados');
        }

        const countQuery = 'SELECT COUNT(*) AS total FROM ITENS WHERE UPPER(DESCRICAO) LIKE ?';
        db.query(countQuery, [search], function(err, countResult) {
            if (err) {
                console.error('Erro ao contar produtos:', err);
                db.detach();
                return res.status(500).send('Erro interno ao contar produtos');
            }

            const total = countResult[0].TOTAL;

            const selectQuery = `
                SELECT 
                    ITENS.ID,
                    ITENS.CODIGOBARRAS, 
                    ITENS.DESCRICAO, 
                    ITENS.VENDA, 
                    COALESCE(ESTOQUE.SALDO, 0) AS QUANTIDADE
                FROM 
                    ITENS
                LEFT JOIN 
                    ITENS_ESTOQUE ESTOQUE ON ITENS.CODIGOBARRAS = ESTOQUE.CODIGO
                WHERE 
                    UPPER(ITENS.DESCRICAO) LIKE ?
                ORDER BY 
                    ITENS.ID
                ROWS 
                    ? TO ?;
`;
        
            db.query(selectQuery, [search, offset + 1, offset + limit], function(err, products) {
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
    const produtos = req.body; // Espera-se que seja um array de produtos

    firebird.attach(options, function(err, db) {
        if (err) {
            console.error('Erro ao conectar ao banco de dados:', err);
            return res.status(500).send('Erro interno ao conectar ao banco de dados');
        }

        if (!Array.isArray(produtos)) {
            db.detach();
            return res.status(400).send('Dados inválidos');
        }

        // Lista de promessas para atualização de produtos e estoque
        const promises = produtos.map(produto => {
            if (produto.descricao === undefined || isNaN(produto.preco) || isNaN(produto.quantidade) || produto.codigoBarras === undefined) {
                return Promise.reject(new Error(`Dados inválidos para o produto com código de barras ${produto.codigoBarras}`));
            }
        
            const updateItemQuery = 'UPDATE ITENS SET DESCRICAO = ?, VENDA = ? WHERE CODIGOBARRAS = ?';
            const updateStockQuery = 'UPDATE ITENS_ESTOQUE SET SALDO = ? WHERE CODIGO = ?';
        
            return new Promise((resolve, reject) => {
                db.query(updateItemQuery, [produto.descricao, produto.preco, produto.codigoBarras], (err) => {
                    if (err) {
                        console.error('Erro ao atualizar o produto:', err);
                        reject(err);
                        return;
                    }
        
                    // Atualiza o saldo do estoque, passando dois parâmetros: saldo e código
                    db.query(updateStockQuery, [produto.quantidade, produto.codigoBarras], (err) => {
                        if (err) {
                            console.error('Erro ao atualizar o estoque:', err);
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            });
        });

        // Executa todas as promessas
        Promise.all(promises)
            .then(() => {
                res.json({ success: true });
                db.detach();
            })
            .catch(err => {
                console.error('Erro interno ao atualizar produtos:', err);
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
