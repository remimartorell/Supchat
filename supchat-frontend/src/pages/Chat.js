// src/pages/Chat.js
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from '../services/axiosConfig';

import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import MessageInput from '../components/MessageInput';
import NotificationHub from '../components/NotificationHub';

import { useLocation, useNavigate } from 'react-router-dom';

function parseMentions(content) {
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

    // Sélection courante : un user pour DM ou un channel
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedChannel, setSelectedChannel] = useState('');

    // Messages à afficher (DM ou channel)
    const [messages, setMessages] = useState([]);

    // Utilisateurs et workspaces
    const [users, setUsers] = useState([]);
    const [myWorkspaces, setMyWorkspaces] = useState([]);

    const [focusMessageId, setFocusMessageId] = useState('');

    // 1) Récupérer l'utilisateur connecté
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

    // 2) Initialiser la socket dès que l'utilisateur est connecté
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

            newSocket.on('workspace-updated', (payload) => {
                console.log('workspace-updated', payload);
                fetchWorkspacesAndChannels();
            });

            newSocket.on('workspace-removed', (payload) => {
                console.log('workspace-removed', payload);
                fetchWorkspacesAndChannels();
            });

            newSocket.on('new-private-message', (message) => {
                console.log('Nouveau DM reçu :', message);
                if (
                    (message.sender === selectedUser && message.receiver === userId) ||
                    (message.sender === userId && message.receiver === selectedUser)
                ) {
                    setMessages(prev => [...prev, message]);
                }
            });

            newSocket.on('new-channel-message', (message) => {
                console.log('Nouveau message channel :', message);
                if (selectedChannel && message.channelId === selectedChannel) {
                    // On force message.channel pour être sûr
                    message.channel = message.channelId;
                    setMessages(prev => [...prev, message]);
                }
            });

            newSocket.on('mention-notification', (notif) => {
                alert(`
          Tu as été mentionné par ${notif.from}
          Dans le channel ${notif.channelName}
          Du workspace ${notif.workspaceName}
        `);
            });

            newSocket.on('channel-message-deleted', (payload) => {
                console.log('channel-message-deleted', payload);
                if (selectedChannel === payload.channelId) {
                    setMessages(prev => prev.filter(m => m._id !== payload.messageId));
                }
            });

            newSocket.on('channel-message-updated', (payload) => {
                console.log('channel-message-updated', payload);
                if (selectedChannel === payload.channelId) {
                    setMessages(prev =>
                        prev.map(m =>
                            m._id === payload.messageId
                                ? { ...m, content: payload.newContent, edited: payload.edited }
                                : m
                        )
                    );
                }
            });

            newSocket.on('message-reacted', (payload) => {
                console.log('message-reacted', payload);
                if (selectedChannel && payload.channelId === selectedChannel) {
                    setMessages(prev =>
                        prev.map(msg => {
                            if (msg._id === payload.messageId) {
                                const existingIndex = msg.reactions
                                    ? msg.reactions.findIndex(r =>
                                        (r.user._id && r.user._id === payload.reaction.user._id) ||
                                        (typeof r.user === 'string' && r.user === payload.reaction.user)
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
            });

            newSocket.on('channel-added', (channel) => {
                console.log('Nouveau canal ajouté:', channel);
                setMyWorkspaces(prev =>
                    prev.map(ws => {
                        if (ws._id === channel.workspace.toString()) {
                            const exists = ws.channels && ws.channels.some(ch => ch._id === channel._id);
                            if (!exists) {
                                return { ...ws, channels: [...(ws.channels || []), channel] };
                            }
                        }
                        return ws;
                    })
                );
            });

            newSocket.on('channel-deleted', (data) => {
                console.log('Canal supprimé:', data.channelId);
                setMyWorkspaces(prev =>
                    prev.map(ws => {
                        if (ws.channels) {
                            return { ...ws, channels: ws.channels.filter(ch => ch._id !== data.channelId) };
                        }
                        return ws;
                    })
                );
            });

            return () => {
                newSocket.off('joined');
                newSocket.off('workspace-updated');
                newSocket.off('workspace-removed');
                newSocket.off('new-private-message');
                newSocket.off('new-channel-message');
                newSocket.off('channel-message-deleted');
                newSocket.off('channel-message-updated');
                newSocket.off('message-reacted');
                newSocket.off('channel-added');
                newSocket.off('channel-deleted');
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

    // 3) Récupérer la liste des utilisateurs et workspaces
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

    // 4) Récupérer workspaces et canaux
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

    // 5) Surveiller les query parameters pour sélectionner un canal ou un utilisateur
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

    // 6) Fonction de sélection d'un canal
    const handleSelectChannel = async (chId, focusMsgParam) => {
        setSelectedChannel(chId);
        setSelectedUser('');
        if (socket) {
            socket.emit('joinChannel', chId);
            console.log('joinChannel sent with', chId);
        }
        await fetchChannelHistory(chId);
        if (focusMsgParam) {
            setFocusMessageId(focusMsgParam);
            const newParams = new URLSearchParams(location.search);
            newParams.delete('focusMsg');
            navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
        }
    };

    // 7) Fonction de sélection d'un utilisateur
    const handleSelectUser = async (uId) => {
        setSelectedUser(uId);
        setSelectedChannel('');
        await fetchDMHistory(uId);
        const queryParams = new URLSearchParams(location.search);
        if (queryParams.has('focusMsg')) {
            queryParams.delete('focusMsg');
            navigate(`${location.pathname}?${queryParams.toString()}`, { replace: true });
        }
    };

    // 8) Historique DM
    const fetchDMHistory = async (otherUserId) => {
        if (!otherUserId) return;
        try {
            const res = await axios.get(`/api/direct-messages/${otherUserId}`);
            setMessages(res.data);
        } catch (err) {
            console.error('Erreur fetchDMHistory:', err);
        }
    };

    // 9) Historique channel
    const fetchChannelHistory = async (channelId) => {
        if (!channelId) return;
        try {
            const res = await axios.get(`/api/channels/${channelId}/messages`);
            setMessages(res.data);
        } catch (err) {
            console.error('Erreur fetchChannelHistory:', err);
        }
    };

    // 10) Envoi d’un message
    const handleSendMessage = async (content, file) => {
        try {
            const mentions = parseMentions(content);
            const formData = new FormData();
            formData.append('content', content);
            formData.append('mentions', JSON.stringify(mentions));
            if (file) formData.append('file', file);
            if (selectedUser) {
                formData.append('receiverId', selectedUser);
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

    // 11) Déterminer si l'utilisateur peut supprimer un message
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

    return (
        <div className="chat-layout">
            <div className="sidebar-layout">
                <Sidebar
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
                {/* Afficher NotificationHub ici afin qu'il utilise la même instance de socket */}
                <NotificationHub socket={socket} />
                <ChatWindow
                    userId={userId}
                    messages={messages}
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