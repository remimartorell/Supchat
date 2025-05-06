const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./db');
require('dotenv').config();

// 🔧 Bots
const initPollBot     = require('./bots/pollBot');
const initMeetingBot  = require('./bots/meetingBot');
const initReminderBot = require('./bots/reminderBot');
const { saveBotMessage } = require('./controllers/messageBotController');

// Connexion MongoDB
connectDB();

// Express App
const app = express();
app.use(cors({
  origin:      process.env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes API
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/users',           require('./routes/users'));
app.use('/api/workspaces',      require('./routes/workspaces'));
app.use('/api/workspaces',      require('./routes/channels'));
app.use('/api/channels',        require('./routes/messages'));
app.use('/api/direct-messages', require('./routes/directMessages'));
app.use('/api/search',          require('./routes/search'));
app.use('/api/notifications',   require('./routes/notifications'));
app.use('/api/meetings',        require('./routes/meetings'));

// Serveur HTTP + WebSocket
const server = http.createServer(app);
const io     = socketIo(server, {
  cors: {
    origin:      process.env.CLIENT_URL,
    methods:     ['GET','POST'],
    credentials: true,
  },
});

// Stockage temporaire userId <-> socketId
const userSocketMap = {};
app.set('socketio',      io);
app.set('userSocketMap', userSocketMap);

// Stockage des sondages en mémoire
const activePolls = new Map();

// ↪︎ Handlers généraux Socket.IO
io.on('connection', socket => {
  console.log(`✅ Utilisateur connecté : ${socket.id}`);

  socket.on('meeting', async ({ date, title, channelId, sender }) => {
    try {
      const Meeting = require('./models/Meeting');
      const newMeeting = new Meeting({
        title,
        startTime: new Date(date),
        channel: channelId,
      });
      await newMeeting.save();
      console.log('✅ Réunion sauvegardée :', title);
    } catch (err) {
      console.error('❌ Erreur création réunion :', err);
    }
  });

  socket.on('meeting-reminder', async ({ meetingDate, meetingTime, meetingTitle, channelId, receiverId }) => {
    const content = `✅ Réunion "${meetingTitle}" planifiée à ${meetingTime}.`;

    try {
      const saved = await saveBotMessage({
        content,
        channel: channelId || null,
        receiver: receiverId || null,
      }, channelId ? 'channel' : 'dm');

      if (!saved) return;
      const payload = saved.toObject();

      if (channelId) {
        io.to(channelId).emit('bot-message', payload);
      } else if (receiverId) {
        const sockId = userSocketMap[receiverId.toString()];
        if (sockId) io.to(sockId).emit('bot-message', payload);
      }
    } catch (err) {
      console.error('❌ Erreur meeting-reminder:', err);
    }
  });

  // Enregistrement du userId et notification des autres utilisateurs
  socket.on('join', userId => {
    if (!userId) return console.error("❌ Aucun userId pour 'join'");
    userSocketMap[userId] = socket.id;
    socket.emit('joined', { message: `Connecté avec socket ${socket.id}` });
    // Notification broadcast : user en ligne
    socket.broadcast.emit('user-connected', userId);
    // ----> NOUVELLE LIGNE À BIEN GARDER <----
    // Envoi au nouvel arrivant de la liste de tous les users actuellement en ligne
    socket.emit('active-users', Object.keys(userSocketMap));
  });

  socket.on('joinChannel', channelId => {
    socket.join(channelId);
    console.log(`🧩 Socket ${socket.id} a rejoint le channel ${channelId}`);
  });

  socket.on('sendMessage', ({ channelId, message }) => {
    io.to(channelId).emit('receiveMessage', { message, channelId });
  });

  socket.on('sendDirectMessage', ({ toUserId, message }) => {
    const targetSocketId = userSocketMap[toUserId];
    if (targetSocketId) io.to(targetSocketId).emit('receiveDirectMessage', { message });
  });

  // Gestion de la déconnexion et notification des autres utilisateurs
  socket.on('disconnect', () => {
    console.log(`⚠️ Déconnexion : ${socket.id}`);
    let disconnectedUserId = null;
    for (const [uId, sid] of Object.entries(userSocketMap)) {
      if (sid === socket.id) {
        disconnectedUserId = uId;
        delete userSocketMap[uId];
        break;
      }
    }
    if (disconnectedUserId) {
      // Notification broadcast : user hors ligne
      socket.broadcast.emit('user-disconnected', disconnectedUserId);
    }
  });
});

// ✅ Initialisation des bots
initPollBot(io, activePolls);
initMeetingBot(io, userSocketMap);
initReminderBot(io, userSocketMap);

// Route test
app.get('/', (req, res) => {
  res.send('✅ SupChat backend is running.');
});

// Démarrage
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 SupChat backend en ligne sur le port ${PORT}`);
});
