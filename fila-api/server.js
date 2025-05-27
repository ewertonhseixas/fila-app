const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3306; // Você pode escolher outra porta

app.use(bodyParser.json());
app.use(cors());

// Informações de conexão com o MySQL
const dbConfig = {
    host: '100.26.4.178', // ou '127.0.0.1'
    user: 'devs',
    password: 'ZNzdBx4ce5CPiqFirPkw',
    database: 'fila_app'
};

const db = mysql.createConnection(dbConfig);

db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao MySQL:', err);
        return;
    }
    console.log('Conectado ao MySQL com sucesso!');
});

// Rota para mover um nome da fila de livres para a de ocupados
app.post('/mover/livre-ocupado', (req, res) => {
    const { nome } = req.body;
    if (!nome) {
        return res.status(400).json({ error: 'Nome não fornecido' });
    }

    db.beginTransaction(err => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao iniciar transação' });
        }

        db.query('DELETE FROM livres WHERE nome = ?', [nome], (err, result) => {
            if (err) {
                return db.rollback(() => {
                    console.error('Erro ao remover de livres:', err);
                    res.status(500).json({ error: 'Erro ao mover' });
                });
            }
            if (result.affectedRows === 0) {
                return db.rollback(() => {
                    res.status(404).json({ error: 'Nome não encontrado em livres' });
                });
            }

            db.query('INSERT INTO ocupados (nome) VALUES (?)', [nome], (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Erro ao inserir em ocupados:', err);
                        res.status(500).json({ error: 'Erro ao mover' });
                    });
                }
                db.commit(err => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Erro ao commitar transação:', err);
                            res.status(500).json({ error: 'Erro ao mover' });
                        });
                    }
                    res.json({ message: 'Movido para ocupados com sucesso' });
                });
            });
        });
    });
});

// Rota para mover um nome da fila de ocupados para a de livres
app.post('/mover/ocupado-livre', (req, res) => {
    const { nome } = req.body;
    if (!nome) {
        return res.status(400).json({ error: 'Nome não fornecido' });
    }

    db.beginTransaction(err => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao iniciar transação' });
        }

        db.query('DELETE FROM ocupados WHERE nome = ?', [nome], (err, result) => {
            if (err) {
                return db.rollback(() => {
                    console.error('Erro ao remover de ocupados:', err);
                    res.status(500).json({ error: 'Erro ao mover' });
                });
            }
            if (result.affectedRows === 0) {
                return db.rollback(() => {
                    res.status(404).json({ error: 'Nome não encontrado em ocupados' });
                });
            }

            // Precisamos encontrar a próxima ordem disponível na tabela de livres
            db.query('SELECT MAX(ordem) AS max_ordem FROM livres', (err, results) => {
                const novaOrdem = results[0].max_ordem === null ? 1 : results[0].max_ordem + 1;

                db.query('INSERT INTO livres (nome, ordem) VALUES (?, ?)', [nome, novaOrdem], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Erro ao inserir em livres:', err);
                            res.status(500).json({ error: 'Erro ao mover' });
                        });
                    }
                    db.commit(err => {
                        if (err) {
                            return db.rollback(() => {
                                console.error('Erro ao commitar transação:', err);
                                res.status(500).json({ error: 'Erro ao mover' });
                            });
                        }
                        res.json({ message: 'Movido para livres com sucesso' });
                    });
                });
            });
        });
    });
});

// Rota para adicionar um novo nome à lista de livres
app.post('/livres', (req, res) => {
    const { nome } = req.body;
    if (!nome) {
        return res.status(400).json({ error: 'Nome não fornecido' });
    }

    // Precisamos encontrar a próxima ordem disponível na tabela de livres
    db.query('SELECT MAX(ordem) AS max_ordem FROM livres', (err, results) => {
        const novaOrdem = results[0].max_ordem === null ? 1 : results[0].max_ordem + 1;

        db.query('INSERT INTO livres (nome, ordem) VALUES (?, ?)', [nome, novaOrdem], (err, result) => {
            if (err) {
                console.error('Erro ao adicionar a livres:', err);
                return res.status(500).json({ error: 'Erro ao adicionar' });
            }
            res.json({ message: 'Adicionado a livres com sucesso', id: result.insertId, ordem: novaOrdem, nome });
        });
    });
});

