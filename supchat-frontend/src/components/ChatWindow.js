// src/components/ChatWindow.js

import React, { useEffect, useRef, useState } from 'react';
import axios from '../services/axiosConfig';
import { IoMdCheckmarkCircle } from 'react-icons/io';
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
                        userId,
                        messages,
                        users,
                        selectedUser,
                        selectedChannel,
                        focusMessageId,
                        canDelete,
                        setMessages,
                    }) {
    const listRef = useRef(null);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [showEmojiPickerFor, setShowEmojiPickerFor] = useState(null);

    const avatarBaseUrl = `${process.env.REACT_APP_API_URL}/api/users`;

    const openEmojiPickerForMessage = (m) => {
        setShowEmojiPickerFor(m._id);
    };

    const handleChooseEmoji = (m, chosenEmoji) => {
        const url = selectedChannel
            ? `/api/channels/${m.channel}/messages/${m._id}/reactions`
            : `/api/direct-messages/${m._id}/reactions`;

        axios.post(url, { emoji: chosenEmoji })
            .then(() => setShowEmojiPickerFor(null))
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

    const formatTimestamp = (timestamp) => new Date(timestamp).toLocaleString();

    const getSenderLabel = (m) => {
        if (m.sender && typeof m.sender === 'object' && m.sender.name) {
            return m.sender.name;
        } else if (typeof m.sender === 'string') {
            const foundUser = users?.find((u) => u._id === m.sender);
            return foundUser?.name || m.sender;
        }
        return '(Sans nom)';
    };

    const getSenderAvatar = (m) => {
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

    return (
        <div className="chat-window-container">
            <div ref={listRef} className="chat-window-messages">
                {messages.map((m) => {
                    const isMe = (m.sender && typeof m.sender === 'object' && m.sender._id === userId) || m.sender === userId;
                    const senderLabel = getSenderLabel(m);
                    const timestamp = formatTimestamp(m.createdAt);
                    const validMentions = m.validMentions || [];

                    const avatarUrl = getSenderAvatar(m);

                    return (
                        <div
                            key={m._id}
                            id={`msg-${m._id}`}
                            className={`message-container ${isMe ? 'message-bg-me' : 'message-bg-other'}`}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                                <img
                                    src={avatarUrl}
                                    alt="avatar"
                                    style={{ width: '32px', height: '32px', borderRadius: '50%', marginRight: '8px', objectFit: 'cover' }}
                                />
                                <div className="message-header">
                                    <span className="sender">{senderLabel}</span>
                                    <span className="timestamp">{timestamp}</span>
                                </div>
                            </div>

                            {editingMessageId === m._id ? (
                                <>
                                    <textarea
                                        className="message-edit-textarea"
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                    />
                                    <div className="message-edit-buttons">
                                        <button className="action-button" onClick={() => handleSaveEdit(m)}>Enregistrer</button>
                                        <button className="action-button" onClick={handleCancelEdit}>Annuler</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="message-content">
                                        {/^https?:\/\/.*\.(gif|png|jpe?g)$/i.test(m.content)
                                            ? <img src={m.content} alt="img" style={{ maxWidth: '200px', height: 'auto', borderRadius: '4px' }} />
                                            : highlightMentions(m.content || '', validMentions)}
                                        {m.edited && <span className="message-edited">(Modifié)</span>}
                                    </div>

                                    {m.fileUrl && (
                                        <div className="message-file">
                                            {m.fileUrl.match(/\.(png|jpe?g|gif)$/i)
                                                ? <img src={process.env.REACT_APP_API_URL + m.fileUrl} alt="file" style={{ maxWidth: '200px', height: 'auto' }} />
                                                : <a href={m.fileUrl} target="_blank" rel="noreferrer">Télécharger le fichier</a>}
                                        </div>
                                    )}

                                    <div className="message-actions">
                                        <button className="action-button" onClick={() => openEmojiPickerForMessage(m)}>Réagir</button>
                                        {isMe && <button className="action-button" onClick={() => startEditingMessage(m)}>Modifier</button>}
                                        {canDelete && <button className="action-button delete-button" onClick={() => handleDeleteMsg(m)}>X</button>}
                                    </div>

                                    <div className="message-reactions">
                                        {m.reactions?.map((react, i) => (
                                            <span key={i} className="reaction" title={`Réaction de ${react.user?.name || '(Inconnu)'}`}>
                                                {react.emoji}
                                            </span>
                                        ))}
                                    </div>

                                    {showEmojiPickerFor === m._id && (
                                        <div className="emoji-picker">
                                            {['😃', '👍', '❤️', '🔥', '🎉'].map((emoji) => (
                                                <span key={emoji} className="emoji" onClick={() => handleChooseEmoji(m, emoji)}>
                                                    {emoji}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default ChatWindow;
