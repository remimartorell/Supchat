// src/pages/Chat.js
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from '../services/axiosConfig';

import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import MessageInput from '../components/MessageInput';

/**
 * Détecte les @mentions dans un message (ex: @JohnDoe).
 * Renvoie un tableau des pseudos mentionnés.
 */
function parseMentions(content) {
    const regex = /@(\S+)/g;
    const matches = content.matchAll(regex);
    const mentionNames = [];
    for (const match of matches) {
        mentionNames.push(match[1]);
    }
    return mentionNames;
}

function Chat({ onSocketReady }) {
    const navigate = useNavigate();
    const location = useLocation();

    // ------------------
    // ÉTATS PRINCIPAUX
    // ------------------
    const [socket, setSocket] = useState(null);
    const [userId, setUserId] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedChannel, setSelectedChannel] = useState('');
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [myWorkspaces, setMyWorkspaces] = useState([]);
    const [focusMessageId, setFocusMessageId] = useState('');

    /**
     * On conserve les refs pour `selectedUser` et `selectedChannel`
     * afin d'y accéder dans les callbacks socket,
     * sans avoir un state obsolète.
     */
    const selectedUserRef = useRef(selectedUser);
    const selectedChannelRef = useRef(selectedChannel);

    useEffect(() => {
        selectedUserRef.current = selectedUser;
    }, [selectedUser]);

    useEffect(() => {
        selectedChannelRef.current = selectedChannel;
    }, [selectedChannel]);

    // ----------------------------------------------------------------
    // 1) Récupère le profil de l'utilisateur connecté et applique le thème
    // ----------------------------------------------------------------
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const res = await axios.get('/api/auth/user');
                setUserId(res.data._id);
                setIsLoggedIn(true);

                // Application du thème défini par l'utilisateur ou "dark" par défaut
                const userTheme = res.data.theme || 'dark';
                document.documentElement.setAttribute('data-theme', userTheme);
                localStorage.setItem('appTheme', userTheme);
            } catch (err) {
                console.error('Erreur lors de la récupération du profil utilisateur :', err);
            }
        };
        fetchUserProfile();
    }, []);

    // ----------------------------------------------------------------
    // 2) Création du socket (unique) et écoute des événements "globaux"
    // ----------------------------------------------------------------
    useEffect(() => {
        if (!isLoggedIn || !userId) return;

        const newSocket = io(process.env.REACT_APP_API_URL);
        setSocket(newSocket);

        if (onSocketReady) {
            onSocketReady(newSocket);
        }

        newSocket.on('connect', () => {
            console.log('[Socket] connect :', newSocket.id);
            newSocket.emit('join', userId);
        });

        newSocket.on('joined', (msg) => {
            console.log('[Socket] joined:', msg);
        });

        newSocket.on('bot-message', (botMsg) => {
            console.log('[Socket] bot-message:', botMsg);
            setMessages(prev => [...prev, { ...botMsg, type: 'bot' }]);
        });


        newSocket.on('poll-result', (data) => {
            console.log('[Socket] poll-result:', data);
            // On met à jour le sondage existant, pas besoin d'ajouter un message.
            setMessages(prev =>
                prev.map(m =>
                    m._id === data._id
                        ? { ...m, votes: data.votes }
                        : m
                )
            );
        });



        const handleWorkspaceUpdated = () => {
            console.log('[Socket] workspace-updated => refresh');
            fetchWorkspacesAndChannels();
        };
        const handleWorkspaceRemoved = () => {
            console.log('[Socket] workspace-removed => refresh');
            fetchWorkspacesAndChannels();
        };
        newSocket.on('workspace-updated', handleWorkspaceUpdated);
        newSocket.on('workspace-removed', handleWorkspaceRemoved);

        return () => {
            newSocket.off('workspace-updated', handleWorkspaceUpdated);
            newSocket.off('workspace-removed', handleWorkspaceRemoved);
            newSocket.close();
            newSocket.disconnect();
        };
    }, [isLoggedIn, userId, onSocketReady]);

    // ----------------------------------------------------------------
    // 3) Événements liés aux DM (messages privés)
    // ----------------------------------------------------------------
    useEffect(() => {
        if (!socket) return;

        const handleNewPrivateMessage = (dm) => {
            console.log('[Socket] new-private-message:', dm);
            const amISender = String(dm.sender) === userId;
            const amIReceiver = String(dm.receiver) === userId;
            if (!amISender && !amIReceiver) return;

            if (
                selectedUserRef.current &&
                (
                    (String(dm.sender) === userId && String(dm.receiver) === selectedUserRef.current) ||
                    (String(dm.sender) === selectedUserRef.current && String(dm.receiver) === userId)
                )
            ) {
                setMessages((prev) => [...prev, dm]);
                if (!amISender) {
                    axios.put(`/api/direct-messages/${dm._id}/markAsRead`)
                        .catch(err => console.error('Erreur markAsRead DM:', err));
                }
            }
        };

        const handleDmMessageRead = (payload) => {
            console.log('[Socket] dm-message-read:', payload);
            setMessages(prev =>
                prev.map(m => {
                    if (m._id === payload.dmId && selectedUserRef.current) {
                        const senderId = String(m.sender._id || m.sender);
                        const receiverId = String(m.receiver._id || m.receiver);
                        const isCurrentDM =
                            (senderId === userId && receiverId === selectedUserRef.current) ||
                            (senderId === selectedUserRef.current && receiverId === userId);
                        if (isCurrentDM) {
                            if (!m.readBy) m.readBy = [];
                            const already = m.readBy.some(rb => rb.user === payload.userId);
                            if (!already) {
                                return { ...m, readBy: [...m.readBy, { user: payload.userId, readAt: new Date() }] };
                            }
                        }
                    }
                    return m;
                })
            );
        };

        socket.on('new-private-message', handleNewPrivateMessage);
        socket.on('dm-message-read', handleDmMessageRead);

        return () => {
            socket.off('new-private-message', handleNewPrivateMessage);
            socket.off('dm-message-read', handleDmMessageRead);
        };
    }, [socket, userId]);

    // ----------------------------------------------------------------
    // 4) Événements liés aux Channels
    // ----------------------------------------------------------------
    useEffect(() => {
        if (!socket) return;

        const handleNewChannelMessage = (channelMsg) => {
            console.log('[Socket] new-channel-message:', channelMsg);
            if (selectedChannelRef.current && channelMsg.channelId === selectedChannelRef.current) {
                channelMsg.channel = channelMsg.channelId;
                setMessages((prev) => [...prev, channelMsg]);
                if (String(channelMsg.sender) !== userId) {
                    axios.put(`/api/channels/${selectedChannelRef.current}/messages/${channelMsg._id}/markAsRead`)
                        .catch(err => console.error('Erreur markAsRead new message:', err));
                }
            }
        };

        const handleChannelMessageDeleted = (payload) => {
            console.log('[Socket] channel-message-deleted:', payload);
            if (selectedChannelRef.current && payload.channelId === selectedChannelRef.current) {
                setMessages(prev => prev.filter(m => m._id !== payload.messageId));
            }
        };

        const handleChannelMessageUpdated = (payload) => {
            console.log('[Socket] channel-message-updated:', payload);
            if (selectedChannelRef.current && payload.channelId === selectedChannelRef.current) {
                setMessages(prev =>
                    prev.map(m =>
                        m._id === payload.messageId
                            ? { ...m, content: payload.newContent, edited: payload.edited }
                            : m
                    )
                );
            }
        };

        const handleMessageReacted = (payload) => {
            console.log('[Socket] message-reacted:', payload);
            if (selectedChannelRef.current && payload.channelId === selectedChannelRef.current) {
                setMessages(prev =>
                    prev.map(msg => {
                        if (msg._id === payload.messageId) {
                            if (!msg.reactions) msg.reactions = [];
                            const existingIndex = msg.reactions.findIndex(r =>
                                (r.user._id && r.user._id === payload.reaction.user._id) ||
                                (typeof r.user === 'string' && r.user === payload.reaction.user)
                            );
                            if (existingIndex !== -1) {
                                const newReactions = [...msg.reactions];
                                newReactions[existingIndex] = payload.reaction;
                                msg.reactions = newReactions;
                            } else {
                                msg.reactions = [...msg.reactions, payload.reaction];
                            }
                        }
                        return msg;
                    })
                );
            }
        };

        const handleMentionNotification = (notif) => {
            alert(
                `Tu as été mentionné par ${notif.from}\nDans le channel ${notif.channelName}\nDu workspace ${notif.workspaceName}`
            );
        };

        const handleChannelAdded = (channel) => {
            console.log('[Socket] channel-added:', channel);
            setMyWorkspaces(prev =>
                prev.map(ws => {
                    if (String(ws._id) === String(channel.workspace)) {
                        const alreadyExists = ws.channels?.some(ch => ch._id === channel._id);
                        if (!alreadyExists) {
                            return { ...ws, channels: [...(ws.channels || []), channel] };
                        }
                    }
                    return ws;
                })
            );
        };

        const handleChannelDeleted = (payload) => {
            console.log('[Socket] channel-deleted:', payload);
            setMyWorkspaces(prev =>
                prev.map(ws => {
                    if (ws.channels) {
                        return { ...ws, channels: ws.channels.filter(ch => ch._id !== payload.channelId) };
                    }
                    return ws;
                })
            );
        };

        const handleMessageRead = (payload) => {
            console.log('[Socket] message-read:', payload);
            if (selectedChannelRef.current && payload.channelId === selectedChannelRef.current) {
                setMessages(prev =>
                    prev.map(msg => {
                        if (msg._id === payload.messageId) {
                            if (!msg.readBy) msg.readBy = [];
                            const already = msg.readBy.some(rb => rb.user === payload.userId);
                            if (!already) {
                                msg.readBy.push({ user: payload.userId, readAt: new Date() });
                            }
                        }
                        return msg;
                    })
                );
            }
        };

        const handleDmMessageReacted = (payload) => {
            console.log('[Socket] dm-message-reacted:', payload);
            setMessages(prev =>
                prev.map(dm => {
                    if (dm._id === payload.dmId) {
                        if (!dm.reactions) dm.reactions = [];
                        const existingIndex = dm.reactions.findIndex(
                            r => r.user && r.user._id === payload.reaction.user._id
                        );
                        if (existingIndex !== -1) {
                            const newReactions = [...dm.reactions];
                            newReactions[existingIndex] = payload.reaction;
                            dm.reactions = newReactions;
                        } else {
                            dm.reactions = [...dm.reactions, payload.reaction];
                        }
                    }
                    return dm;
                })
            );
        };

        socket.on('dm-message-reacted', handleDmMessageReacted);

        const handleDmMessageUpdated = (payload) => {
            // payload = { dmId, newContent, edited }
            setMessages(prev =>
                prev.map(dm => {
                    if (dm._id === payload.dmId) {
                        return { ...dm, content: payload.newContent, edited: payload.edited };
                    }
                    return dm;
                })
            );
        };

        socket.on('new-channel-message', handleNewChannelMessage);
        socket.on('channel-message-deleted', handleChannelMessageDeleted);
        socket.on('channel-message-updated', handleChannelMessageUpdated);
        socket.on('message-reacted', handleMessageReacted);
        socket.on('mention-notification', handleMentionNotification);
        socket.on('channel-added', handleChannelAdded);
        socket.on('channel-deleted', handleChannelDeleted);
        socket.on('message-read', handleMessageRead);
        socket.on('dm-message-reacted', handleDmMessageReacted);
        socket.on('dm-message-updated', handleDmMessageUpdated);

        return () => {
            socket.off('new-channel-message', handleNewChannelMessage);
            socket.off('channel-message-deleted', handleChannelMessageDeleted);
            socket.off('channel-message-updated', handleChannelMessageUpdated);
            socket.off('message-reacted', handleMessageReacted);
            socket.off('mention-notification', handleMentionNotification);
            socket.off('channel-added', handleChannelAdded);
            socket.off('channel-deleted', handleChannelDeleted);
            socket.off('message-read', handleMessageRead);
            socket.off('dm-message-reacted', handleDmMessageReacted);
            socket.off('dm-message-updated', handleDmMessageUpdated);
        };
    }, [socket, userId]);

    // ----------------------------------------------------------------
    // 5) Rejoindre la room du channel sélectionné
    // ----------------------------------------------------------------
    useEffect(() => {
        if (socket && selectedChannel) {
            socket.emit('joinChannel', selectedChannel);
            console.log('[Socket] joinChannel =>', selectedChannel);
        }
    }, [socket, selectedChannel]);

    // ----------------------------------------------------------------
    // 6) Charger la liste des utilisateurs et workspaces
    // ----------------------------------------------------------------
    useEffect(() => {
        if (isLoggedIn && userId) {
            fetchUsers();
            fetchWorkspaces();
        }
    }, [isLoggedIn, userId]);

    const fetchUsers = async () => {
        try {
            const res = await axios.get('/api/auth/allUsers');
            setUsers(res.data);
        } catch (err) {
            console.error('Erreur fetchUsers:', err);
        }
    };

    const fetchWorkspaces = async () => {
        try {
            const res = await axios.get('/api/workspaces');
            setMyWorkspaces(res.data);
        } catch (err) {
            console.error('Erreur fetchWorkspaces:', err);
        }
    };

    // ----------------------------------------------------------------
    // 7) Charger workspaces + channels
    // ----------------------------------------------------------------
    useEffect(() => {
        if (isLoggedIn && userId) {
            fetchWorkspacesAndChannels();
        }
    }, [isLoggedIn, userId]);

    const fetchWorkspacesAndChannels = async () => {
        try {
            const res = await axios.get('/api/workspaces');
            const rawWorkspaces = res.data;
            const updated = [];
            for (const ws of rawWorkspaces) {
                const r2 = await axios.get(`/api/workspaces/${ws._id}/channels`);
                ws.channels = r2.data;
                updated.push(ws);
            }
            setMyWorkspaces(updated);
        } catch (err) {
            console.error('Erreur fetchWorkspacesAndChannels:', err);
        }
    };

    // ----------------------------------------------------------------
    // 8) Surveiller les paramètres d'URL (channelId, userId, focusMsg)
    // ----------------------------------------------------------------
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const channelId = queryParams.get('channelId');
        const focusMsg = queryParams.get('focusMsg');
        const userParam = queryParams.get('userId');

        if (channelId) {
            handleSelectChannel(channelId, focusMsg);
        } else if (userParam) {
            handleSelectUser(userParam);
        }
        // eslint-disable-next-line
    }, [location.search]);

    // ----------------------------------------------------------------
    // 9) Sélection d’un channel
    // ----------------------------------------------------------------
    const handleSelectChannel = async (chId, focusMsgParam) => {
        // Réinitialiser la conversation pour ne pas conserver d'anciens messages
        setSelectedUser('');
        setSelectedChannel(chId);
        setMessages([]);

        const fetched = await fetchChannelHistory(chId);
        await markChannelMessagesAsRead(chId, fetched);
        setMessages(fetched);

        if (focusMsgParam) {
            setFocusMessageId(focusMsgParam);
            const newParams = new URLSearchParams(location.search);
            newParams.delete('focusMsg');
            navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
        }
    };

    // ----------------------------------------------------------------
    // 10) Sélection d’un utilisateur (DM)
    // ----------------------------------------------------------------
    const handleSelectUser = async (uId) => {
        setSelectedChannel('');
        setSelectedUser(uId);
        setMessages([]);

        const fetchedDMs = await fetchDMHistory(uId);
        setMessages(fetchedDMs);
        await markDMsAsRead(fetchedDMs);

        const queryParams = new URLSearchParams(location.search);
        if (queryParams.has('focusMsg')) {
            queryParams.delete('focusMsg');
            navigate(`${location.pathname}?${queryParams.toString()}`, { replace: true });
        }
    };

    // ----------------------------------------------------------------
    // 11) Historique DM
    // ----------------------------------------------------------------
    const fetchDMHistory = async (otherUserId) => {
        try {
            const res = await axios.get(`/api/direct-messages/${otherUserId}`);
            return res.data;
        } catch (err) {
            console.error('Erreur fetchDMHistory:', err);
            return [];
        }
    };

    // ----------------------------------------------------------------
    // 12) Historique d’un channel
    // ----------------------------------------------------------------
    const fetchChannelHistory = async (channelId) => {
        if (!channelId) return [];
        try {
            const res = await axios.get(`/api/channels/${channelId}/messages`);
            return res.data;
        } catch (err) {
            console.error('Erreur fetchChannelHistory:', err);
            return [];
        }
    };

    // ----------------------------------------------------------------
