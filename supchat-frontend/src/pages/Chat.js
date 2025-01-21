// src/pages/Chat.js
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from '../services/axiosConfig';

import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import MessageInput from '../components/MessageInput';

import { useLocation, useNavigate } from 'react-router-dom';

function parseMentions(content) {
    // Regex très simple pour @quelquechose (sans espaces)
    const regex = /@(\S+)/g;
    const matches = content.matchAll(regex);
    const mentionNames = [];
    for (const match of matches) {
        mentionNames.push(match[1]); // ex "JohnDoe"
    }
    return mentionNames;
}


function Chat() {
    const navigate = useNavigate();
    const location = useLocation();
    const [socket, setSocket] = useState(null);
    const [userId, setUserId] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Sélection courante : un user pour DM, ou un channel
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedChannel, setSelectedChannel] = useState('');

    // Les messages à afficher (DM ou channel)
    const [messages, setMessages] = useState([]);

    // Les listes d’utilisateurs et de channels à afficher dans la Sidebar
    const [users, setUsers] = useState([]);

    // La liste de workspaces de l’utilisateur
    const [myWorkspaces, setMyWorkspaces] = useState([]);

    // -- 1) Récupérer l’utilisateur connecté
    useEffect(() => {
        fetchUserId();
    }, []);

    const fetchUserId = async () => {
        try {
            const res = await axios.get('/api/auth/user');
            setUserId(res.data._id);
            setIsLoggedIn(true);
        } catch (err) {
            console.error('Erreur fetchUserId:', err);
        }
    };

    // -- 2) Initialiser Socket dès qu’on a le userId
    useEffect(() => {
        if (isLoggedIn && userId) {
            const newSocket = io(process.env.REACT_APP_API_URL);
            setSocket(newSocket);

            newSocket.on('connect', () => {
                console.log('Socket connecté :', newSocket.id);
                newSocket.emit('join', userId);
            });

            newSocket.on('joined', (msg) => {
                console.log('Reçu "joined":', msg);
            });

            // Nouveau DM
            newSocket.on('new-private-message', (message) => {
                console.log('Nouveau DM reçu :', message);
                // On l’affiche uniquement si c’est le “selectedUser”
                if (
                    (message.sender === selectedUser && message.receiver === userId) ||
                    (message.sender === userId && message.receiver === selectedUser)
                ) {
                    setMessages((prev) => [...prev, message]);
                }
            });

            // Nouveau message channel
            newSocket.on('new-channel-message', (message) => {
                console.log('Nouveau message channel :', message);
                if (selectedChannel && message.channelId === selectedChannel) {
                    setMessages((prev) => [...prev, message]);
                }
            });

            newSocket.on('mention-notification', (notif) => {
                alert(`
                    Tu as été mentionné par ${notif.from}
                    Dans le channel ${notif.channelName}
                    Du workspace ${notif.workspaceName}
                `);
            });

            return () => {
                newSocket.off('joined');
                newSocket.off('new-private-message');
                newSocket.off('new-channel-message');
                newSocket.disconnect();
            };
        }
    }, [isLoggedIn, userId, selectedUser, selectedChannel]);

    useEffect(() => {
        if (socket && selectedChannel) {
            socket.emit('joinChannel', selectedChannel);
            console.log('Re-join channel automatically', selectedChannel);
        }
    }, [socket, selectedChannel]);

    // -- 3) Au montage (ou après login), récupérer la liste d’utilisateurs + workspaces
    useEffect(() => {
        if (isLoggedIn && userId) {
            fetchUsers();
            fetchWorkspaces();
        }
    }, [isLoggedIn, userId]);

    const fetchUsers = async () => {
        try {
            // Appel vers /api/auth/allUsers pour avoir tous les utilisateurs
            const res = await axios.get('/api/auth/allUsers');
            setUsers(res.data);
        } catch (err) {
            console.error('Erreur fetchUsers:', err);
        }
    };

    const fetchWorkspaces = async () => {
        try {
            // Liste des workspaces où l’utilisateur connecté est membre
            const res = await axios.get('/api/workspaces');
            setMyWorkspaces(res.data);
        } catch (err) {
            console.error('Erreur fetchWorkspaces:', err);
        }
    };

    // -- 4)
    useEffect(() => {
        if (isLoggedIn && userId) {
            fetchWorkspacesAndChannels();
        }
    }, [isLoggedIn, userId]);

    const fetchWorkspacesAndChannels = async () => {
        try {
            // 1) Récupérer la liste des workspaces
            const res = await axios.get('/api/workspaces');
            const rawWorkspaces = res.data; // [ { _id, name, owner, ... }, ... ]

            // 2) Pour chacun, fetch channels
            const updated = [];
            for (const ws of rawWorkspaces) {
                const r2 = await axios.get(`/api/workspaces/${ws._id}/channels`);
                ws.channels = r2.data; // un array de channels
                updated.push(ws);
            }

            // 3) Stocker dans le state “myWorkspaces”
            setMyWorkspaces(updated);
        } catch (err) {
            console.error('Erreur fetchWorkspacesAndChannels:', err);
        }
    };

    const [focusMessageId, setFocusMessageId] = useState('');

    const queryParams = new URLSearchParams(location.search);
    const paramChannelId = queryParams.get('channelId');
    const paramUserId = queryParams.get('userId');
    const paramFocusMsg = queryParams.get('focusMsg');

    useEffect(() => {
        // Si paramChannelId existe, on appelle handleSelectChannel(paramChannelId).
        // Idem pour paramUserId => handleSelectUser
        if (paramChannelId) {
            handleSelectChannel(paramChannelId);
        } else if (paramUserId) {
            handleSelectUser(paramUserId);
        }
    }, []);

    const handleSelectChannel = async (chId) => {
        setSelectedChannel(chId);
        setSelectedUser('');

        // === AJOUT ICI ===
        if (socket) {
            socket.emit('joinChannel', chId);
            console.log('joinChannel sent with ', chId);
        }

        // j'utilise await pour fetchChannelHistory => on attend
        await fetchChannelHistory(chId);

        // ensuite, si paramFocusMsg => setFocusMessageId
        if (paramFocusMsg) {
            setFocusMessageId(paramFocusMsg);
            const newParams = new URLSearchParams(location.search);
            newParams.delete('focusMsg');
            navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
        }
    };

    // -- 5) Quand on clique sur un user ou un channel dans la Sidebar
    // on fetch l’historique correspondant
    const handleSelectUser = async (uId) => {
        setSelectedUser(uId);
        setSelectedChannel('');
        await fetchDMHistory(uId);

        // si paramFocusMsg => setFocusMessageId
        if (paramFocusMsg) {
            setFocusMessageId(paramFocusMsg);
            const newParams = new URLSearchParams(location.search);
            newParams.delete('focusMsg');
            navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
        }
    };

    // -- 6) Historique DM
    const fetchDMHistory = async (otherUserId) => {
        if (!otherUserId) return;
        try {
            const res = await axios.get(`/api/direct-messages/${otherUserId}`);
            setMessages(res.data);
        } catch (err) {
            console.error('Erreur fetchDMHistory:', err);
        }
    };

    // -- 7) Historique channel
    const fetchChannelHistory = async (channelId) => {
        if (!channelId) return;
        try {
            // GET /api/channels/:channelId/messages
            const res = await axios.get(`/api/channels/${channelId}/messages`);
            setMessages(res.data);
        } catch (err) {
            console.error('Erreur fetchChannelHistory:', err);
        }
    };

    // -- 8) Envoi d’un message (DM ou channel)
