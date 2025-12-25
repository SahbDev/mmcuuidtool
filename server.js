const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const https = require('https'); 

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static('public'));

// ARMAZENA OS CÓDIGOS DE ACESSO DOS AVATARES
// Formato: { 'uuid-do-avatar': 'CODIGO-A7X29' }
let accessCodes = {};

app.post('/api/log', (req, res) => {
    const data = req.body;

    // AÇÃO 1: REGISTRAR NOVO CÓDIGO (Vem do LSL quando clica OPEN LINK)
    if (data.action === 'register_code') {
        accessCodes[data.uuid] = data.code;
        console.log(`Novo código registrado para ${data.uuid}: ${data.code}`);
        // Se alguém já estiver conectado, derruba para pedir senha nova
        io.to(data.uuid).emit('force_logout'); 
        res.status(200).send('Code Registered');
        return;
    }

    // AÇÃO 2: LIMPAR TELA
    if (data.action === 'clear') {
        io.to(data.uuid).emit('new-log', { action: 'clear' });
        res.status(200).send('Cleared');
        return;
    }

    // AÇÃO 3: ENVIAR DADOS NORMAIS
    // Só envia para quem já digitou a senha correta (está na sala do UUID)
    io.to(data.uuid).emit('new-log', data);
    res.status(200).send('OK');
});

// ROTA DA FOTO DO AVATAR
app.get('/api/avatar/:uuid', (req, res) => {
    const uuid = req.params.uuid;
    const url = `https://world.secondlife.com/resident/${uuid}`;
    const options = { headers: { 'User-Agent': 'Mozilla/5.0' } };

    https.get(url, options, (resp) => {
        let d = '';
        resp.on('data', c => d += c);
        resp.on('end', () => {
            const m = d.match(/<img[^>]+src="([^"]+)"[^>]*class="parcelimg"/i) || d.match(/<img[^>]+class="parcelimg"[^>]*src="([^"]+)"/i);
            if (m && m[1]) res.redirect(m[1].startsWith('http://') ? m[1].replace('http://', 'https://') : m[1]);
            else res.redirect('https://secondlife.com/app/image/5748decc-f629-461c-9a36-a35a221fe21f/1');
        });
    }).on('error', () => res.redirect('https://secondlife.com/app/image/5748decc-f629-461c-9a36-a35a221fe21f/1'));
});

// --- SISTEMA DE LOGIN ---
io.on('connection', (socket) => {
    
    // O site manda: "Quero entrar no painel do UUID tal com a senha tal"
    socket.on('login_attempt', ({ uuid, code }) => {
        const trueCode = accessCodes[uuid];

        if (trueCode && code === trueCode) {
            socket.join(uuid); // SENHA CORRETA: Entra na sala
            socket.emit('login_success');
        } else {
            socket.emit('login_failed'); // SENHA ERRADA
        }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => { console.log(`Rodando na ${PORT}`); });
