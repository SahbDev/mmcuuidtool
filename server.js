const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const https = require('https'); 

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static('public'));

app.post('/api/log', (req, res) => {
    const data = req.body;
    io.emit('new-log', data);
    res.status(200).send('OK');
});

// --- ROTA DE AVATAR CORRIGIDA ---
app.get('/api/avatar/:uuid', (req, res) => {
    const uuid = req.params.uuid;
    const url = `https://world.secondlife.com/resident/${uuid}`;

    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    };

    https.get(url, options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        
        response.on('end', () => {
            // Regex melhorado para achar a imagem mesmo que mude a ordem
            // Procura por qualquer tag img que tenha a classe "parcelimg"
            const match = data.match(/<img[^>]+src="([^"]+)"[^>]*class="parcelimg"/i) || 
                          data.match(/<img[^>]+class="parcelimg"[^>]*src="([^"]+)"/i);

            if (match && match[1]) {
                let imageUrl = match[1];
                
                // --- CORREÇÃO DO QUADRADO BRANCO ---
                // Força HTTPS, senão o navegador bloqueia
                if (imageUrl.startsWith('http://')) {
                    imageUrl = imageUrl.replace('http://', 'https://');
                }
                
                res.redirect(imageUrl);
            } else {
                // Imagem padrão cinza (garantido HTTPS)
                res.redirect('https://secondlife.com/app/image/5748decc-f629-461c-9a36-a35a221fe21f/1');
            }
        });
    }).on('error', (e) => {
        console.error(e);
        res.redirect('https://secondlife.com/app/image/5748decc-f629-461c-9a36-a35a221fe21f/1');
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
