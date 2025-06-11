// src/components/ChatWindow.js
import React, { useEffect, useRef, useState } from 'react';
import axios from '../services/axiosConfig';
import './ChatWindow.css';

/**
 * Met en surbrillance les mentions @username
 */
function highlightMentions(content, validMentions) {
    if (!content) return content;
    return content.split(/\s+/).map((word, i) => {
        if (word.startsWith('@')) {
            const name = word.slice(1);
            if (validMentions.includes(name)) {
                return (
                    <span key={i} className="highlight-mention">
            {word}{' '}
          </span>
                );
            }
        }
        return word + ' ';
    });
}

/**
 * Gère à la fois @mentions et #hashtags cliquables
 */
function renderContent(text, validMentions, channels, onChannelClick) {
    if (!text) return text;
    return text.split(/\s+/).map((word, i) => {
        if (word.startsWith('@')) {
            const name = word.slice(1);
            if (validMentions.includes(name)) {
                return (
                    <span key={i} className="highlight-mention">
            {word}{' '}
          </span>
                );
            }
        }
        if (word.startsWith('#')) {
            const chanName = word.slice(1);
            const chan = channels.find(c => c.name === chanName);
            if (chan) {
                return (
                    <span
                        key={i}
                        className="highlight-hashtag"
                        onClick={() => onChannelClick(chan._id)}
                    >
            {word}{' '}
          </span>
                );
            }
        }
        return word + ' ';
    });
}

