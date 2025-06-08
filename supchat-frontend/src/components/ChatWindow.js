// src/components/ChatWindow.js
import React, { useEffect, useRef, useState } from 'react';
import axios from '../services/axiosConfig';
import './ChatWindow.css';

function highlightMentions(content, validMentions) {
    if (!content) return content;
    return content.split(/\s+/).map((word, i) => {
        if (word.startsWith('@')) {
            const mentionName = word.slice(1);
            if (validMentions.includes(mentionName)) {
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

function ChatWindow({
                        socket,
                        userId,
                        messages,
                        users,
                        selectedUser,
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

    useEffect(() => {
        const stored = localStorage.getItem('votedPolls');
        if (stored) setVotedPolls(new Set(JSON.parse(stored)));
    }, []);

    useEffect(() => {
        localStorage.setItem('votedPolls', JSON.stringify([...votedPolls]));
    }, [votedPolls]);

    const openEmojiPickerForMessage = (m) => {
        setShowEmojiPickerFor(m._id);
    };

    const handleChooseEmoji = (m, chosenEmoji) => {
        const url = selectedChannel
            ? `/api/channels/${m.channel}/messages/${m._id}/reactions`
            : `/api/direct-messages/${m._id}/reactions`;

        axios
            .post(url, { emoji: chosenEmoji })
            .then(() => {
                setShowEmojiPickerFor(null);
                // Mise à jour locale optimiste des réactions :
                setMessages(prev =>
                    prev.map(msg => {
                        if (msg._id === m._id) {
                            const reactions = msg.reactions ? [...msg.reactions] : [];
                            // Ajoute la réaction, en supposant utilisateur courant connu par userId
                            const existingIndex = reactions.findIndex(
                                r => r.user && (r.user._id === userId || r.user === userId)
                            );
                            if (existingIndex !== -1) {
                                reactions[existingIndex] = { emoji: chosenEmoji, userName: 'Moi', user: userId };
                            } else {
                                reactions.push({ emoji: chosenEmoji, userName: 'Moi', user: userId });
                            }
                            return { ...msg, reactions };
                        }
                        return msg;
                    })
                );
            })
            .catch((err) => console.error('Erreur réaction emoji :', err));
    };

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

    useEffect(() => {
        if (!socket) return;

        const handlePollResult = ({ _id, votes }) => {
            setMessages((prev) =>
                prev.map((m) => (m._id === _id ? { ...m, votes } : m))
            );
        };

        const handleBotMessage = (newMessage) => {
            setMessages((prev) => [...prev, newMessage]);
        };

        // Nouveau : gestion des réactions sur DM
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

        // Nouveau : gestion des réactions sur messages channel
        const handleChannelMessageReacted = (payload) => {
            setMessages(prev =>
                prev.map(msg => {
                    if (msg._id === payload.messageId) {
                        if (!msg.reactions) msg.reactions = [];
                        const existingIndex = msg.reactions.findIndex(
                            r => r.user && r.user._id === payload.reaction.user._id
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
        };

        socket.on('poll-result', handlePollResult);
        socket.on('bot-message', handleBotMessage);
        socket.on('dm-message-reacted', handleDmMessageReacted);
        socket.on('channel-message-reacted', handleChannelMessageReacted);

        return () => {
            socket.off('poll-result', handlePollResult);
            socket.off('bot-message', handleBotMessage);
            socket.off('dm-message-reacted', handleDmMessageReacted);
            socket.off('channel-message-reacted', handleChannelMessageReacted);
        };
    }, [socket, setMessages, userId]);

    const formatTimestamp = (timestamp) => new Date(timestamp).toLocaleString();

    const getSenderLabel = (m) => {
        if (m.sender?.name) return m.sender.name;
        if (typeof m.sender === 'string') {
            const foundUser = users?.find((u) => u._id === m.sender);
            return foundUser?.name || m.sender;
        }
        return '(Sans nom)';
    };

    const getSenderAvatar = (m) => {
        if (m.sender?.avatar) return m.sender.avatar;

        if (m.sender && typeof m.sender === 'object') {
            if (m.sender.profilePicture) {
                return process.env.REACT_APP_API_URL + m.sender.profilePicture;
            } else if (m.sender.avatarFileId) {
                return `${avatarBaseUrl}/${m.sender._id}/avatar`;
            }
        } else if (typeof m.sender === 'string') {
            const foundUser = users?.find((u) => u._id === m.sender);
            if (foundUser?.profilePicture) {
                return process.env.REACT_APP_API_URL + foundUser.profilePicture;
            } else if (foundUser?.avatarFileId) {
                return `${avatarBaseUrl}/${foundUser._id}/avatar`;
            }
        }
        return '/img/default-avatar.png';
    };

    const handleDeleteMsg = async (m) => {
        if (!window.confirm('Supprimer ce message ?')) return;
        try {
            await axios.delete(`/api/channels/${m.channel}/messages/${m._id}`);
            setMessages((prev) => prev.filter((msg) => msg._id !== m._id));
        } catch (err) {
            console.error('Erreur suppression message:', err);
            alert('Impossible de supprimer ce message');
        }
    };
// helper pour mentions ET hashtags
    function renderContent(text, validMentions, channels, onChannelClick) {
        if (!text) return text;
        return text.split(/\s+/).map((word, i) => {
            // mention
            if (word.startsWith('@')) {
                const name = word.slice(1);
                if (validMentions.includes(name)) {
                    return <span key={i} className="highlight-mention">{word} </span>;
                }
            }
            // hashtag
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
            // mot normal
            return word + ' ';
        });
    }

    const startEditingMessage = (m) => {
        setEditingMessageId(m._id);
        setEditContent(m.content || '');
    };

    const handleSaveEdit = async (m) => {
        if (!editContent.trim()) return alert("Le contenu ne peut pas être vide.");
        try {
            const endpoint = selectedChannel
                ? `/api/channels/${m.channel}/messages/${m._id}`
                : `/api/direct-messages/${m._id}`;
            await axios.put(endpoint, { newContent: editContent.trim() });
            setEditingMessageId(null);
            setEditContent('');
        } catch (err) {
            console.error('Erreur édition message', err);
            alert('Impossible de modifier ce message');
        }
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditContent('');
    };

    const handleVote = (pollId, optionIndex) => {
        if (votedPolls.has(pollId)) {
            alert("Tu as déjà voté.");
            return;
        }

        socket.emit('vote-poll', { pollId, optionIndex });

        setVotedPolls((prev) => new Set(prev).add(pollId));
        setMessages((prev) =>
            prev.map((m) => {
                if (m._id === pollId) {
                    const updatedVotes = [
                        ...(m.votes || Array(m.options.length).fill(0)),
                    ];
                    updatedVotes[optionIndex]++;
                    return { ...m, votes: updatedVotes };
                }
                return m;
            })
        );
    };

    return (
        <div className="chat-window-container">
            <div ref={listRef} className="chat-window-messages">
                {messages.map((m) => {
                    const isMe =
                        (m.sender &&
                            typeof m.sender === 'object' &&
                            m.sender._id === userId) ||
                        m.sender === userId;
                    const senderLabel = getSenderLabel(m);
                    const timestamp = formatTimestamp(m.createdAt);
                    const validMentions = m.validMentions || [];
                    const avatarUrl = getSenderAvatar(m);
                    const isPoll = m.type === 'poll' && m.question && Array.isArray(m.options);

                    return (
                        <div
                            key={m._id}
                            id={`msg-${m._id}`}
                            className={`message-container ${
                                isMe ? 'message-bg-me' : 'message-bg-other'
                            }`}
                        >
                            {/* Avatar + header */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginBottom: '5px',
                                }}
                            >
                                <img
                                    src={avatarUrl}
                                    alt="avatar"
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        marginRight: '8px',
                                        objectFit: 'cover',
                                    }}
                                />
                                <div className="message-header">
                                    <span className="sender">{senderLabel}</span>
                                    <span className="timestamp">{timestamp}</span>
                                </div>
                            </div>

                            {/* Édition / Sondage / Contenu */}
                            {editingMessageId === m._id ? (
                                <>
                                    <textarea
                                        className="message-edit-textarea"
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                    />
                                    <div className="message-edit-buttons">
                                        <button
                                            className="action-button"
                                            onClick={() => handleSaveEdit(m)}
                                        >
                                            Enregistrer
                                        </button>
                                        <button
                                            className="action-button"
                                            onClick={handleCancelEdit}
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                </>
                            ) : isPoll ? (
                                <div className="poll-container">
                                    <div className="poll-question">📊 {m.question}</div>
                                    {(() => {
                                        const total = m.votes.reduce((sum, v) => sum + v, 0);
                                        return m.options.map((opt, idx) => {
                                            const count = m.votes[idx] || 0;
                                            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                            return (
                                                <div
                                                    key={idx}
                                                    className="poll-option-bar"
                                                    onClick={() =>
                                                        !votedPolls.has(m._id) && handleVote(m._id, idx)
                                                    }
                                                    style={{
                                                        cursor: votedPolls.has(m._id)
                                                            ? 'default'
                                                            : 'pointer',
                                                    }}
                                                >
                                                    <span className="poll-option-label">{opt}</span>
                                                    <div className="poll-bar-outer">
                                                        <div
                                                            className="poll-bar-inner"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="poll-bar-count">
                                                        {count} ({pct}%)
                                                    </span>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            ) : (
                                <div className="message-content">
                                    {/https?:\/\/.*\.(gif|png|jpe?g)$/i.test(m.content) ? (
                                        <img
                                            src={m.content}
                                            alt="img"
                                            style={{
                                                maxWidth: '200px',
                                                height: 'auto',
                                                borderRadius: '4px',
                                            }}
                                        />
                                    ) : (
                                        renderContent(m.content || '', validMentions, channels, onChannelClick)
                                    )}
                                    {m.edited && (
                                        <span className="message-edited">(Modifié)</span>
                                    )}
                                </div>
                            )}

                            {/* Fichier joint */}
                            {m.fileUrl && (
                                <div className="message-file">
                                    {m.fileUrl.match(/\.(png|jpe?g|gif)$/i) ? (
                                        <img
                                            src={process.env.REACT_APP_API_URL + m.fileUrl}
                                            alt="file"
                                            style={{
                                                maxWidth: '200px',
                                                height: 'auto',
                                            }}
                                        />
                                    ) : (
                                        <a href={m.fileUrl} target="_blank" rel="noreferrer">
                                            Télécharger le fichier
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            {!isPoll && editingMessageId !== m._id && (
                                <div className="message-actions">
                                    <button
                                        className="action-button"
                                        onClick={() => openEmojiPickerForMessage(m)}
                                    >
                                        Réagir
                                    </button>
                                    {isMe && (
                                        <button
                                            className="action-button"
                                            onClick={() => startEditingMessage(m)}
                                        >
                                            Modifier
                                        </button>
                                    )}
                                    {canDelete && (
                                        <button
                                            className="action-button delete-button"
                                            onClick={() => handleDeleteMsg(m)}
                                        >
                                            X
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Réactions */}
                            <div className="message-reactions">
                                {m.reactions?.map((react, i) => (
                                    <span
                                        key={i}
                                        className="reaction"
                                        title={`Réaction de ${
                                            react.userName || react.user?._id || '(Inconnu)'
                                        }`}
                                    >
                                        {react.emoji}
                                    </span>
                                ))}
                            </div>

                            {/* ——— Read receipts ——— */}
                            {m.readBy && m.readBy.length > 0 && (
                                <div
                                    className="message-read-receipt"
                                    title={m.readBy
                                        .map((rb) => {
                                            const uid =
                                                typeof rb.user === 'object'
                                                    ? rb.user._id
                                                    : rb.user;
                                            const u = users.find((u) => u._id === uid);
                                            return u ? u.name : uid;
                                        })
                                        .join(', ')}
                                >
                                    {selectedChannel
                                        ? `Lu par ${m.readBy.length}`
                                        : isMe && <span className="check-icon">✓</span>}
                                </div>
                            )}

                            {/* Emoji picker */}
                            {showEmojiPickerFor === m._id && (
                                <div className="emoji-picker">
                                    {['😃', '👍', '❤️', '🔥', '🎉'].map((emoji) => (
                                        <span
                                            key={emoji}
                                            className="emoji"
                                            onClick={() => handleChooseEmoji(m, emoji)}
                                        >
                                            {emoji}
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

export default ChatWindow;