// 13) Envoyer un message (DM ou channel)
// ----------------------------------------------------------------
    const handleSendMessage = async (content, file) => {
        if (content.startsWith('/')) {
            handleCommand(content);
            return;
        }

        try {
            const mentions = parseMentions(content);
            const formData = new FormData();
            formData.append('content', content);
            formData.append('mentions', JSON.stringify(mentions));
            if (file) {
                formData.append('file', file);
            }

            if (selectedUser) {
                const receiverId =
                    typeof selectedUser === 'object' ? selectedUser._id : selectedUser;
                formData.append('receiverId', receiverId);

                // ❌ Ne fais pas de setMessages ici : ça crée un doublon !
                await axios.post('/api/direct-messages', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });

            } else if (selectedChannel) {
                await axios.post(`/api/channels/${selectedChannel}/messages`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

        } catch (err) {
            console.error('Erreur handleSendMessage:', err);
        }
    };

// ----------------------------------------------------------------
// 14) Traitement des commandes (ex: /meeting, /poll, /remindme)
// ----------------------------------------------------------------
    const handleCommand = (content) => {
        const fullCommand = content.trim();
        const spaceIndex = fullCommand.indexOf(' ');
        const command = spaceIndex !== -1 ? fullCommand.substring(0, spaceIndex) : fullCommand;
        const argsString = spaceIndex !== -1 ? fullCommand.substring(spaceIndex + 1).trim() : '';
        const lowerCommand = command.toLowerCase();

        console.log(`🛠️ Commande détectée :`, lowerCommand);

        // -----------------------
        // 📅 Commande /meeting
        // -----------------------
        if (lowerCommand === '/meeting') {
            const [meetingDate, meetingTime, ...titleParts] = argsString.split(' ');
            const meetingTitle = titleParts.join(' ') || 'Réunion';
            if (!meetingDate || !meetingTime) {
                alert("❌ Format : /meeting 2025-04-20 15:30 Réunion hebdo");
                return;
            }

            console.log(`🧩 Commande /meeting : ${meetingTitle} à ${meetingDate} ${meetingTime}`);
            socket.emit('meeting-reminder', { meetingDate, meetingTime, meetingTitle });
            return;
        }

        // -----------------------
        // 📊 Commande /poll
        // -----------------------
        if (lowerCommand === '/poll') {
            const [questionPart, ...optionParts] = argsString.split('|');
            const pollQuestion = questionPart.trim();
            const options = optionParts.map(opt => opt.trim()).filter(Boolean);

            if (!pollQuestion || options.length < 2 || options.length > 4) {
                alert("❌ Format invalide. Utilise : /poll Question ? | Option1 | Option2 ... (2 à 4 options max)");
                return;
            }


            console.log(`📊 Émission socket /poll`, { question: pollQuestion, options });
            socket.emit('poll', { question: pollQuestion, options });


            return;
        }
// -----------------------
// ⏰ Commande /remindme
// -----------------------
        if (lowerCommand === '/remindme') {
            const [time, ...reminderParts] = argsString.split(' ');
            const message = reminderParts.join(' ').trim();

            if (!time || !message) {
                alert("❌ Format : /remindme 10min Va boire de l'eau !");
                return;
            }

            console.log(`⏰ Émission socket /remindme`, { time, message });
            socket.emit('remindme', { time, message }); // ← 🔥 ICI

            setMessages(prev => [
                ...prev,
                {
                    _id: Date.now(),
                    content: `⏰ Rappel dans ${time} programmé`,
                    type: 'system'
                }
            ]);
            return;
        }


        // -----------------------
        // ❓ Commande inconnue
        // -----------------------
        console.warn(`❓ Commande inconnue : ${lowerCommand}`);
    };


    // ----------------------------------------------------------------
    // 15) Autorisation de suppression d'un message
    // ----------------------------------------------------------------
    let canDelete = false;
    if (selectedChannel) {
        const wsWithChannel = myWorkspaces.find(ws =>
            ws.channels && ws.channels.some(ch => ch._id === selectedChannel)
        );
        if (wsWithChannel) {
            const currentMember = wsWithChannel.members.find(m =>
                m.user === userId || (typeof m.user === 'object' && m.user._id === userId)
            );
            if (currentMember && ['owner', 'admin', 'moderator'].includes(currentMember.role)) {
                canDelete = true;
            }
        }
    }

    // ----------------------------------------------------------------
    // 16) Marquer les messages (channel) comme lus
    // ----------------------------------------------------------------
    const markChannelMessagesAsRead = async (channelId, channelMessages) => {
        for (const msg of channelMessages) {
            if (String(msg.sender?._id || msg.sender) === userId) continue;
            const alreadyRead = msg.readBy?.some(rb => String(rb.user) === userId);
            if (!alreadyRead) {
                try {
                    await axios.put(`/api/channels/${channelId}/messages/${msg._id}/markAsRead`);
                } catch (err) {
                    console.error('Erreur markAsRead:', err);
                }
            }
        }
    };

    // ----------------------------------------------------------------
    // 17) Marquer les DM comme lus
    // ----------------------------------------------------------------
    const markDMsAsRead = async (directMessages) => {
        for (const msg of directMessages) {
            if (String(msg.sender?._id || msg.sender) === userId) continue;
            const already = msg.readBy?.some(rb => String(rb.user) === userId);
            if (!already) {
                try {
                    await axios.put(`/api/direct-messages/${msg._id}/markAsRead`);
                } catch (err) {
                    console.error('Erreur marking DM read:', err);
                }
            }
        }
    };

    // ----------------------------------------------------------------
    // 18) Recharger la liste des utilisateurs lors du changement de conversation
    // ----------------------------------------------------------------
    useEffect(() => {
        if (selectedUser || selectedChannel) {
            axios.get('/api/auth/allUsers')
                .then(res => setUsers(res.data))
                .catch(err => console.error('Erreur fetch allUsers:', err));
        }
    }, [selectedUser, selectedChannel]);

    // -------------------
    // RENDU FINAL
    // -------------------
    return (
        <div className="chat-layout">
            <div className="sidebar-layout">
                <Sidebar
                    socket={socket}
                    userId={userId}
                    users={users}
                    myWorkspaces={myWorkspaces}
                    onSelectUser={handleSelectUser}
                    onSelectChannel={handleSelectChannel}
                    selectedUser={selectedUser}
                    selectedChannel={selectedChannel}
                    onWorkspacesRefresh={async () => {
                        await fetchWorkspacesAndChannels();
                    }}
                />
            </div>

            <div className="chat-layout-main">
                <ChatWindow
                    userId={userId}
                    messages={messages}
                    users={users}
                    selectedUser={selectedUser}
                    selectedChannel={selectedChannel}
                    focusMessageId={focusMessageId}
                    // canDelete={canDelete} // Optionnel : pour contrôler la suppression selon le rôle
                    setMessages={setMessages}
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


/*
/poll Quelle est votre couleur préférée ? | Rouge | Bleu | Vert
/remindme 10min meeting !


*
* */