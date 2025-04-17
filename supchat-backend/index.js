// supchat-backend/index.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./db');
require('dotenv').config();

// 🔧 Bots
const initPollBot = require('./bots/pollBot');
const initMeetingBot = require('./bots/meetingBot');
const initReminderBot = require('./bots/reminderBot');

// Connexion MongoDB
connectDB();

// Express App
const app = express();
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/workspaces', require('./routes/workspaces'));
app.use('/api/workspaces', require('./routes/channels'));
app.use('/api/channels', require('./routes/messages'));
app.use('/api/direct-messages', require('./routes/directMessages'));
app.use('/api/search', require('./routes/search'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/meetings', require('./routes/meetings'));

// Serveur HTTP + WebSocket
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Stockage temporaire userId <-> socketId
const userSocketMap = {};
app.set('socketio', io);
app.set('userSocketMap', userSocketMap);

// Stockage des sondages en mémoire
const activePolls = new Map();

// Socket.IO - Connexion
io.on('connection', (socket) => {
  console.log(`✅ Utilisateur connecté : ${socket.id}`);

  socket.on('join', (userId) => {
    if (!userId) return console.error("❌ Aucun userId pour 'join'");
    userSocketMap[userId] = socket.id;
    socket.emit('joined', { message: `Connecté avec socket ${socket.id}` });
  });

  socket.on('joinChannel', (channelId) => {
    socket.join(channelId);
    console.log(`🧩 Socket ${socket.id} a rejoint le channel ${channelId}`);
  });

  socket.on('sendMessage', ({ channelId, message }) => {
    io.to(channelId).emit('receiveMessage', { message, channelId });
  });

  socket.on('sendDirectMessage', ({ toUserId, message }) => {
    const targetSocketId = userSocketMap[toUserId];
    if (targetSocketId) {
      io.to(targetSocketId).emit('receiveDirectMessage', { message });
    }
  });

  // 🔧 BOT : /remindme
  socket.on('remindme', (data) => {
    console.log(`⏰ /remindme reçu :`, data);
    io.emit('bot-message', {
      type: 'bot',
      content: `Rappel programmé : ${data.message} dans ${data.time}`,
      ...data,
    });
  });

  // 🔧 BOT : /meeting
  socket.on('meeting-reminder', (data) => {
    console.log(`📅 /meeting reçu :`, data);
    io.emit('bot-message', {
      type: 'bot',
      content: `📅 Réunion "${data.meetingTitle}" prévue le ${data.meetingDate} à ${data.meetingTime}`,
      ...data,
    });
  });

  socket.on('disconnect', () => {
    console.log(`⚠️ Déconnexion : ${socket.id}`);
    for (const [userId, sid] of Object.entries(userSocketMap)) {
      if (sid === socket.id) {
        delete userSocketMap[userId];
        break;
      }
    }
  });
});

// ✅ Initialisation des bots (chaque bot gère son propre socket.on)
initPollBot(io, activePolls);
initMeetingBot(io);
initReminderBot(io);

// Route test
app.get('/', (req, res) => {
  res.send('✅ SupChat backend is running.');
});

// Démarrage
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 SupChat backend en ligne sur le port ${PORT}`);
});