export default function ChatWindow({
                                       socket,
                                       userId,
                                       messages,
                                       users,
                                       selectedChannel,
                                       focusMessageId,
                                       canDelete,
                                       setMessages,
                                       channels,
                                       onChannelClick,
                                   }) {
    const listRef = useRef(null);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [showEmojiPickerFor, setShowEmojiPickerFor] = useState(null);
    const [votedPolls, setVotedPolls] = useState(new Set());
    const avatarBaseUrl = `${process.env.REACT_APP_API_URL}/api/users`;

    // Charge / sauvegarde localStorage des sondages
    useEffect(() => {
        const stored = localStorage.getItem('votedPolls');
        if (stored) setVotedPolls(new Set(JSON.parse(stored)));
    }, []);
    useEffect(() => {
        localStorage.setItem('votedPolls', JSON.stringify([...votedPolls]));
    }, [votedPolls]);

    const openEmojiPickerForMessage = m => setShowEmojiPickerFor(m._id);

    const handleChooseEmoji = (m, chosenEmoji) => {
        const url = selectedChannel
            ? `/api/channels/${m.channel}/messages/${m._id}/reactions`
            : `/api/direct-messages/${m._id}/reactions`;

        axios.post(url, { emoji: chosenEmoji })
            .then(() => {
                setShowEmojiPickerFor(null);
                // Mise à jour optimiste locale
                setMessages(prev =>
                    prev.map(msg => {
                        if (msg._id === m._id) {
                            const reactions = msg.reactions ?? [];
                            const idx = reactions.findIndex(
                                r => r.user && (r.user._id === userId || r.user === userId)
                            );
                            if (idx >= 0) reactions[idx] = { emoji: chosenEmoji, userName: 'Moi', user: userId };
                            else reactions.push({ emoji: chosenEmoji, userName: 'Moi', user: userId });
                            return { ...msg, reactions };
                        }
                        return msg;
                    })
                );
            })
            .catch(console.error);
    };

    // Scroll / highlight focusMessageId
    useEffect(() => {
        if (focusMessageId) {
            setTimeout(() => {
                const el = document.getElementById(`msg-${focusMessageId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('highlight');
                    setTimeout(() => el.classList.remove('highlight'), 2000);
                }
            }, 100);
        }
    }, [focusMessageId, messages]);
    useEffect(() => {
        if (!focusMessageId && listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages, focusMessageId]);

    // ─── Socket handlers ───
    useEffect(() => {
        if (!socket) return;

        const handlePollResult = ({ _id, votes }) =>
            setMessages(prev => prev.map(m => m._id === _id ? { ...m, votes } : m));

        const handleBotMessage = newMessage =>
            setMessages(prev => [...prev, newMessage]);

        const handleDmReaction = payload =>
            setMessages(prev =>
                prev.map(dm => {
                    if (dm._id === payload.dmId) {
                        const reactions = dm.reactions ?? [];
                        const idx = reactions.findIndex(r => r.user?._id === payload.reaction.user._id);
                        if (idx >= 0) reactions[idx] = payload.reaction;
                        else reactions.push(payload.reaction);
                        return { ...dm, reactions };
                    }
                    return dm;
                })
            );

        const handleChannelReaction = payload =>
            setMessages(prev =>
                prev.map(msg => {
                    if (msg._1d === payload.messageId) {
                        const reactions = msg.reactions ?? [];
                        const idx = reactions.findIndex(r => r.user?._id === payload.reaction.user._id);
                        if (idx >= 0) reactions[idx] = payload.reaction;
                        else reactions.push(payload.reaction);
                        return { ...msg, reactions };
                    }
                    return msg;
                })
            );

        const handleChannelRead = ({ channelId, messageId, userId: readerId }) =>
            setMessages(prev =>
                prev.map(m => {
                    if (m._id === messageId) {
                        const readBy = m.readBy ?? [];
                        if (!readBy.some(rb => String(rb.user) === String(readerId))) {
                            readBy.push({ user: readerId, readAt: new Date() });
                        }
                        return { ...m, readBy };
                    }
                    return m;
                })
            );

        const handleDmRead = ({ dmId, userId: readerId }) =>
            setMessages(prev =>
                prev.map(dm => {
                    if (dm._id === dmId) {
                        const readBy = dm.readBy ?? [];
                        if (!readBy.some(rb => String(rb.user) === String(readerId))) {
                            readBy.push({ user: readerId, readAt: new Date() });
                        }
                        return { ...dm, readBy };
                    }
                    return dm;
                })
            );

        socket.on('poll-result', handlePollResult);
        socket.on('bot-message', handleBotMessage);
        socket.on('dm-message-reacted', handleDmReaction);
        socket.on('channel-message-reacted', handleChannelReaction);
        socket.on('channel-message-read', handleChannelRead);
        socket.on('dm-message-read', handleDmRead);

        return () => {
            socket.off('poll-result', handlePollResult);
            socket.off('bot-message', handleBotMessage);
            socket.off('dm-message-reacted', handleDmReaction);
            socket.off('channel-message-reacted', handleChannelReaction);
            socket.off('channel-message-read', handleChannelRead);
            socket.off('dm-message-read', handleDmRead);
        };
    }, [socket, setMessages, userId]);

    const formatTimestamp = ts => new Date(ts).toLocaleString();

    const getSenderLabel = m => {
        if (m.sender?.name) return m.sender.name;
        if (typeof m.sender === 'string') {
            const u = users.find(u => u._id === m.sender);
            return u?.name || m.sender;
        }
        return '(Sans nom)';
    };

    const getSenderAvatar = m => {
        if (m.sender?.avatar) return m.sender.avatar;
        if (m.sender?.profilePicture) return process.env.REACT_APP_API_URL + m.sender.profilePicture;
        if (m.sender?.avatarFileId) return `${avatarBaseUrl}/${m.sender._id}/avatar`;
        if (typeof m.sender === 'string') {
            const u = users.find(u => u._id === m.sender);
            if (u?.profilePicture) return process.env.REACT_APP_API_URL + u.profilePicture;
            if (u?.avatarFileId) return `${avatarBaseUrl}/${u._id}/avatar`;
        }
        return '/img/default-avatar.png';
    };

    const handleDeleteMsg = async m => {
        if (!window.confirm('Supprimer ce message ?')) return;
        try {
            await axios.delete(`/api/channels/${m.channel}/messages/${m._id}`);
            setMessages(prev => prev.filter(msg => msg._id !== m._id));
        } catch (err) {
            console.error(err);
            alert('Impossible de supprimer');
        }
    };

    const startEditingMessage = m => {
        setEditingMessageId(m._id);
        setEditContent(m.content || '');
    };
    const handleSaveEdit = async m => {
        if (!editContent.trim()) return alert("Le contenu ne peut pas être vide.");
        const ep = selectedChannel
            ? `/api/channels/${m.channel}/messages/${m._id}`
            : `/api/direct-messages/${m._id}`;
        try {
            await axios.put(ep, { newContent: editContent.trim() });
            setEditingMessageId(null);
            setEditContent('');
        } catch (e) {
            console.error(e);
            alert('Échec édition');
        }
    };
    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditContent('');
    };

    const handleVote = (pollId, idx) => {
        if (votedPolls.has(pollId)) return alert('Tu as déjà voté.');
        socket.emit('vote-poll', { pollId, optionIndex: idx });
        setVotedPolls(prev => new Set(prev).add(pollId));
        setMessages(prev =>
            prev.map(m =>
                m._id === pollId
                    ? { ...m, votes: (m.votes ?? Array(m.options.length).fill(0)).map((v, i) => i === idx ? v + 1 : v) }
                    : m
            )
        );
    };

    return (
        <div className="chat-window-container">
            <div ref={listRef} className="chat-window-messages">
                {messages.map(m => {
                    const isMe = (m.sender?._id || m.sender) === userId;
                    const containerProps = {
                        key: m._id,
                        id: `msg-${m._id}`,
                        className: `message-container ${isMe ? 'message-bg-me' : 'message-bg-other'}`,
                        onMouseEnter: () => {
                            // marque lu dès qu’on survole le message
                            if (
                                selectedChannel &&
                                !m.readBy?.some(rb => String(rb.user) === userId)
                            ) {
                                socket.emit('mark-read', {
                                    channelId: selectedChannel,
                                    messageId: m._id
                                });
                            }
                        }
                    };

                    return (
                        <div {...containerProps}>
                            {/* Avatar + header */}
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                                <img
                                    src={getSenderAvatar(m)}
                                    alt="avatar"
                                    style={{ width: 32, height: 32, borderRadius: '50%', marginRight: 8, objectFit: 'cover' }}
                                />
                                <div className="message-header">
                                    <span className="sender">{getSenderLabel(m)}</span>
                                    <span className="timestamp">{formatTimestamp(m.createdAt)}</span>
                                </div>
                            </div>

                            {/* Contenu / édition / sondage */}
                            {editingMessageId === m._id ? (
                                <>
                  <textarea
                      className="message-edit-textarea"
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                  />
                                    <div className="message-edit-buttons">
                                        <button className="action-button" onClick={() => handleSaveEdit(m)}>
                                            Enregistrer
                                        </button>
                                        <button className="action-button" onClick={handleCancelEdit}>
                                            Annuler
                                        </button>
                                    </div>
                                </>
                            ) : m.type === 'poll' && m.question ? (
                                <div className="poll-container">
                                    <div className="poll-question">📊 {m.question}</div>
                                    {m.options.map((opt, i) => {
                                        const total = m.votes?.reduce((a, b) => a + b, 0) || 0;
                                        const count = m.votes?.[i] || 0;
                                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                        return (
                                            <div
                                                key={i}
                                                className="poll-option-bar"
                                                onClick={() => !votedPolls.has(m._id) && handleVote(m._id, i)}
                                                style={{ cursor: votedPolls.has(m._id) ? 'default' : 'pointer' }}
                                            >
                                                <span className="poll-option-label">{opt}</span>
                                                <div className="poll-bar-outer">
                                                    <div className="poll-bar-inner" style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="poll-bar-count">
                          {count} ({pct}%)
                        </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="message-content">
                                    {/https?:\/\/.*\.(gif|png|jpe?g)$/i.test(m.content) ? (
                                        <img src={m.content} alt="img" style={{ maxWidth: 200, borderRadius: 4 }} />
                                    ) : (
                                        renderContent(m.content, m.validMentions ?? [], channels, onChannelClick)
                                    )}
                                    {m.edited && <span className="message-edited">(Modifié)</span>}
                                </div>
                            )}

                            {/* Fichier joint */}
                            {m.fileUrl && (
                                <div className="message-file">
                                    {/\.(png|jpe?g|gif)$/i.test(m.fileUrl) ? (
                                        <img src={process.env.REACT_APP_API_URL + m.fileUrl} alt="file" style={{ maxWidth: 200 }} />
                                    ) : (
                                        <a href={m.fileUrl} target="_blank" rel="noreferrer">
                                            Télécharger
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            {m.type !== 'poll' && editingMessageId !== m._id && (
                                <div className="message-actions">
                                    <button className="action-button" onClick={() => openEmojiPickerForMessage(m)}>
                                        Réagir
                                    </button>
                                    {isMe && (
                                        <button className="action-button" onClick={() => startEditingMessage(m)}>
                                            Modifier
                                        </button>
                                    )}
                                    {canDelete && (
                                        <button className="action-button delete-button" onClick={() => handleDeleteMsg(m)}>
                                            X
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Réactions */}
                            <div className="message-reactions">
                                {m.reactions?.map((r, i) => (
                                    <span key={i} className="reaction" title={`Réaction de ${r.userName || r.user?._id}`}>
                    {r.emoji}
                  </span>
                                ))}
                            </div>

                            {/* Read receipts */}
                            {m.readBy?.length > 0 && (
                                <div
                                    className="message-read-receipt"
                                    title={m.readBy.map(rb => {
                                        const u = users.find(u => u._id === String(rb.user));
                                        return u ? u.name : rb.user;
                                    }).join(', ')}
                                >
                                    {selectedChannel
                                        ? `Lu par ${m.readBy.length}`
                                        : isMe && <span className="check-icon">✓</span>}
                                </div>
                            )}

                            {/* Emoji picker */}
                            {showEmojiPickerFor === m._id && (
                                <div className="emoji-picker">
                                    {['😃','👍','❤️','🔥','🎉'].map(emj => (
                                        <span key={emj} className="emoji" onClick={() => handleChooseEmoji(m, emj)}>
                      {emj}
                    </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
