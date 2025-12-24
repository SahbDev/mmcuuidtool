const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve os arquivos da pasta 'public'
app.use(express.static("public"));
app.use(bodyParser.json());

// Rota para verificar se o site está vivo
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Rota que o Second Life vai chamar
app.post("/api/log", (req, res) => {
  const data = req.body;
  
  // Envia para quem estiver com o site aberto
  io.emit("new-log", data);
  console.log("Log recebido:", data);
  
  res.status(200).send("OK");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
