// src/pages/Chat.js
import React, { useEffect, useState, useRef, useMemo } from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import {io} from 'socket.io-client';
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

function Chat({onSocketReady}) {
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
    const [unreadDMs, setUnreadDMs] = useState({});
    const [unreadChannels, setUnreadChannels] = useState({});
    const [notifications, setNotifications]     = useState([]);
    const [unreadNotifCount, setUnreadNotifCount] = useState(0);

    // Liste des channels mutés (mutedChannels stocké en localStorage)
    const [mutedChannels, setMutedChannels] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('mutedChannels')) || [];
        } catch {
            return [];
        }
    });

    // Basculer le mute/unmute d’un channel
    const toggleChannelMute = (channelId) => {
        setMutedChannels(prev => {
            const next = prev.includes(channelId)
                ? prev.filter(id => id !== channelId)
                : [...prev, channelId];
            localStorage.setItem('mutedChannels', JSON.stringify(next));
            return next;
        });
    };

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

    // → Charger les notifications existantes au login
    // → Charger les compteurs DM non-lus pour chaque utilisateur
    useEffect(() => {
        if (!isLoggedIn || users.length === 0) return;
        const fetchUnreadDMs = async () => {
            const counts = {};
            await Promise.all(
                users.map(async u => {
                    try {
                        const res = await axios.get(`/api/direct-messages/${u._id}/unread-count`);
                        counts[u._id] = res.data.count;
                    } catch (err) {
                        console.error(`Erreur fetch DM count pour ${u._id}:`, err);
                    }
                })
            );
            setUnreadDMs(counts);
        };
        fetchUnreadDMs();
    }, [isLoggedIn, users]);


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

        newSocket.on('poll-result', (data) => {
            console.log('[Socket] poll-result:', data);
            // On met à jour le sondage existant, pas besoin d'ajouter un message.
            setMessages(prev =>
                prev.map(m =>
                    m._id === data._id
                        ? {...m, votes: data.votes}
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
            const amISender   = String(dm.sender) === userId;
            const amIReceiver = String(dm.receiver) === userId;
            if (!amISender && !amIReceiver) return;

            // Si on est DANS la conversation, on ajoute le message
            if (
                selectedUserRef.current &&
                (
                    (String(dm.sender) === userId && String(dm.receiver) === selectedUserRef.current) ||
                    (String(dm.sender) === selectedUserRef.current && String(dm.receiver) === userId)
                )
            ) {
                setMessages(prev => [...prev, dm]);
                if (!amISender) {
                    axios.put(`/api/direct-messages/${dm._id}/markAsRead`)
                        .catch(err => console.error('Erreur markAsRead DM:', err));
                }
            }
            // Sinon, si c'est un DM entrant, on incrémente le badge
            else if (!amISender && amIReceiver) {
                setUnreadDMs(prev => ({
                    ...prev,
                    [dm.sender]: (prev[dm.sender] || 0) + 1
                }));
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
                                return {...m, readBy: [...m.readBy, {user: payload.userId, readAt: new Date()}]};
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

    // Écoute en temps réel des notifications
    useEffect(() => {
        if (!socket) return;
        const handleNewNotification = (notif) => {
            setNotifications(prev => [notif, ...prev]);
            setUnreadNotifCount(c => c + 1);
        };
        socket.on('new-notification', handleNewNotification);
        return () => {
            socket.off('new-notification', handleNewNotification);
        };
    }, [socket]);


    // ----------------------------------------------------------------
// 4) Événements liés aux Channels
// ----------------------------------------------------------------
    useEffect(() => {
        if (!socket) return;

        // Quand on reçoit un message dans un channel :
        const handleNewChannelMessage = (msg) => {
            // Si on est DANS le channel concerné => on ajoute le message à la liste
            if (selectedChannelRef.current && msg.channelId === selectedChannelRef.current) {
                setMessages(prev => [...prev, msg]);
                // Marque comme lu si ce n'est pas toi
                if (String(msg.sender) !== userId) {
                    axios.put(`/api/channels/${selectedChannelRef.current}/messages/${msg._id}/markAsRead`)
                        .catch(err => console.error('Erreur markAsRead new message:', err));
                }
            } else {
                // Sinon on incrémente le badge non-lu
                setUnreadChannels(prev => ({
                    ...prev,
                    [msg.channelId]: (prev[msg.channelId] || 0) + 1
                }));
            }
        };

        // Quand un message est lu (depuis le backend)
        const handleUnreadUpdate = ({ channelId, count, userId: payloadUserId }) => {
            // Si c'est bien toi le user concerné par l'update
            if (payloadUserId && String(payloadUserId) !== String(userId)) return;
            setUnreadChannels(prev => ({
                ...prev,
                [channelId]: count
            }));
        };

        // Tous les autres handlers socket (déjà en place)…
        const handleChannelMessageDeleted = (payload) => {
            if (selectedChannelRef.current && payload.channelId === selectedChannelRef.current) {
                setMessages(prev => prev.filter(m => m._id !== payload.messageId));
            }
        };
        const handleChannelMessageUpdated = (payload) => {
            if (selectedChannelRef.current && payload.channelId === selectedChannelRef.current) {
                setMessages(prev =>
                    prev.map(m =>
                        m._id === payload.messageId
                            ? {...m, content: payload.newContent, edited: payload.edited}
                            : m
                    )
                );
            }
        };
        const handleMentionNotification = (notif) => {
            alert(
                `Tu as été mentionné par ${notif.from}\nDans le channel ${notif.channelName}\nDu workspace ${notif.workspaceName}`
            );
        };

        const handleChannelAdded = (channel) => {
            setMyWorkspaces(prev =>
                prev.map(ws => {
                    if (String(ws._id) === String(channel.workspace)) {
                        const alreadyExists = ws.channels?.some(ch => ch._id === channel._id);
                        if (!alreadyExists) {
                            return {...ws, channels: [...(ws.channels || []), channel]};
                        }
                    }
                    return ws;
                })
            );
        };

        const handleChannelDeleted = (payload) => {
            setMyWorkspaces(prev =>
                prev.map(ws => {
                    if (ws.channels) {
                        return {...ws, channels: ws.channels.filter(ch => ch._id !== payload.channelId)};
                    }
                    return ws;
                })
            );
        };

        const handleMessageRead = (payload) => {
            if (selectedChannelRef.current && payload.channelId === selectedChannelRef.current) {
                setMessages(prev =>
                    prev.map(msg => {
                        if (msg._id === payload.messageId) {
                            if (!msg.readBy) msg.readBy = [];
                            const already = msg.readBy.some(rb => rb.user === payload.userId);
                            if (!already) {
                                msg.readBy.push({user: payload.userId, readAt: new Date()});
                            }
                        }
                        return msg;
                    })
                );
            }
        };

        const handleDmMessageReacted = (payload) => {
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

        const handleDmMessageUpdated = (payload) => {
            setMessages(prev =>
                prev.map(dm => {
                    if (dm._id === payload.dmId) {
                        return {...dm, content: payload.newContent, edited: payload.edited};
                    }
                    return dm;
                })
            );
        };
        // --- ENREGISTREMENT DES EVENTS ---
        socket.on('new-channel-message', handleNewChannelMessage);
        socket.on('channel:unread-update', handleUnreadUpdate);
        socket.on('channel-message-deleted', handleChannelMessageDeleted);
        socket.on('channel-message-updated', handleChannelMessageUpdated);

        return () => {
            socket.off('new-channel-message', handleNewChannelMessage);
            socket.off('channel:unread-update', handleUnreadUpdate);
            socket.off('channel-message-deleted', handleChannelMessageDeleted);
            socket.off('channel-message-updated', handleChannelMessageUpdated);
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
            // Pour debug :
            console.log('WORKSPACES:', updated);
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
        setSelectedUser('');
        setSelectedChannel(chId);
        setMessages([]);
        // Remise à zéro du compteur de non lus pour ce channel !
        setUnreadChannels(prev => ({ ...prev, [chId]: 0 }));

        const fetched = await fetchChannelHistory(chId);
        await markChannelMessagesAsRead(chId, fetched);
        setMessages(fetched);

        if (focusMsgParam) {
            setFocusMessageId(focusMsgParam);
            const newParams = new URLSearchParams(location.search);
            newParams.delete('focusMsg');
            navigate(`${location.pathname}?${newParams.toString()}`, {replace: true});
        }
    };


    // ----------------------------------------------------------------
    // 10) Sélection d’un utilisateur (DM)
    // ----------------------------------------------------------------
    const handleSelectUser = async (uId) => {
        setSelectedChannel('');
        setSelectedUser(uId);
        setMessages([]);
        // Remise à zéro du compteur de non lus pour ce DM !
        setUnreadDMs(prev => ({ ...prev, [uId]: 0 }));

        const fetchedDMs = await fetchDMHistory(uId);
        setMessages(fetchedDMs);
        await markDMsAsRead(fetchedDMs);

        const queryParams = new URLSearchParams(location.search);
        if (queryParams.has('focusMsg')) {
            queryParams.delete('focusMsg');
            navigate(`${location.pathname}?${queryParams.toString()}`, {replace: true});
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
        const ws = myWorkspaces.find(ws => ws.channels?.some(c => c._id === channelId));
        if (!ws) return [];
        try {
            const res = await axios.get(`/api/workspaces/${ws._id}/channels/${channelId}/messages`);
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
                    headers: {'Content-Type': 'multipart/form-data'},
                });

            } else if (selectedChannel) {
                await axios.post(`/api/channels/${selectedChannel}/messages`, formData, {
                    headers: {'Content-Type': 'multipart/form-data'},
                });
            }

        } catch (err) {
            console.error('Erreur handleSendMessage:', err);
        }
    };

// ----------------------------------------------------------------
// 14) Traitement des commandes (ex: /meeting, /poll, /remindme)
// ----------------------------------------------------------------
    const handleCommand = async (content) => {
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
            const isoStartTime = new Date(`${meetingDate}T${meetingTime}`);

            if (isNaN(isoStartTime.getTime())) {
                console.warn('❌ Format attendu : /meeting YYYY-MM-DD HH:mm Titre');
                return;
            }

            try {
                await axios.post('/api/meetings/create', {
                    startTime: isoStartTime,
                    title: meetingTitle,
                    channel: selectedChannel || null,
                    receiver: selectedUser || null,
                });

                socket.emit('meeting-reminder', {
                    meetingDate,
                    meetingTime,
                    meetingTitle,
                    channelId: selectedChannel,
                    receiverId: selectedUser,
                });

            } catch (err) {
                console.error('Erreur lors de la création de la réunion :', err);
            }

            return;
        }


        // -----------------------
        // 📊 Commande /poll
        // -----------------------
        if (lowerCommand === '/poll') {
            // on découpe la question et les options
            const [questionPart, ...optionParts] = argsString.split('|');
            const pollQuestion = questionPart.trim();
            const options = optionParts.map(opt => opt.trim()).filter(Boolean);
            socket.emit('poll', {
                question: pollQuestion,
                options,
                channelId: selectedChannel,
                receiverId: selectedUser
            });
            return;
        }

// -----------------------
// ⏰ Commande /remindme
// -----------------------
        if (lowerCommand === '/remindme') {
            // on découpe le délai et le message
            const [time, ...messageParts] = argsString.split(' ');
            const message = messageParts.join(' ').trim();
            socket.emit('remindme', {
                time,
                message,
                channelId: selectedChannel,
                receiverId: selectedUser
            });
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


    // Liste des channels du workspace actif (pour les #hashtags)
    const currentChannels = useMemo(() => {
        if (!selectedChannel) return [];
        const ws = myWorkspaces.find(ws => ws.channels?.some(c => c._id === selectedChannel));
        return ws?.channels || [];
    }, [myWorkspaces, selectedChannel]);

// -------------------
// données pour MessageInput
// -------------------
    const mentionData = users.map(u => ({ id: u._id, display: u.username || u.name }));
    const channelData  = currentChannels.map(c => {
        // 🔒 si privé, 🔕 si muté
        const lockIcon = c.type === 'private' ? ' 🔒' : '';
        const muteIcon = mutedChannels.includes(c._id) ? ' 🔕' : '';
        return {
            id: c._id,
            display: c.name + lockIcon + muteIcon
        };
    });
    const commandData = [
        { id: 'meeting', display: 'meeting' },
        { id: 'poll',    display: 'poll'    },
        { id: 'remindme',display: 'remindme'}
    ];


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
                    onWorkspacesRefresh={fetchWorkspacesAndChannels}
                    unreadDMs={unreadDMs}
                    setUnreadDMs={setUnreadDMs}
                    unreadChannels={unreadChannels}
                    setUnreadChannels={setUnreadChannels}
                    unreadNotifCount={unreadNotifCount}
                    notifications={notifications}
                    mutedChannels={mutedChannels}
                    onToggleChannelMute={toggleChannelMute}
                />
            </div>
            <div className="chat-layout-main">
                <ChatWindow
                    socket={socket}
                    userId={userId}
                    messages={messages}
                    users={users}
                    selectedUser={selectedUser}
                    selectedChannel={selectedChannel}
                    focusMessageId={focusMessageId}
                    canDelete={canDelete}
                    setMessages={setMessages}
                    channels={currentChannels}
                    onChannelClick={handleSelectChannel}
                />
                <MessageInput
                    onSend={handleSendMessage}
                    disabled={!selectedUser && !selectedChannel}
                    users={mentionData}
                    channels={channelData}
                    commands={commandData}
                />
            </div>
        </div>
    );
}

export default Chat;


/* Commande Bot
/poll Quelle est votre couleur préférée ? | Rouge | Bleu | Vert
/remindme 10min meeting !
/meeting 2025-04-29 15:30 Réunion hebdo


*
* */