// Rota para remover um nome da lista de livres
app.delete('/livres/:nome', (req, res) => {
    const { nome } = req.params;
    if (!nome) {
        return res.status(400).json({ error: 'Nome não fornecido' });
    }

    db.query('DELETE FROM livres WHERE nome = ?', [nome], (err, result) => {
        if (err) {
            console.error('Erro ao remover de livres:', err);
            return res.status(500).json({ error: 'Erro ao remover' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Nome não encontrado em livres' });
        }
        res.json({ message: 'Removido de livres com sucesso', affectedRows: result.affectedRows });
    });
});

// Rota para salvar a ordem da fila de livres (após edição por arrastar)
app.put('/livres/ordem', (req, res) => {
    const { ordem } = req.body;
    if (!Array.isArray(ordem)) {
        return res.status(400).json({ error: 'Ordem inválida fornecida' });
    }

    db.beginTransaction(err => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao iniciar transação' });
        }

        // Zerar a ordem atual
        db.query('UPDATE livres SET ordem = 0', (err) => {
            if (err) {
                return db.rollback(() => {
                    console.error('Erro ao resetar ordem:', err);
                    res.status(500).json({ error: 'Erro ao salvar ordem' });
                });
            }

            let queries = [];
            ordem.forEach((nome, index) => {
                queries.push(new Promise((resolve, reject) => {
                    db.query('UPDATE livres SET ordem = ? WHERE nome = ?', [index + 1, nome], (err, result) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    });
                }));
            });

            Promise.all(queries)
                .then(() => {
                    db.commit(err => {
                        if (err) {
                            return db.rollback(() => {
                                console.error('Erro ao commitar transação:', err);
                                res.status(500).json({ error: 'Erro ao salvar ordem' });
                            });
                        }
                        res.json({ message: 'Ordem da fila de livres atualizada com sucesso' });
                    });
                })
                .catch(err => {
                    return db.rollback(() => {
                        console.error('Erro ao atualizar ordem:', err);
                        res.status(500).json({ error: 'Erro ao salvar ordem' });
                    });
                });
        });
    });
});

// Rota para salvar a ordem da fila de livres (após edição no modal)
app.put('/livres/ordem/config', (req, res) => {
    const { ordem } = req.body;
    if (!Array.isArray(ordem)) {
        return res.status(400).json({ error: 'Ordem inválida fornecida' });
    }

    db.beginTransaction(err => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao iniciar transação' });
        }

        let queries = [];
        ordem.forEach((nome, index) => {
            queries.push(new Promise((resolve, reject) => {
                db.query('UPDATE livres SET ordem = ? WHERE nome = ?', [index + 1, nome], (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            }));
        });

        Promise.all(queries)
            .then(() => {
                db.commit(err => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Erro ao commitar transação:', err);
                            res.status(500).json({ error: 'Erro ao salvar ordem' });
                        });
                    }
                    res.json({ message: 'Ordem da fila de livres atualizada com sucesso (config)' });
                });
            })
            .catch(err => {
                return db.rollback(() => {
                    console.error('Erro ao atualizar ordem (config):', err);
                    res.status(500).json({ error: 'Erro ao salvar ordem (config)' });
                });
            });
    });
});

// Aqui vamos definir as rotas da API

app.listen(port, () => {
    console.log(`Servidor da API rodando na porta ${port}`);
});

// Rota para obter a lista de pessoas livres
app.get('/livres', (req, res) => {
    db.query('SELECT id, nome FROM livres ORDER BY ordem', (err, results) => {
        if (err) {
            console.error('Erro ao buscar a lista de livres:', err);
            res.status(500).json({ error: 'Erro ao buscar dados' });
            return;
        }
        res.json(results);
    });
});

// Rota para obter a lista de pessoas ocupadas
app.get('/ocupados', (req, res) => {
    db.query('SELECT id, nome FROM ocupados', (err, results) => {
        if (err) {
            console.error('Erro ao buscar a lista de ocupados:', err);
            res.status(500).json({ error: 'Erro ao buscar dados' });
            return;
        }
        res.json(results);
    });
});