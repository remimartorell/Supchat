// src/pages/Chat.js
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from '../services/axiosConfig';

import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import MessageInput from '../components/MessageInput';

import { useLocation, useNavigate } from 'react-router-dom';

// Détecter les @mentions dans un message
function parseMentions(content) {
    const regex = /@(\S+)/g;
    const matches = content.matchAll(regex);
    const mentionNames = [];
    for (const match of matches) {
        mentionNames.push(match[1]); // ex: "JohnDoe"
    }
    return mentionNames;
}

function Chat({ onSocketReady }) {
    const navigate = useNavigate();
    const location = useLocation();

    const [socket, setSocket] = useState(null);

    // ID de l'utilisateur connecté
    const [userId, setUserId] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Sélection courante : un user pour DM ou un channel
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedChannel, setSelectedChannel] = useState('');

    // Liste des messages (DM ou channel)
    const [messages, setMessages] = useState([]);

    // Pour la Sidebar
    const [users, setUsers] = useState([]);          // liste d'utilisateurs
    const [myWorkspaces, setMyWorkspaces] = useState([]); // liste de workspaces

    // focus sur un message précis (via ?focusMsg=xxx)
    const [focusMessageId, setFocusMessageId] = useState('');

    //----------------------------------------------------------------
    // 1) Récupérer l'utilisateur connecté (userId)
    //----------------------------------------------------------------
    useEffect(() => {
        const fetchUserId = async () => {
            try {
                const res = await axios.get('/api/auth/user');
                setUserId(res.data._id);
                setIsLoggedIn(true);
            } catch (err) {
                console.error('Erreur fetchUserId:', err);
            }
        };
        fetchUserId();
    }, []);

    //----------------------------------------------------------------
    // 2) Créer / Recréer le socket & brancher tous les handlers
    //    => dépend de [isLoggedIn, userId, selectedUser, selectedChannel]
    //----------------------------------------------------------------
    useEffect(() => {
        if (!isLoggedIn || !userId) return;

        const newSocket = io(process.env.REACT_APP_API_URL);
        setSocket(newSocket);

        if (onSocketReady) {
            onSocketReady(newSocket);
        }

        // Quand la connexion est établie
        newSocket.on('connect', () => {
            console.log('[Socket] connect :', newSocket.id);
            // Annonce de notre userId pour la présence (pastilles vertes)
            newSocket.emit('join', userId);
        });

        newSocket.on('joined', (msg) => {
            console.log('[Socket] joined:', msg);
        });

        //--- 2-A) WORKSPACES / rafraîchir la liste
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

        //--- 2-B) MESSAGES PRIVÉS (DM)
        const handleNewPrivateMessage = (dm) => {
            console.log('[Socket] new-private-message:', dm);

            // 1) Vérifier si ça me concerne
            const amISender = (String(dm.sender) === userId);
            const amIReceiver = (String(dm.receiver) === userId);
            if (!amISender && !amIReceiver) return;

            // 2) Est-ce le DM qu'on affiche ?
            const isCurrentDM =
                (String(dm.sender) === userId && String(dm.receiver) === selectedUser)
                || (String(dm.sender) === selectedUser && String(dm.receiver) === userId);

            // 3) Si c'est le DM courant => on l’ajoute
            if (isCurrentDM) {
                setMessages((prev) => [...prev, dm]);

                // 4) Si je suis le récepteur => je marque "lu"
                if (!amISender) {
                    axios
                        .put(`/api/direct-messages/${dm._id}/markAsRead`)
                        .catch(err => console.error('Erreur markAsRead DM:', err));
                }
            }
        };

        const handleDmMessageRead = (payload) => {
            // payload = { dmId, userId }
            console.log('[Socket] dm-message-read:', payload);

            setMessages(prev => {
                // 1) Trouver le message
                const foundMsg = prev.find(m => m._id === payload.dmId);
                if (!foundMsg) return prev;

                // 2) Vérifier qu’il appartient au DM courant
                const senderId   = String(foundMsg.sender._id || foundMsg.sender);
                const receiverId = String(foundMsg.receiver._id || foundMsg.receiver);
                const isCurrentDM =
                    (senderId === userId && receiverId === selectedUser) ||
                    (senderId === selectedUser && receiverId === userId);

                if (!isCurrentDM) {
                    // => on ignore, ça ne concerne pas le DM affiché
                    return prev;
                }

                // 3) Mettre à jour readBy
                return prev.map(m => {
                    if (m._id === payload.dmId) {
                        if (!m.readBy) m.readBy = [];
                        const already = m.readBy.some(rb => rb.user === payload.userId);
                        if (!already) {
                            m.readBy.push({ user: payload.userId, readAt: new Date() });
                        }
                    }
                    return m;
                });
            });
        };

        newSocket.on('new-private-message', handleNewPrivateMessage);
        newSocket.on('dm-message-read', handleDmMessageRead);

        //--- 2-C) CHANNELS
        const handleNewChannelMessage = (channelMsg) => {
            console.log('[Socket] new-channel-message:', channelMsg);

            // si on est sur le channel correspondant => on l'ajoute
            if (selectedChannel && channelMsg.channelId === selectedChannel) {
                channelMsg.channel = channelMsg.channelId; // on force
                setMessages((prev) => [...prev, channelMsg]);

                // si je ne suis pas l'émetteur => markAsRead
                if (String(channelMsg.sender) !== userId) {
                    axios
                        .put(`/api/channels/${selectedChannel}/messages/${channelMsg._id}/markAsRead`)
                        .catch(err => console.error('Erreur markAsRead new message:', err));
                }
            }
        };

        const handleChannelMessageDeleted = (payload) => {
            console.log('[Socket] channel-message-deleted:', payload);
            if (selectedChannel === payload.channelId) {
                setMessages((prev) => prev.filter(m => m._id !== payload.messageId));
            }
        };

        const handleChannelMessageUpdated = (payload) => {
            console.log('[Socket] channel-message-updated:', payload);
            if (selectedChannel === payload.channelId) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m._id === payload.messageId
                            ? { ...m, content: payload.newContent, edited: payload.edited }
                            : m
                    )
                );
            }
        };

        const handleMessageReacted = (payload) => {
            console.log('[Socket] message-reacted:', payload);
            if (selectedChannel && payload.channelId === selectedChannel) {
                setMessages(prev =>
                    prev.map(msg => {
                        if (msg._id === payload.messageId) {
                            const existingIndex = msg.reactions
                                ? msg.reactions.findIndex(r =>
                                    (r.user._id && r.user._id === payload.reaction.user._id)
                                    || (typeof r.user === 'string' && r.user === payload.reaction.user)
                                )
                                : -1;
                            let newReactions;
                            if (existingIndex !== -1) {
                                newReactions = [...msg.reactions];
                                newReactions[existingIndex] = payload.reaction;
                            } else {
                                newReactions = [...(msg.reactions || []), payload.reaction];
                            }
                            return { ...msg, reactions: newReactions };
                        }
                        return msg;
                    })
                );
            }
        };

        const handleMentionNotification = (notif) => {
            alert(`
        Tu as été mentionné par ${notif.from}
        Dans le channel ${notif.channelName}
        Du workspace ${notif.workspaceName}
      `);
        };

        const handleChannelAdded = (channel) => {
            console.log('[Socket] channel-added:', channel);
            setMyWorkspaces((prev) =>
                prev.map((ws) => {
                    if (ws._id === channel.workspace.toString()) {
                        const exists = ws.channels && ws.channels.some((ch) => ch._id === channel._id);
                        if (!exists) {
                            return { ...ws, channels: [...(ws.channels || []), channel] };
                        }
                    }
                    return ws;
                })
            );
        };

        const handleChannelDeleted = (payload) => {
            console.log('[Socket] channel-deleted:', payload);
            setMyWorkspaces((prev) =>
                prev.map((ws) => {
                    if (ws.channels) {
                        return { ...ws, channels: ws.channels.filter((ch) => ch._id !== payload.channelId) };
                    }
                    return ws;
                })
            );
        };

        // => pour “Lu par X” (en channel)
        const handleMessageRead = (payload) => {
            // payload = { channelId, messageId, userId }
            console.log('[Socket] message-read:', payload);
            if (selectedChannel && payload.channelId === selectedChannel) {
                setMessages((prev) =>
                    prev.map((msg) => {
                        if (msg._id === payload.messageId) {
                            if (!msg.readBy) msg.readBy = [];
                            const already = msg.readBy.some((rb) => rb.user === payload.userId);
                            if (!already) {
                                msg.readBy.push({ user: payload.userId, readAt: new Date() });
                            }
                        }
                        return msg;
                    })
                );
            }
        };

        // => DM: réactions
        const handleDmMessageReacted = (payload) => {
            // payload = { dmId, reaction: { emoji, user: { _id, name }, ... } }
            setMessages(prev =>
                prev.map(dm => {
                    if (dm._id === payload.dmId) {
                        // trouver la reaction existante pour user ?
                        const existingIdx = dm.reactions
                            ? dm.reactions.findIndex(r => r.user && r.user._id === payload.reaction.user._id)
                            : -1;
                        let newReactions;
                        if (existingIdx !== -1) {
                            newReactions = [...dm.reactions];
                            newReactions[existingIdx] = payload.reaction;
                        } else {
                            newReactions = [...(dm.reactions || []), payload.reaction];
                        }
                        return { ...dm, reactions: newReactions };
                    }
                    return dm;
                })
            );
        };

        // => DM: message édité
        const handleDmMessageUpdated = (payload) => {
            // payload = { dmId, newContent, edited }
            setMessages(prev =>
                prev.map(dm => {
                    if (dm._id === payload.dmId) {
                        return {
                            ...dm,
                            content: payload.newContent,
                            edited: payload.edited,
                        };
                    }
                    return dm;
                })
            );
        };

        // Écoute
        newSocket.on('new-channel-message', handleNewChannelMessage);
        newSocket.on('channel-message-deleted', handleChannelMessageDeleted);
        newSocket.on('channel-message-updated', handleChannelMessageUpdated);
        newSocket.on('message-reacted', handleMessageReacted);
        newSocket.on('mention-notification', handleMentionNotification);
        newSocket.on('channel-added', handleChannelAdded);
        newSocket.on('channel-deleted', handleChannelDeleted);
        newSocket.on('message-read', handleMessageRead);
        newSocket.on('dm-message-reacted', handleDmMessageReacted);
        newSocket.on('dm-message-updated', handleDmMessageUpdated);

        // Nettoyage
        return () => {
            newSocket.off('workspace-updated', handleWorkspaceUpdated);
            newSocket.off('workspace-removed', handleWorkspaceRemoved);

            newSocket.off('new-private-message', handleNewPrivateMessage);
            newSocket.off('dm-message-read', handleDmMessageRead);
            newSocket.off('dm-message-reacted', handleDmMessageReacted);
            newSocket.off('dm-message-updated', handleDmMessageUpdated);

            newSocket.off('new-channel-message', handleNewChannelMessage);
            newSocket.off('channel-message-deleted', handleChannelMessageDeleted);
            newSocket.off('channel-message-updated', handleChannelMessageUpdated);
            newSocket.off('message-reacted', handleMessageReacted);
            newSocket.off('mention-notification', handleMentionNotification);
            newSocket.off('channel-added', handleChannelAdded);
            newSocket.off('channel-deleted', handleChannelDeleted);
            newSocket.off('message-read', handleMessageRead);
            newSocket.close();

            newSocket.disconnect();
        };
    }, [isLoggedIn, userId, selectedUser, selectedChannel, onSocketReady]);

    //----------------------------------------------------------------
    // 3) Rejoindre la room socket si selectedChannel
    //----------------------------------------------------------------
    useEffect(() => {
        if (socket && selectedChannel) {
            socket.emit('joinChannel', selectedChannel);
            console.log('[Socket] joinChannel =>', selectedChannel);
        }
    }, [socket, selectedChannel]);

    //----------------------------------------------------------------
    // 4) Charger la liste des utilisateurs, workspaces
    //----------------------------------------------------------------
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

    //----------------------------------------------------------------
    // Charger workspaces + channels
    //----------------------------------------------------------------
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

    //----------------------------------------------------------------
    // 5) Surveiller query params ?channelId=? / ?userId=? / ?focusMsg=?
    //----------------------------------------------------------------
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
    }, [location.search]);

    //----------------------------------------------------------------
    // 6) Sélection d’un channel
    //----------------------------------------------------------------
    const handleSelectChannel = async (chId, focusMsgParam) => {
        setSelectedUser('');
        setSelectedChannel(chId);

        // 1) On récupère le tableau
        const fetched = await fetchChannelHistory(chId);
        // 2) On marque tous ces messages comme lus
        await markChannelMessagesAsRead(chId, fetched);
        // 3) Maintenant on peut mettre à jour le state
        setMessages(fetched);

        // Gérer le focus
        if (focusMsgParam) {
            setFocusMessageId(focusMsgParam);
            const newParams = new URLSearchParams(location.search);
            newParams.delete('focusMsg');
            navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
        }
    };

    //----------------------------------------------------------------
    // 7) Sélection d’un user (DM)
    //----------------------------------------------------------------
    const handleSelectUser = async (uId) => {
        setSelectedChannel('');
        setSelectedUser(uId);

        // On fetch l’historique
        const fetchedDMs = await fetchDMHistory(uId);
        // fetchedDMs = tableau de messages

        // On met dans le state
        setMessages(fetchedDMs);

        // On marque tous ces DMs comme lus
        await markDMsAsRead(fetchedDMs);

        // 5) Focus message éventuel + cleanup
        const queryParams = new URLSearchParams(location.search);
        if (queryParams.has('focusMsg')) {
            queryParams.delete('focusMsg');
            navigate(`${location.pathname}?${queryParams.toString()}`, { replace: true });
        }
    };


    //----------------------------------------------------------------
    // 8) Historique DM
    //----------------------------------------------------------------
    const fetchDMHistory = async (otherUserId) => {
        try {
            const res = await axios.get(`/api/direct-messages/${otherUserId}`);
            return res.data; // Au lieu de setMessages(res.data) direct
        } catch (err) {
            console.error('Erreur fetchDMHistory:', err);
            return [];
        }
    };

    //----------------------------------------------------------------
    // 9) Historique channel
    //----------------------------------------------------------------
    const fetchChannelHistory = async (channelId) => {
        if (!channelId) return;
        try {
            const res = await axios.get(`/api/channels/${channelId}/messages`);
            return res.data;
        } catch (err) {
            console.error('Erreur fetchChannelHistory:', err);
            return [];
        }
    };

    //----------------------------------------------------------------
    // 10) Envoyer un message (DM ou channel)
    //----------------------------------------------------------------
    const handleSendMessage = async (content, file) => {
        try {
            const mentions = parseMentions(content);
            const formData = new FormData();
            formData.append('content', content);
            formData.append('mentions', JSON.stringify(mentions));
            if (file) formData.append('file', file);

            if (selectedUser) {
                // On envoie un DM
                formData.append('receiverId', selectedUser);
                await axios.post('/api/direct-messages', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else if (selectedChannel) {
                // On envoie un message dans le channel
                await axios.post(`/api/channels/${selectedChannel}/messages`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }
        } catch (err) {
            console.error('Erreur handleSendMessage:', err);
        }
    };

    //----------------------------------------------------------------
    // 11) Peut-on supprimer un message ?
    //----------------------------------------------------------------
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

    const markChannelMessagesAsRead = async (channelId, channelMessages) => {
        for (const msg of channelMessages) {
            // si je suis l'expéditeur, pas besoin de le “lire”
            if (String(msg.sender?._id || msg.sender) === userId) {
                continue;
            }
            // si déjà lu, on skip
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

    const markDMsAsRead = async (directMessages) => {
        for (const msg of directMessages) {
            // si je suis l'expéditeur => skip
            if (String(msg.sender?._id || msg.sender) === userId) {
                continue;
            }
            // si déjà lu => skip
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

    //----------------------------------------------------------------
    // Rendu final
    //----------------------------------------------------------------
    return (
        <div className="chat-layout">
            <div className="sidebar-layout">
                <Sidebar
                    // Pour la pastille verte => on passe socket
                    socket={socket}
                    userId={userId}
                    users={users}
                    myWorkspaces={myWorkspaces}
                    onSelectUser={handleSelectUser}
                    onSelectChannel={handleSelectChannel}
                    selectedUser={selectedUser}
                    selectedChannel={selectedChannel}
                    onWorkspacesRefresh={fetchWorkspacesAndChannels}
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
                    canDelete={canDelete}
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