const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const https = require('https'); 

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static('public'));

// MEMÓRIA DE SEGURANÇA
// Guarda quem é o "dono" atual de cada UUID
// Formato: { 'uuid-do-avatar': { key: 'senha-do-link', deviceId: 'id-do-computador' } }
let sessionLocks = {};

app.post('/api/log', (req, res) => {
    const data = req.body;
    // O script LSL manda os dados para a sala "uuid"
    // Só quem passou na autenticação abaixo estará nessa sala
    io.to(data.uuid).emit('new-log', data);
    res.status(200).send('OK');
});

app.get('/api/avatar/:uuid', (req, res) => {
    const uuid = req.params.uuid;
    const url = `https://world.secondlife.com/resident/${uuid}`;
    const options = { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } };

    https.get(url, options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
            const match = data.match(/<img[^>]+src="([^"]+)"[^>]*class="parcelimg"/i) || data.match(/<img[^>]+class="parcelimg"[^>]*src="([^"]+)"/i);
            if (match && match[1]) {
                let imageUrl = match[1].startsWith('http://') ? match[1].replace('http://', 'https://') : match[1];
                res.redirect(imageUrl);
            } else {
                res.redirect('https://secondlife.com/app/image/5748decc-f629-461c-9a36-a35a221fe21f/1');
            }
        });
    }).on('error', () => res.redirect('https://secondlife.com/app/image/5748decc-f629-461c-9a36-a35a221fe21f/1'));
});

// --- SISTEMA DE TRAVA DE DISPOSITIVO ---
io.on('connection', (socket) => {
    
    // O site manda: "Oi, sou o Avatar tal, com a senha do link tal, e meu ID de computador é esse"
    socket.on('auth_device', ({ uuid, key, deviceId }) => {
        
        if (!uuid || !key || !deviceId) {
            socket.emit('auth_failed', 'Invalid Credentials');
            return;
        }

        const currentLock = sessionLocks[uuid];

        // CENÁRIO 1: É um link NOVO (gerado agora no SL) ou primeira vez acessando
        // Ação: Registramos esse computador como o DONO deste link.
        if (!currentLock || currentLock.key !== key) {
            sessionLocks[uuid] = { key: key, deviceId: deviceId };
            socket.join(uuid); // Entra na sala segura
            socket.emit('auth_success');
            return;
        }

        // CENÁRIO 2: O link já existe. Verificamos se é o MESMO computador.
        if (currentLock.key === key) {
            if (currentLock.deviceId === deviceId) {
                // É o dono voltando (reload da página). Pode entrar.
                socket.join(uuid);
                socket.emit('auth_success');
            } else {
                // É OUTRA PESSOA tentando usar o mesmo link.
                // Ação: BLOQUEAR.
                socket.emit('auth_failed', 'Link already in use on another device.');
            }
        }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
