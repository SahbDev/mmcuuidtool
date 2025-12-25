const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const https = require('https'); // Usado para buscar a foto

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configuração para ler JSON
app.use(express.json());
app.use(express.static('public'));

// Rota para o Script LSL enviar dados
app.post('/api/log', (req, res) => {
    const data = req.body;
    
    // Envia para o site em tempo real
    io.emit('new-log', data);
    
    console.log("Log recebido:", data);
    res.status(200).send('OK');
});

// NOVA ROTA MÁGICA: Busca a foto do avatar
app.get('/api/avatar/:uuid', (req, res) => {
    const uuid = req.params.uuid;
    const url = `https://world.secondlife.com/resident/${uuid}`;

    https.get(url, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
            // Procura o link da imagem no HTML da página
            const match = data.match(/<img alt="Profile picture" src="([^"]+)"/);
            if (match && match[1]) {
                // Se achou, redireciona o navegador para a imagem real
                res.redirect(match[1]);
            } else {
                // Se não achou (avatar sem foto), manda uma imagem padrão cinza
                res.redirect('https://secondlife.com/app/image/5748decc-f629-461c-9a36-a35a221fe21f/1');
            }
        });
    }).on('error', () => {
        res.redirect('https://secondlife.com/app/image/5748decc-f629-461c-9a36-a35a221fe21f/1');
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