// Extrait du code Chat.js

    const handleSendMessage = async (content, file) => {
        try {
            if (selectedUser) {
                // DM
                const formData = new FormData();
                const mentions = parseMentions(content);
                formData.append('receiverId', selectedUser);
                formData.append('content', content);
                formData.append('mentions', JSON.stringify(mentions));
                if (file) formData.append('file', file);

                await axios.post('/api/direct-messages', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });

            } else if (selectedChannel) {
                // Channel
                const formData = new FormData();
                const mentions = parseMentions(content);
                formData.append('content', content);
                formData.append('mentions', JSON.stringify(mentions));
                if (file) formData.append('file', file);

                await axios.post(`/api/channels/${selectedChannel}/messages`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }
        } catch (err) {
            console.error('Erreur handleSendMessage:', err);
        }
    };

    return (
        <div style={{display: 'flex', flex: '1'}}>
            <Sidebar
                users={users}
                myWorkspaces={myWorkspaces}
                onSelectUser={handleSelectUser}
                onSelectChannel={handleSelectChannel}
                selectedUser={selectedUser}
                selectedChannel={selectedChannel}
            />

            <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1}}>
                <ChatWindow
                    userId={userId}
                    messages={messages}
                    selectedUser={selectedUser}
                    selectedChannel={selectedChannel}
                    focusMessageId={focusMessageId}
                />
                <MessageInput
                    onSend={handleSendMessage}
                    disabled={!selectedUser && !selectedChannel}
                />
            </div>
        </div>
    );
}

export default Chat;