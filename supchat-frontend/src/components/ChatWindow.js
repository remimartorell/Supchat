// src/components/ChatWindow.js

import React, { useEffect, useRef, useState } from 'react';
import axios from '../services/axiosConfig';
import { IoMdCheckmarkCircle } from 'react-icons/io';
import './ChatWindow.css';

// Déjà existant : highlightMentions
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

    // --- inchangé : openEmojiPickerForMessage, handleChooseEmoji, etc. ---
    const openEmojiPickerForMessage = (m) => {
        setShowEmojiPickerFor(m._id);
    };

    const handleChooseEmoji = (m, chosenEmoji) => {
        if (selectedChannel) {
            axios
                .post(`/api/channels/${m.channel}/messages/${m._id}/reactions`, { emoji: chosenEmoji })
                .then(() => setShowEmojiPickerFor(null))
                .catch((err) => console.error('Channel reaction error:', err));
        } else if (selectedUser) {
            axios
                .post(`/api/direct-messages/${m._id}/reactions`, { emoji: chosenEmoji })
                .then(() => setShowEmojiPickerFor(null))
                .catch((err) => console.error('DM reaction error:', err));
        }
    };

    // --- inchangé : focusMessageId, auto-scroll, formatTimestamp, etc. ---
    useEffect(() => {
        if (focusMessageId) {
            setTimeout(() => {
                const el = document.getElementById(`msg-${focusMessageId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('highlight');
                    setTimeout(() => {
                        el.classList.remove('highlight');
                    }, 2000);
                }
            }, 100);
        }
    }, [focusMessageId, messages]);

    useEffect(() => {
        if (!focusMessageId && listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages, focusMessageId]);

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    const getSenderLabel = (m) => {
        if (m.sender && typeof m.sender === 'object' && m.sender.name) {
            return m.sender.name;
        } else if (typeof m.sender === 'string') {
            const foundUser = users ? users.find((u) => u._id === m.sender) : null;
            return foundUser ? foundUser.name : m.sender;
        }
        return '(Sans nom)';
    };

    // --- inchangé : handleDeleteMsg, startEditingMessage, handleSaveEdit, handleCancelEdit ---
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
        if (!editContent.trim()) {
            alert("Le contenu ne peut pas être vide.");
            return;
        }
        try {
            if (selectedChannel) {
                await axios.put(`/api/channels/${m.channel}/messages/${m._id}`, { newContent: editContent.trim() });
            } else if (selectedUser) {
                await axios.put(`/api/direct-messages/${m._id}`, { newContent: editContent.trim() });
            }
            setEditingMessageId(null);
            setEditContent('');
        } catch (err) {
            console.error('Erreur lors de l’édition du message', err);
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
                    const isMe =
                        (m.sender && typeof m.sender === 'object' && m.sender._id === userId) ||
                        m.sender === userId;
                    const senderLabel = getSenderLabel(m);
                    const timestamp = formatTimestamp(m.createdAt);
                    const validMentions = m.validMentions || [];

                    // Cas 1 : Édition en cours
                    if (m._id === editingMessageId) {
                        return (
                            <div
                                key={m._id}
                                id={`msg-${m._id}`}
                                className={`message-container ${isMe ? 'message-bg-me' : 'message-bg-other'}`}
                            >
                                <div className="message-header">
                                    <span className="sender">{senderLabel}</span>
                                    <span className="timestamp">{timestamp}</span>
                                </div>
                                <textarea
                                    className="message-edit-textarea"
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                />
                                <div className="message-edit-buttons">
                                    <button className="action-button" onClick={() => handleSaveEdit(m)}>
                                        Enregistrer
                                    </button>
                                    <button className="action-button" onClick={handleCancelEdit}>
                                        Annuler
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    // Cas 2 : Affichage normal
                    return (
                        <div
                            key={m._id}
                            id={`msg-${m._id}`}
                            className={`message-container ${isMe ? 'message-bg-me' : 'message-bg-other'}`}
                        >
                            <div className="message-header">
                                <span className="sender">{senderLabel}</span>
                                <span className="timestamp">{timestamp}</span>
                            </div>

                            {/* Affichage du contenu = GIF si l'URL correspond */}
                            <div className="message-content">
                                {
                                    // Test : si c'est un lien complet .gif / .png / .jpg / .jpeg
                                    /^https?:\/\/.*\.(gif|png|jpe?g)$/i.test(m.content)
                                        ? (
                                            <img
                                                src={m.content}
                                                alt="img"
                                                style={{ maxWidth: '200px', height: 'auto', borderRadius: '4px' }}
                                            />
                                        )
                                        : (
                                            // Sinon on utilise la fonction highlightMentions
                                            highlightMentions(m.content || '', validMentions)
                                        )
                                }
                                {m.edited && <span className="message-edited">(Modifié)</span>}
                            </div>

                            {/* Gestion éventuelle de fileUrl */}
                            {m.fileUrl &&
                                (m.fileUrl.match(/\.(png|jpe?g|gif)$/i) ? (
                                    <div className="message-file">
                                        <img
                                            src={process.env.REACT_APP_API_URL + m.fileUrl}
                                            alt="file"
                                            style={{ maxWidth: '200px', height: 'auto' }}
                                        />
                                    </div>
                                ) : (
                                    <div className="message-file">
                                        <a href={m.fileUrl} target="_blank" rel="noreferrer">
                                            Télécharger le fichier
                                        </a>
                                    </div>
                                ))
                            }

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
                                    <button
                                        className="action-button delete-button"
                                        onClick={() => handleDeleteMsg(m)}
                                    >
                                        X
                                    </button>
                                )}
                            </div>

                            <div className="message-reactions">
                                {m.reactions &&
                                    m.reactions.map((react, i) => {
                                        const who = react.user && react.user.name ? react.user.name : '(Inconnu)';
                                        return (
                                            <span key={i} className="reaction" title={`Réaction de ${who}`}>
                                                {react.emoji}
                                            </span>
                                        );
                                    })}
                            </div>

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
