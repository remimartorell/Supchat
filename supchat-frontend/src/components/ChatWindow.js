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

function formatTimestamp(timestamp) {
    const dateObj = new Date(timestamp);
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    let labelJour = '';
    if (diff < oneDay && dateObj.getDate() === now.getDate()) {
        labelJour = "Aujourd'hui";
    } else if (diff < 2 * oneDay && dateObj.getDate() === now.getDate() - 1) {
        labelJour = 'Hier';
    } else {
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        labelJour = `${day}/${month}`;
    }
    return `${labelJour} à ${hours}:${minutes}`;
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

    const openEmojiPickerForMessage = (m) => {
        setShowEmojiPickerFor(m._id);
    };

    const handleChooseEmoji = (m, chosenEmoji) => {
        if (selectedChannel) {
            axios
                .post(`/api/channels/${m.channel}/messages/${m._id}/reactions`, { emoji: chosenEmoji })
                .then(() => setShowEmojiPickerFor(null))
                .catch((err) => {
                    console.error('Channel reaction error:', err);
                });
        } else if (selectedUser) {
            axios
                .post(`/api/direct-messages/${m._id}/reactions`, { emoji: chosenEmoji })
                .then(() => setShowEmojiPickerFor(null))
                .catch((err) => {
                    console.error('DM reaction error:', err);
                });
        }
    };

    // Auto-scroll sur le dernier message
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (focusMessageId) {
            setTimeout(() => {
                const el = document.getElementById(`msg-${focusMessageId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('highlight-focus');
                    setTimeout(() => {
                        el.classList.remove('highlight-focus');
                    }, 2000);
                }
            }, 100);
        }
    }, [focusMessageId, messages]);

    const handleDeleteMsg = async (m) => {
        if (!window.confirm('Supprimer ce message ?')) return;
        try {
            if (selectedChannel) {
                await axios.delete(`/api/channels/${m.channel}/messages/${m._id}`);
                setMessages((prev) => prev.filter((msg) => msg._id !== m._id));
            } else {
                alert("Suppression d'un DM non implémentée.");
            }
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
                await axios.put(`/api/channels/${m.channel}/messages/${m._id}`, {
                    newContent: editContent.trim(),
                });
            } else if (selectedUser) {
                await axios.put(`/api/direct-messages/${m._id}`, {
                    newContent: editContent.trim(),
                });
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

                    let senderLabel = '';
                    if (m.sender && typeof m.sender === 'object') {
                        senderLabel = m.sender.name || '(Sans nom)';
                    } else {
                        senderLabel = m.sender || '';
                    }

                    const validMentions = m.validMentions || [];

                    if (m._id === editingMessageId) {
                        return (
                            <div key={m._id} id={`msg-${m._id}`} className="chat-message editing">
                                <div className="chat-message-header">
                                    <span className="chat-message-sender">{senderLabel}</span>
                                    <span className="chat-message-timestamp">{formatTimestamp(m.createdAt)}</span>
                                </div>
                                <textarea
                                    className="chat-message-edit-input"
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                />
                                <div className="chat-message-edit-buttons">
                                    <button onClick={() => handleSaveEdit(m)}>Enregistrer</button>
                                    <button onClick={handleCancelEdit}>Annuler</button>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={m._id} id={`msg-${m._id}`} className="chat-message" style={{ backgroundColor: isMe ? '#23243a' : '#1e1f2f' }}>
                            <div className="chat-message-header">
                                <span className="chat-message-sender">{senderLabel}</span>
                                <span className="chat-message-timestamp">{formatTimestamp(m.createdAt)}</span>
                            </div>
                            <div className="chat-message-content">
                                {highlightMentions(m.content || '', validMentions)}
                                {m.edited && <span className="chat-message-edited">(Modifié)</span>}
                            </div>
                            {m.fileUrl && (
                                <div className="chat-message-file">
                                    {/\.(png|jpe?g|gif)$/i.test(m.fileUrl) ? (
                                        <img src={m.fileUrl} alt="file" />
                                    ) : (
                                        <a href={m.fileUrl} target="_blank" rel="noreferrer">
                                            Télécharger le fichier
                                        </a>
                                    )}
                                </div>
                            )}
                            {m.reactions && m.reactions.length > 0 && (
                                <div className="chat-message-reactions">
                                    {m.reactions.map((react, i) => {
                                        const who = react.user?.name || '(Inconnu)';
                                        return (
                                            <span key={i} className="chat-reaction" title={`Réaction de ${who}`}>
                        {react.emoji}
                      </span>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="chat-message-buttons">
                                <button onClick={() => openEmojiPickerForMessage(m)}>Réagir</button>
                                {isMe && <button onClick={() => startEditingMessage(m)}>Modifier</button>}
                                {canDelete && selectedChannel && <button onClick={() => handleDeleteMsg(m)} style={{ backgroundColor: '#f88' }}>X</button>}
                            </div>
                            {showEmojiPickerFor === m._id && (
                                <div className="chat-emoji-picker">
                                    {['😃', '👍', '❤️', '🔥', '🎉'].map((emoji) => (
                                        <span key={emoji} className="chat-emoji" onClick={() => handleChooseEmoji(m, emoji)}>
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
