/*..\supchat-backend\index.js*/
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./db');
require('dotenv').config();

const app = express();
connectDB();

// -- 1) Déclarer CORS avant tout :
app.use(cors({
  origin: process.env.CLIENT_URL, // ✅ défini dans ton .env → http://localhost:3001
  credentials: true,
}));

// Middleware
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/workspaces', require('./routes/workspaces'));
app.use('/api/workspaces', require('./routes/channels'));
app.use('/api/channels', require('./routes/messages'));
app.use('/api/direct-messages', require('./routes/directMessages'));
app.use('/api/search', require('./routes/search'));
app.use('/api/notifications', require('./routes/notifications'));
// Nouvelle route pour servir l’avatar depuis GridFS
app.use('/api/users', require('./routes/users'));

const server = http.createServer(app);

// -- 3) Configurer Socket.IO avec CORS :
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// On stocke ici le mapping userId -> socketId
const userSocketMap = {};

// --- Ajout de la gestion des statuts en ligne ---
// Objet qui contiendra pour chaque userId son socketId (pour le statut "online")
const onlineUsers = {};

app.set('socketio', io);
app.set('userSocketMap', userSocketMap);

io.on('connection', (socket) => {
  console.log(`Nouvel utilisateur connecté : ${socket.id}`);

  socket.on('join', (userId) => {
    if (!userId) {
      console.log("Erreur : Aucun userId fourni lors de l'événement 'join'");
      return;
    }
    userSocketMap[userId] = socket.id;
    onlineUsers[userId] = socket.id;
    console.log(`L'utilisateur ${userId} est maintenant associé au socket ${socket.id}`);

    // IMPORTANT : on émet "user-status-changed"
    io.emit('user-status-changed', { userId, status: 'online' });

    socket.emit('joined', {
      message: `Ok, userId ${userId} associé à socketId ${socket.id}`,
    });
  });

  socket.on('joinChannel', (channelId) => {
    socket.join(channelId);
    console.log(`Socket ${socket.id} joined channel ${channelId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket déconnecté : ${socket.id}`);
    const userIdToRemove = Object.keys(onlineUsers).find(
        (id) => onlineUsers[id] === socket.id
    );
    if (userIdToRemove) {
      delete onlineUsers[userIdToRemove];
      delete userSocketMap[userIdToRemove];
      console.log(`L'utilisateur ${userIdToRemove} est maintenant offline`);
      io.emit('user-status-changed', { userId: userIdToRemove, status: 'offline' });
    }
  });
});

app.get('/', (req, res) => {
  res.send('Server is running');
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
