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

        // On se connecte via Socket.IO
        const newSocket = io(process.env.REACT_APP_API_URL);
        setSocket(newSocket);

        if (onSocketReady) {
            onSocketReady(newSocket);
        }

        // Quand on est réellement connectés côté socket :
        newSocket.on('connect', () => {
            console.log('[Socket] connect :', newSocket.id);
            newSocket.emit('join', userId); // Annonce de notre userId
        });

        newSocket.on('joined', (msg) => {
            console.log('[Socket] joined:', msg);
        });

        // Rafraîchir la liste Workspaces/Channels quand un workspace est modifié ou supprimé
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

        // Nettoyage
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

            // Si ça ne me concerne pas => on ignore
            if (!amISender && !amIReceiver) return;

            // Vérifier si ce message privé correspond à la conversation DM en cours
            if (
                selectedUserRef.current &&
                (
                    (String(dm.sender) === userId && String(dm.receiver) === selectedUserRef.current) ||
                    (String(dm.sender) === selectedUserRef.current && String(dm.receiver) === userId)
                )
            ) {
                // On l'ajoute aux messages
                setMessages((prev) => [...prev, dm]);

                // Si je suis le récepteur => je marque comme lu
                if (!amISender) {
                    axios.put(`/api/direct-messages/${dm._id}/markAsRead`)
                        .catch(err => console.error('Erreur markAsRead DM:', err));
                }
            }
        };

        const handleDmMessageRead = (payload) => {
            // payload = { dmId, userId }
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
                                return {
                                    ...m,
                                    readBy: [...m.readBy, { user: payload.userId, readAt: new Date() }],
                                };
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
                // On force channelMsg.channel = channelId
                channelMsg.channel = channelMsg.channelId;
                setMessages((prev) => [...prev, channelMsg]);

                // Si je ne suis pas l'émetteur => markAsRead
                if (String(channelMsg.sender) !== userId) {
                    axios
                        .put(`/api/channels/${selectedChannelRef.current}/messages/${channelMsg._id}/markAsRead`)
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
                            // Trouver la réaction existante pour le même user
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
                `Tu as été mentionné par ${notif.from}\n` +
                `Dans le channel ${notif.channelName}\n` +
                `Du workspace ${notif.workspaceName}`
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

        // Pour DM : réactions et modifications
        const handleDmMessageReacted = (payload) => {
            // payload = { dmId, reaction }
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

        // On se branche sur tous les événements
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
    // 6) Charger la liste des utilisateurs, workspaces
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
    // 8) Surveiller query params ?channelId=? / ?userId=? / ?focusMsg=?
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
        // On réinitialise la conversation pour éviter de voir
        // d'anciens messages d'une autre conversation
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
    // 10) Sélection d’un user (DM)
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
    // 12) Historique channel
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
        try {
            const mentions = parseMentions(content);
            const formData = new FormData();
            formData.append('content', content);
            formData.append('mentions', JSON.stringify(mentions));
            if (file) {
                formData.append('file', file);
            }

            if (selectedUser) {
                // DM
                formData.append('receiverId', selectedUser);
                await axios.post('/api/direct-messages', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else if (selectedChannel) {
                // Channel
                await axios.post(`/api/channels/${selectedChannel}/messages`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }
        } catch (err) {
            console.error('Erreur handleSendMessage:', err);
        }
    };

    // ----------------------------------------------------------------
    // 14) Peut-on supprimer un message ?
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
    // 15) Marquer les messages (channel) comme lus
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
    // 16) Marquer les DM comme lus
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
    // 17) Recharger la liste des users si la conv change
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
                    // canDelete={canDelete} // si vous voulez gérer la suppression selon le rôle
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
